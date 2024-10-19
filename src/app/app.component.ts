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
  confidences: { [key: string]: string } = {}; // Objekt zur Speicherung der Confidence-Werte
  lastTimestamps: { [key: string]: string } = {}; // Objekt zur Speicherung der letzten Zeitstempel
  isDarkMode: boolean = false;
  isSidebarVisible: boolean = true; // Sidebar-Sichtbarkeitsstatus
  dataLoaded: boolean = false; // Flag zum Überprüfen, ob Daten geladen sind
  selectedPairs: string[] = []; // Mehrere ausgewählte Paare
  charts: { [key: string]: LightweightCharts.IChartApi } = {}; // Mehrere Charts
  candleSeriesMap: { [key: string]: LightweightCharts.ISeriesApi<'Candlestick'> } = {};
  lineSeriesMap: { [key: string]: LightweightCharts.ISeriesApi<'Line'> } = {};
  dataLoading: boolean = false; // Flag zum Überprüfen, ob Daten geladen werden
  private resizeSubject: Subject<void> = new Subject();

  constructor(
    private chartDataService: ChartDataService,
    private renderer: Renderer2 // Renderer2 für DOM-Manipulation
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
    // Theme aus localStorage abrufen
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      this.isDarkMode = true;
      this.renderer.addClass(document.body, 'dark-mode');
    }

    // Ausgewählte Paare aus localStorage abrufen
    const savedPairs = localStorage.getItem('selectedPairs');
    if (savedPairs) {
      this.selectedPairs = JSON.parse(savedPairs);
    }

    this.chartDataService.getChartDumps().subscribe(
      (dumps: any) => {
        this.pairs = dumps.map((dump: string) => this.cleanPair(dump));
        this.dataLoaded = true; // Flag setzen, nachdem Daten geladen sind

        // Wähle gespeicherte Paare aus, die noch vorhanden sind
        this.selectedPairs = this.selectedPairs.filter(pair => this.pairs.includes(pair));

        // Lade die Charts für die ausgewählten Paare in der Reihenfolge der Sidebar
        this.pairs.forEach(pair => {
          if (this.selectedPairs.includes(pair)) {
            this.loadChart(pair);
          }
        });

        // Confidence für jedes Paar abrufen
        this.pairs.forEach((pair) => {
          this.chartDataService.getConfidence(pair).subscribe(
            (confidence: any) => {
              console.log(`Confidence for ${pair}:`, confidence);
              this.confidences[pair] = confidence ?? 'N/A'; // Fallback-Wert
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
    // Bereits ausgewählte Charts werden in ngOnInit geladen
  }

  // Neue Daten abrufen
  fetchNewData(): void {
    this.chartDataService.getChartDumps().subscribe(
      (dumps: any) => {
        this.pairs = dumps.map((dump: string) => this.cleanPair(dump));
        // Bestehende Daten zurücksetzen
        this.confidences = {};
        this.lastTimestamps = {};

        // Sicherstellen, dass ausgewählte Paare noch vorhanden sind
        this.selectedPairs = this.selectedPairs.filter(pair => this.pairs.includes(pair));

        // Laden der Charts für die ausgewählten Paare in der Reihenfolge der Sidebar
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

  // Ein Paar aus der Sidebar auswählen oder abwählen
  togglePairSelection(pair: string): void {
    const index = this.selectedPairs.indexOf(pair);
    if (index > -1) {
      // Paar ist bereits ausgewählt, entferne es
      this.selectedPairs.splice(index, 1);
      this.removeChart(pair);
    } else {
      // Paar ist nicht ausgewählt, füge es hinzu
      this.selectedPairs.push(pair);
      this.loadChart(pair);
    }

    // Speichere die ausgewählten Paare in localStorage
    localStorage.setItem('selectedPairs', JSON.stringify(this.selectedPairs));
  }

  // Charts basierend auf den ausgewählten Paaren laden
  loadChart(pair: string): void {
    if (!this.selectedPairs.includes(pair)) return;

    // Erstelle einen eindeutigen Wrapper für jedes Paar
    const mainContent = document.querySelector('.main-content') as HTMLElement;
    if (!mainContent) return;

    const existingChart = document.getElementById(`chartContainer-${pair}`);
    if (existingChart) return; // Chart bereits vorhanden

    // Erstelle ein übergeordnetes Div für Pair Name und Chart
    const chartWrapper = this.renderer.createElement('div');
    this.renderer.addClass(chartWrapper, 'chart-wrapper');
    this.renderer.setStyle(chartWrapper, 'position', 'relative');
    this.renderer.setStyle(chartWrapper, 'width', '100%');
    this.renderer.setStyle(chartWrapper, 'height', '300px'); // Feste Höhe anpassen
    this.renderer.setStyle(chartWrapper, 'margin-top', '20px'); // Konsistenter oberer Abstand
    this.renderer.setStyle(chartWrapper, 'margin-bottom', '20px'); // Abstand zwischen Charts

    // Erstelle ein Element für den Pair Name
    const pairNameElement = this.renderer.createElement('div');
    this.renderer.addClass(pairNameElement, 'chart-pair-name');
    this.renderer.setStyle(pairNameElement, 'position', 'absolute');
    this.renderer.setStyle(pairNameElement, 'top', '10px');
    this.renderer.setStyle(pairNameElement, 'left', '10px');
    this.renderer.setStyle(pairNameElement, 'background-color', 'rgba(0, 0, 0, 0.5)');
    this.renderer.setStyle(pairNameElement, 'color', '#fff');
    this.renderer.setStyle(pairNameElement, 'padding', '5px 10px');
    this.renderer.setStyle(pairNameElement, 'border-radius', '4px');
    this.renderer.setStyle(pairNameElement, 'z-index', '10');

    const pairNameText = this.renderer.createText(pair);
    this.renderer.appendChild(pairNameElement, pairNameText);

    // Erstelle ein Div für den Chart
    const chartContainer = this.renderer.createElement('div');
    this.renderer.setAttribute(chartContainer, 'id', `chartContainer-${pair}`);
    this.renderer.addClass(chartContainer, 'individual-chart');
    this.renderer.setStyle(chartContainer, 'width', '100%');
    this.renderer.setStyle(chartContainer, 'height', '100%'); // Inner container fills the wrapper

    // Füge die Elemente zum Chart Wrapper hinzu
    this.renderer.appendChild(chartWrapper, pairNameElement);
    this.renderer.appendChild(chartWrapper, chartContainer);

    // Bestimme die Position basierend auf der Reihenfolge der Sidebar
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

    // Erstelle das Chart
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

    // Candlestick-Serie hinzufügen
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#4caf50', // Grün für steigende Kerzen
      downColor: '#f44336', // Rot für fallende Kerzen
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

    // Linien-Serie für Vorhersagen hinzufügen
    const lineSeries = chart.addLineSeries({
      color: '#2196f3', // Blau für Vorhersagen
      lineWidth: 2,
    });

    this.lineSeriesMap[pair] = lineSeries;

    // Vorhersagedaten abrufen und setzen
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

    // Confidence-Marker abrufen und setzen
    this.chartDataService.getConfidences(pair).subscribe(confidenceData => {
      if (Array.isArray(confidenceData) && confidenceData.length > 0) {
        const markers: SeriesMarker<Time>[] = confidenceData.map((confidence: any) => ({
          // Zeitstempel anpassen und als Time typisieren
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

  // Chart entfernen, wenn ein Paar abgewählt wird
  removeChart(pair: string): void {
    const chartContainer = document.getElementById(`chartContainer-${pair}`);
    if (chartContainer && this.charts[pair]) {
      this.charts[pair].remove();
      delete this.charts[pair];
      delete this.candleSeriesMap[pair];
      delete this.lineSeriesMap[pair];
      
      // Entferne den gesamten Chart Wrapper (Pair Name + Chart)
      const chartWrapper = chartContainer.parentElement;
      if (chartWrapper) {
        this.renderer.removeChild(document.querySelector('.main-content'), chartWrapper);
      }
    }
  }

  // Paar-String bereinigen
  cleanPair(pair: string): string {
    if (!pair) {
      return ''; // Leeren String zurückgeben oder entsprechend behandeln
    }
    return pair.replace(/[^a-zA-Z0-9]/g, '');
  }

  // Datum im Format "dd-mm-yyyy hh:mm" formatieren
  formatDateToDDMMYYYYHHMM(date: any): string {
    const day = ('0' + date.getDate()).slice(-2);
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const year = date.getFullYear();
    const hours = ('0' + date.getHours()).slice(-2);
    const minutes = ('0' + date.getMinutes()).slice(-2);
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  }

  // Funktion zur Anpassung des Zeitstempels basierend auf der lokalen Zeitzone
  adjustTimestamp(timestamp: number): Time {
    // Berechne den aktuellen Zeitzonenoffset in Sekunden
    const timezoneOffsetInSeconds = new Date().getTimezoneOffset() * 60; // getTimezoneOffset gibt Minuten zurück

    // Passe den Zeitstempel an die lokale Zeit an
    const adjustedTimestamp = timestamp - timezoneOffsetInSeconds;

    console.log(`Original Timestamp: ${timestamp}, Adjusted Timestamp: ${adjustedTimestamp}`);
    return adjustedTimestamp as Time;
  }

  // Dark Mode umschalten
  toggleDarkMode(isDark: boolean): void {
    this.isDarkMode = isDark;
    if (this.isDarkMode) {
      this.renderer.addClass(document.body, 'dark-mode');
      localStorage.setItem('theme', 'dark'); // Präferenz speichern
    } else {
      this.renderer.removeClass(document.body, 'dark-mode');
      localStorage.setItem('theme', 'light'); // Präferenz speichern
    }

    // Aktualisiere alle vorhandenen Charts, um den Dark Mode widerzuspiegeln
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

  // Sidebar-Sichtbarkeit umschalten
  toggleSidebar(): void {
    this.isSidebarVisible = !this.isSidebarVisible;
    // Chart-Größe nach Umschalten der Sidebar anpassen
    setTimeout(() => {
      this.adjustChartSizes();
    }, 300); // Entspricht der CSS-Transition-Dauer
  }
}
