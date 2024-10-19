// src/app/app.component.ts

import { AfterViewInit, Component, OnInit, Renderer2 } from '@angular/core';
import { ChartDataService } from './chart-data.service';
import * as LightweightCharts from 'lightweight-charts';
import { SeriesMarker, Time } from 'lightweight-charts'; // Korrekte Importe
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
  selectedPair: string = "";
  chart: LightweightCharts.IChartApi | null = null;
  dataLoading: boolean = false; // Flag zum Überprüfen, ob Daten geladen werden
  private resizeSubject: Subject<void> = new Subject();
  private candleSeries: LightweightCharts.ISeriesApi<'Candlestick'> | null = null;
  private lineSeries: LightweightCharts.ISeriesApi<'Line'> | null = null;

  constructor(
    private chartDataService: ChartDataService,
    private renderer: Renderer2 // Renderer2 für DOM-Manipulation
  ) {
    this.resizeSubject.pipe(debounceTime(100)).subscribe(() => {
      this.adjustChartSize();
    });
  }

  @HostListener('window:resize')
  onResize() {
    this.resizeSubject.next();
  }

  adjustChartSize(): void {
    const chartContainer = document.getElementById('chartContainer');
    if (chartContainer && this.chart) {
      // Passe die Chart-Größe basierend auf der Containergröße an
      this.chart.resize(chartContainer.clientWidth, chartContainer.clientHeight);
    }
  }

  ngOnInit(): void {
    // Theme aus localStorage abrufen
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      this.isDarkMode = true;
      this.renderer.addClass(document.body, 'dark-mode');
    }

    // Ausgewähltes Paar aus localStorage abrufen
    const savedPair = localStorage.getItem('selectedPair');
    if (savedPair) {
      this.selectedPair = savedPair;
    }

    this.chartDataService.getChartDumps().subscribe(
      (dumps: any) => {
        this.pairs = dumps.map((dump: string) => this.cleanPair(dump));
        this.dataLoaded = true; // Flag setzen, nachdem Daten geladen sind

        if (this.selectedPair && this.pairs.includes(this.selectedPair)) {
          // Wenn das gespeicherte Paar in den abgerufenen Paaren existiert, wähle es aus
          this.selectPair(this.selectedPair);
        } else if (this.pairs.length > 0) {
          // Andernfalls das erste Paar standardmäßig auswählen
          this.selectPair(this.pairs[0]);
        }

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
    if (this.dataLoaded && this.selectedPair) {
      this.loadCharts(); // Charts nach der View-Initialisierung laden
    }
  }

  // Neue Daten abrufen
  fetchNewData(): void {
    this.chartDataService.getChartDumps().subscribe(
      (dumps: any) => {
        this.pairs = dumps.map((dump: string) => this.cleanPair(dump));
        // Bestehende Daten zurücksetzen
        this.confidences = {};
        this.lastTimestamps = {};

        // Erstes Paar auswählen, wenn vorhanden
        if (this.pairs.length > 0) {
          this.selectPair(this.pairs[0]); // Optional: Erstes Paar standardmäßig auswählen
        }
      },
      (error) => {
        console.error('Error fetching new chart dumps:', error);
      }
    );
  }

  // Ein Paar aus der Sidebar auswählen
  selectPair(pair: string): void {
    this.dataLoading = true; // Ladezustand aktivieren
    this.selectedPair = pair;

    // Ausgewähltes Paar in localStorage speichern
    localStorage.setItem('selectedPair', pair);

    this.loadCharts();
  }

  // Charts basierend auf dem ausgewählten Paar laden
  loadCharts(): void {
    if (!this.selectedPair) return;

    this.chartDataService.getModelBars(this.selectedPair, 2000).subscribe(
      (data: any) => {
        this.dataLoading = false; // Ladezustand zurücksetzen, nachdem Daten abgerufen wurden
        if (Array.isArray(data)) {
          this.createChart(this.selectedPair, data);
        }
      },
      (error) => {
        this.dataLoading = false; // Ladezustand bei Fehler zurücksetzen
        console.error('Error loading chart data:', error);
      }
    );
  }

  // Paar-String bereinigen
  cleanPair(pair: string): string {
    if (!pair) {
      return ''; // Leeren String zurückgeben oder entsprechend behandeln
    }
    return pair.replace(/[^a-zA-Z0-9]/g, '');
  }

  // Datum im Format "dd-mm-yyyy hh:mm" formatieren
  formatDateToDDMMYYYYHHMM(date: any) {
    const day = ('0' + date.getDate()).slice(-2);
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const year = date.getFullYear();
    const hours = ('0' + date.getHours()).slice(-2);
    const minutes = ('0' + date.getMinutes()).slice(-2);
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  }

  // Funktion zur Anpassung des Zeitstempels
  adjustTimestamp(timestamp: number): Time {
      // Angenommen, der Server liefert UTC-Zeitstempel in Sekunden
      // Berechne den aktuellen Zeitzonenoffset in Sekunden
      const timezoneOffsetInSeconds = new Date().getTimezoneOffset() * 60; // getTimezoneOffset gibt Minuten zurück

      // Passe den Zeitstempel an die lokale Zeit an
      const adjustedTimestamp = timestamp - timezoneOffsetInSeconds;

      console.log(`Original Timestamp: ${timestamp}, Adjusted Timestamp: ${adjustedTimestamp}`);
      return adjustedTimestamp as Time;
  }


  // Chart mit LightweightCharts erstellen
  createChart(pair: string, data: any[]): void {
    const chartContainer = document.getElementById('chartContainer');
    if (this.chart) {
      this.chart.remove();
      this.chart = null;
    }
    if (!chartContainer) return;

    // Berechne Chart-Abmessungen basierend auf der Containergröße
    const chartWidth = chartContainer.clientWidth;
    const chartHeight = chartContainer.clientHeight; // Feste Höhe aus CSS

    this.chart = LightweightCharts.createChart(chartContainer, {
      width: chartWidth,
      height: chartHeight,
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

    // Chart-Größe bei Fenstergrößenänderung anpassen
    window.addEventListener('resize', () => {
      this.adjustChartSize();
    });

    // Letzten Zeitstempel extrahieren
    if (data && data.length > 0) {
      const lastData = data[data.length - 1];
      const lastTimestamp = this.formatDateToDDMMYYYYHHMM(new Date(lastData.time * 1000));
      this.lastTimestamps[pair] = lastTimestamp;
    }

    // Candlestick-Serie hinzufügen
    this.candleSeries = this.chart.addCandlestickSeries({
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

    this.candleSeries.setData(
      data.map(d => ({
        time: d.time,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }))
    );

    // Linien-Serie für Vorhersagen hinzufügen
    this.lineSeries = this.chart.addLineSeries({
      color: '#2196f3', // Blau für Vorhersagen
      lineWidth: 2,
    });

    // Vorhersagedaten abrufen und setzen
    this.chartDataService.getPrediction(pair).subscribe(predictionData => {
      if (Array.isArray(predictionData)) {
        if (this.lineSeries) {
          this.lineSeries.setData(
            predictionData.map(d => ({
              time: d.time,
              value: d.close,
            }))
          );
        }
      }
    });

    // Confidence-Marker abrufen und setzen
    this.chartDataService.getConfidences(pair).subscribe(confidenceData => {
      if (Array.isArray(confidenceData) && confidenceData.length > 0) {
        const markers: SeriesMarker<Time>[] = confidenceData.map(confidence => ({
          // Zeitstempel anpassen und als Time typisieren
          time: this.adjustTimestamp(confidence.t),
          position: 'aboveBar',
          color: 'white',
          shape: 'arrowDown',
          text: confidence.value,
        }));

        if (this.candleSeries) {
          this.candleSeries.setMarkers(markers);
        }
      }
    });
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
    // Chart aktualisieren, um den Dark Mode widerzuspiegeln
    if (this.selectedPair) {
      this.loadCharts();
    }
  }

  // Sidebar-Sichtbarkeit umschalten
  toggleSidebar(): void {
    this.isSidebarVisible = !this.isSidebarVisible;
    // Chart-Größe nach Umschalten der Sidebar anpassen
    setTimeout(() => {
      this.adjustChartSize();
    }, 300); // Entspricht der CSS-Transition-Dauer
  }
}
