import { AfterViewInit, Component, OnInit } from '@angular/core';
import { ChartDataService } from './chart-data.service';
import * as LightweightCharts from 'lightweight-charts';
import { SeriesMarker, SeriesMarkerShape, SeriesMarkerPosition } from 'lightweight-charts';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})

export class AppComponent implements OnInit, AfterViewInit {
  pairs: string[] = [];
  confidences: { [key: string]: string } = {}; // Object to hold confidence values
  lastTimestamps: { [key: string]: string } = {}; // Object to hold the last timestamp for each pair
  dataLoaded = false; // Flag to check if data is loaded
  isDarkModeEnabled = true;

  constructor(private chartDataService: ChartDataService) {}

  ngOnInit(): void {
    this.chartDataService.getChartDumps().subscribe(
      (dumps: any) => {
        this.pairs = dumps.map((dump: string) => this.cleanPair(dump));
        this.dataLoaded = true; // Set flag to true after data is loaded
        this.loadCharts(); // Call loadCharts here after data is loaded

        // Get confidence for every pair
        this.pairs.forEach((pair) => {
          this.chartDataService.getConfidence(pair).subscribe(
            (confidence: any) => {
              console.log(`Confidence for ${pair}:`, confidence);
              this.confidences[pair] = confidence ?? 'default_value'; // Replace 'default_value' with a suitable fallback
            },
            (error) => {
              console.error(`Error fetching confidence for ${pair}:`, error);
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
    console.log(this.dataLoaded);
    if (this.dataLoaded) {
      this.loadCharts(); // Call loadCharts after view initialization
    }
  }

  // Add this method in the AppComponent class
  fetchNewData(): void {
    this.chartDataService.getChartDumps().subscribe(
      (dumps: any) => {
        this.pairs = dumps.map((dump: string) => this.cleanPair(dump));
        // Reset existing data
        this.confidences = {};
        this.lastTimestamps = {};
        this.loadCharts(); // Load charts with new data
      },
      (error) => {
        console.error('Error fetching new chart dumps:', error);
      }
    );
  }

  loadCharts(): void {
    console.log(this.pairs);
    this.pairs.forEach((pair) => {
      console.log(pair);
      this.chartDataService.getModelBars(pair, 2000).subscribe((data: any) => {
        if (Array.isArray(data)) {
          this.createChart(pair, data);
        }
      });
    });
  }

  cleanPair(pair: string): string {
    // Check if pair is undefined or null
    if (!pair) {
      return ''; // Return an empty string or handle it as you see fit
    }
    return pair.replace(/[^a-zA-Z0-9]/g, '');
  }

  formatDateToDDMMYYYYHHMM(date: any) {
    const day = ('0' + date.getDate()).slice(-2); // Add leading zero if needed
    const month = ('0' + (date.getMonth() + 1)).slice(-2); // Months are 0-indexed
    const year = date.getFullYear();
    const hours = ('0' + date.getHours()).slice(-2);
    const minutes = ('0' + date.getMinutes()).slice(-2);

    // Formatting the date string as "dd-mm-yyyy hh:mm"
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  }

  createChart(pair: string, data: any[]): void {
    const chartContainer = document.getElementById(pair);
    if (!chartContainer) return;

    if (data && data.length > 0) {
      const lastDataPoint = data[data.length - 1];
      // Create a Date object from the timestamp
      const utcDate = new Date(lastDataPoint.time * 1000);

      // Calculate the local time zone offset and adjust the date
      const localDate = new Date(
        utcDate.getTime() + utcDate.getTimezoneOffset() * 60000
      ); // UTC+1

      // Format the date to dd-mm-yyyy hh:mm
      const formattedDate =
        [
          ('0' + localDate.getDate()).slice(-2),
          ('0' + (localDate.getMonth() + 1)).slice(-2),
          localDate.getFullYear(),
        ].join('-') +
        ' ' +
        [
          ('0' + localDate.getHours()).slice(-2),
          ('0' + localDate.getMinutes()).slice(-2),
        ].join(':');

      this.lastTimestamps[pair] = formattedDate;
    }

    const chart = LightweightCharts.createChart(chartContainer, {
      width: chartContainer.clientWidth,
      height: 400,
      layout: {
        background: {
          type: LightweightCharts.ColorType.Solid,
          color: this.isDarkModeEnabled ? '#131722' : '#ffffff',
        },
        textColor: this.isDarkModeEnabled ? '#D9D9D9' : '#191919',
      },
      grid: {
        vertLines: { color: 'rgba(197, 203, 206, 0.5)' },
        horzLines: { color: 'rgba(197, 203, 206, 0.5)' },
      },
      crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: 'rgba(197, 203, 206, 0.8)',
      },
      timeScale: {
        borderColor: 'rgba(197, 203, 206, 0.8)',
        timeVisible: true,
      },
    });

    var candleSeries = chart.addCandlestickSeries({
      upColor: 'rgba(0, 255, 255, 1)',
      downColor: 'rgba(255, 0, 0, 1)',
      borderDownColor: 'rgba(255, 0, 0, 1)',
      borderUpColor: 'rgba(0, 255, 255, 1)',
      wickDownColor: 'rgba(255, 0, 0, 1)',
      wickUpColor: 'rgba(0, 255, 255, 1)',
      priceFormat: {
        type: 'custom',
        formatter: (price: any) => price.toFixed(4),
      },
    });

    candleSeries.setData(
      data.map((d) => {
        return {
          time: d.time,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
        };
      })
    );

    // Create a line series for the prediction data
    var lineSeries = chart.addLineSeries({
      color: 'rgba(0, 150, 136, 1)',
      lineWidth: 2,
    });
    // Fetch and set data for the line series
    this.chartDataService.getPrediction(pair).subscribe((predictionData) => {
      if (Array.isArray(predictionData)) {
        lineSeries.setData(
          predictionData.map((d) => {
            return {
              time: d.time,
              value: d.close, // or the appropriate property
              lineType: LightweightCharts.LineType.WithSteps,
            };
          })
        );
      }
    });
    this.chartDataService.getConfidences(pair).subscribe((confidenceData) => {
      if (Array.isArray(confidenceData) && confidenceData.length > 0) {
        // Just declare markers without specifying <Time>
        const markers: SeriesMarker<number>[] = confidenceData.map(confidence => {
          // Assuming confidence.t is a Unix timestamp in seconds
          const unixTimestamp = Math.floor(new Date(confidence.t).getTime() / 1000);
          return {
            time: unixTimestamp,
            position: 'aboveBar',
            color: 'orange',
            shape: 'circle',
            text: 'Your label here', // Customize as needed
          };
        });
      // Directly set markers without casting
      candleSeries.setMarkers(markers);
      }
    });
  }

  toggleDarkMode(): void {
    this.isDarkModeEnabled = !this.isDarkModeEnabled;
    this.loadCharts();
  }
}
