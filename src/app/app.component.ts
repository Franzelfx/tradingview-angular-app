// src/app/app.component.ts

import { AfterViewInit, Component, OnInit, Renderer2 } from '@angular/core';
import { ChartDataService } from './chart-data.service';
import * as LightweightCharts from 'lightweight-charts';
import { SeriesMarker, Time } from 'lightweight-charts';
import { HostListener } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})

export class AppComponent implements OnInit, AfterViewInit {
  pairs: string[] = [];
  confidences: { [key: string]: string } = {}; // Object to store confidence values
  lastTimestamps: { [key: string]: string } = {}; // Object to store last timestamps
  isDarkMode: boolean = false;
  isSidebarVisible: boolean = true; // Sidebar visibility status
  dataLoaded: boolean = false; // Flag to check if data is loaded
  selectedPairs: string[] = []; // Multiple selected pairs
  charts: { [key: string]: LightweightCharts.IChartApi } = {}; // Multiple charts
  candleSeriesMap: { [key: string]: LightweightCharts.ISeriesApi<'Candlestick'> } = {};
  lineSeriesMap: { [key: string]: LightweightCharts.ISeriesApi<'Line'> } = {};
  dataLoading: boolean = false; // Flag to check if data is loading
  private resizeSubject: Subject<void> = new Subject();

  constructor(
    private chartDataService: ChartDataService,
    private renderer: Renderer2 // Renderer2 for DOM manipulation
  ) {
    this.resizeSubject.pipe(debounceTime(100)).subscribe(() => {
      this.adjustChartSizes();
    });
  }

  @HostListener('window:resize')
  onResize() {
    this.resizeSubject.next();
  }

  adjustChartSizes(): void {
    for (const pair of this.selectedPairs) {
      const chartContainer = document.getElementById(`chartContainer-${pair}`);
      if (chartContainer && this.charts[pair]) {
        this.charts[pair].resize(chartContainer.clientWidth, chartContainer.clientHeight);
      }
    }
  }

  ngOnInit(): void {
    // Retrieve theme from localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      this.isDarkMode = true;
      this.renderer.addClass(document.body, 'dark-mode');
    }

    // Retrieve selected pairs from localStorage
    const savedPairs = localStorage.getItem('selectedPairs');
    if (savedPairs) {
      this.selectedPairs = JSON.parse(savedPairs);
    }

    this.chartDataService.getChartDumps().subscribe(
      (dumps: any) => {
        this.pairs = dumps.map((dump: string) => this.cleanPair(dump));
        this.dataLoaded = true; // Set flag after data is loaded

        // Select stored pairs that are still available
        this.selectedPairs = this.selectedPairs.filter(pair => this.pairs.includes(pair));

        // Load charts for selected pairs in the order of the sidebar
        this.pairs.forEach(pair => {
          if (this.selectedPairs.includes(pair)) {
            this.loadChart(pair);
          }
        });

        // Retrieve confidence for each pair
        this.pairs.forEach((pair) => {
          this.chartDataService.getConfidence(pair).subscribe(
            (confidence: any) => {
              console.log(`Confidence for ${pair}:`, confidence);
              this.confidences[pair] = confidence ?? 'N/A'; // Fallback value
            },
            (error) => {
              console.error(`Error fetching confidence for ${pair}:`, error);
              this.confidences[pair] = 'Error';
            }
          );
        });
      },
      (error) => {
        console.error('Error fetching chart dumps:', error);
        this.dataLoaded = false;
      }
    );
  }

  ngAfterViewInit(): void {
    // Already selected charts are loaded in ngOnInit
  }

  // Fetch new data
  fetchNewData(): void {
    this.chartDataService.getChartDumps().subscribe(
      (dumps: any) => {
        this.pairs = dumps.map((dump: string) => this.cleanPair(dump));
        // Reset existing data
        this.confidences = {};
        this.lastTimestamps = {};

        // Ensure selected pairs are still available
        this.selectedPairs = this.selectedPairs.filter(pair => this.pairs.includes(pair));

        // Load charts for selected pairs in the order of the sidebar
        this.pairs.forEach(pair => {
          if (this.selectedPairs.includes(pair)) {
            this.loadChart(pair);
          }
        });
      },
      (error) => {
        console.error('Error fetching new chart dumps:', error);
      }
    );
  }

  // Select or deselect a pair from the sidebar
  togglePairSelection(pair: string): void {
    const index = this.selectedPairs.indexOf(pair);
    if (index > -1) {
      // Pair is already selected, remove it
      this.selectedPairs.splice(index, 1);
      this.removeChart(pair);
    } else {
      // Pair is not selected, add it
      this.selectedPairs.push(pair);
      this.loadChart(pair);
    }

    // Save selected pairs to localStorage
    localStorage.setItem('selectedPairs', JSON.stringify(this.selectedPairs));
  }

  // Load charts based on selected pairs
  loadChart(pair: string): void {
    if (!this.selectedPairs.includes(pair)) return;

    // Create a unique wrapper for each pair
    const mainContent = document.querySelector('.main-content') as HTMLElement;
    if (!mainContent) return;

    const existingChart = document.getElementById(`chartContainer-${pair}`);
    if (existingChart) return; // Chart already exists

    // Create a parent div for Pair Name and Chart
    const chartWrapper = this.renderer.createElement('div');
    this.renderer.addClass(chartWrapper, 'chart-wrapper');

    // Create an element for the Pair Name
    const pairNameElement = this.renderer.createElement('div');
    this.renderer.addClass(pairNameElement, 'chart-pair-name');
    const pairNameText = this.renderer.createText(pair);
    this.renderer.appendChild(pairNameElement, pairNameText);

    // Create a div for the Chart
    const chartContainer = this.renderer.createElement('div');
    this.renderer.setAttribute(chartContainer, 'id', `chartContainer-${pair}`);
    this.renderer.addClass(chartContainer, 'individual-chart');

    // Append elements to the Chart Wrapper
    this.renderer.appendChild(chartWrapper, pairNameElement);
    this.renderer.appendChild(chartWrapper, chartContainer);

    // Determine position based on the order of the sidebar
    const pairIndex = this.pairs.indexOf(pair);
    let insertBeforeElement: HTMLElement | null = null;

    for (let i = pairIndex + 1; i < this.pairs.length; i++) {
      const nextPair = this.pairs[i];
      if (this.selectedPairs.includes(nextPair)) {
        const nextChart = document.getElementById(`chartContainer-${nextPair}`);
        if (nextChart && nextChart.parentElement) {
          insertBeforeElement = nextChart.parentElement;
          break;
        }
      }
    }

    if (insertBeforeElement) {
      this.renderer.insertBefore(mainContent, chartWrapper, insertBeforeElement);
    } else {
      this.renderer.appendChild(mainContent, chartWrapper);
    }

    // Create the Chart
    const chart = LightweightCharts.createChart(chartContainer, {
      width: chartContainer.clientWidth,
      height: chartContainer.clientHeight,
      layout: {
        background: {
          type: LightweightCharts.ColorType.Solid,
          color: this.isDarkMode ? '#2c2c2c' : '#fafafa',
        },
        textColor: this.isDarkMode ? '#e0e0e0' : '#333333',
      },
      grid: {
        vertLines: { color: this.isDarkMode ? '#555' : 'rgba(197, 203, 206, 0.5)' },
        horzLines: { color: this.isDarkMode ? '#555' : 'rgba(197, 203, 206, 0.5)' },
      },
      crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: this.isDarkMode ? '#555' : 'rgba(197, 203, 206, 0.8)',
      },
      timeScale: {
        borderColor: this.isDarkMode ? '#555' : 'rgba(197, 203, 206, 0.8)',
        timeVisible: true,
      },
    });

    this.charts[pair] = chart;

    // Add Candlestick Series
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#4caf50', // Green for rising candles
      downColor: '#f44336', // Red for falling candles
      borderDownColor: '#f44336',
      borderUpColor: '#4caf50',
      wickDownColor: '#f44336',
      wickUpColor: '#4caf50',
      priceFormat: {
        type: 'custom',
        formatter: (price: any) => price.toFixed(4),
      },
    });

    this.candleSeriesMap[pair] = candleSeries;

    this.chartDataService.getModelBars(pair, 2000).subscribe(
      (data: any) => {
        if (Array.isArray(data)) {
          candleSeries.setData(
            data.map((d: any) => ({
              time: d.time,
              open: d.open,
              high: d.high,
              low: d.low,
              close: d.close,
            }))
          );
        }
      },
      (error: any) => {
        console.error(`Error loading model bars for ${pair}:`, error);
      }
    );

    // Add Line Series for Predictions
    const lineSeries = chart.addLineSeries({
      color: '#2196f3', // Blue for predictions
      lineWidth: 2,
    });

    this.lineSeriesMap[pair] = lineSeries;

    // Fetch and set prediction data
    this.chartDataService.getPrediction(pair).subscribe(predictionData => {
      if (Array.isArray(predictionData)) {
        lineSeries.setData(
          predictionData.map((d: any) => ({
            time: d.time,
            value: d.close,
          }))
        );
      }
    });

    // Fetch and set confidence markers
    this.chartDataService.getConfidences(pair).subscribe(confidenceData => {
      if (Array.isArray(confidenceData) && confidenceData.length > 0) {
        const markers: SeriesMarker<Time>[] = confidenceData.map((confidence: any) => ({
          // Adjust timestamp and typecast as Time
          time: this.adjustTimestamp(confidence.t),
          position: 'aboveBar',
          color: 'white',
          shape: 'arrowDown',
          text: confidence.value,
        }));

        candleSeries.setMarkers(markers);
      }
    });
  }

  // Remove chart when a pair is deselected
  removeChart(pair: string): void {
    const chartContainer = document.getElementById(`chartContainer-${pair}`);
    if (chartContainer && this.charts[pair]) {
      this.charts[pair].remove();
      delete this.charts[pair];
      delete this.candleSeriesMap[pair];
      delete this.lineSeriesMap[pair];
      
      // Remove the entire Chart Wrapper (Pair Name + Chart)
      const chartWrapper = chartContainer.parentElement;
      if (chartWrapper) {
        this.renderer.removeChild(document.querySelector('.main-content'), chartWrapper);
      }
    }
  }

  // Clean pair string
  cleanPair(pair: string): string {
    if (!pair) {
      return ''; // Return empty string or handle accordingly
    }
    return pair.replace(/[^a-zA-Z0-9]/g, '');
  }

  // Format date to "dd-mm-yyyy hh:mm"
  formatDateToDDMMYYYYHHMM(date: any): string {
    const day = ('0' + date.getDate()).slice(-2);
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const year = date.getFullYear();
    const hours = ('0' + date.getHours()).slice(-2);
    const minutes = ('0' + date.getMinutes()).slice(-2);
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  }

  // Function to adjust timestamp based on local timezone
  adjustTimestamp(timestamp: number): Time {
    // Calculate current timezone offset in seconds
    const timezoneOffsetInSeconds = new Date().getTimezoneOffset() * 60; // getTimezoneOffset returns minutes

    // Adjust the timestamp to local time
    const adjustedTimestamp = timestamp - timezoneOffsetInSeconds;

    console.log(`Original Timestamp: ${timestamp}, Adjusted Timestamp: ${adjustedTimestamp}`);
    return adjustedTimestamp as Time;
  }

  // Toggle Dark Mode
  toggleDarkMode(isDark: boolean): void {
    this.isDarkMode = isDark;
    if (this.isDarkMode) {
      this.renderer.addClass(document.body, 'dark-mode');
      localStorage.setItem('theme', 'dark'); // Save preference
    } else {
      this.renderer.removeClass(document.body, 'dark-mode');
      localStorage.setItem('theme', 'light'); // Save preference
    }

    // Update all existing charts to reflect Dark Mode
    for (const pair of this.selectedPairs) {
      if (this.charts[pair]) {
        this.charts[pair].applyOptions({
          layout: {
            background: {
              type: LightweightCharts.ColorType.Solid,
              color: this.isDarkMode ? '#2c2c2c' : '#fafafa',
            },
            textColor: this.isDarkMode ? '#e0e0e0' : '#333333',
          },
          grid: {
            vertLines: { color: this.isDarkMode ? '#555' : 'rgba(197, 203, 206, 0.5)' },
            horzLines: { color: this.isDarkMode ? '#555' : 'rgba(197, 203, 206, 0.5)' },
          },
          rightPriceScale: {
            borderColor: this.isDarkMode ? '#555' : 'rgba(197, 203, 206, 0.8)',
          },
          timeScale: {
            borderColor: this.isDarkMode ? '#555' : 'rgba(197, 203, 206, 0.8)',
            timeVisible: true,
          },
        });
      }
    }
  }

  // Toggle Sidebar Visibility
  toggleSidebar(): void {
    this.isSidebarVisible = !this.isSidebarVisible;
    // Adjust chart sizes after toggling the sidebar
    setTimeout(() => {
      this.adjustChartSizes();
    }, 300); // Matches the CSS transition duration
  }
}
