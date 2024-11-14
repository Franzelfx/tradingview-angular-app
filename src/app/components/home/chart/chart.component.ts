import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  AfterViewInit,
  Renderer2,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { ChartDataService } from '../../../services/chart-data.service';
import * as LightweightCharts from 'lightweight-charts';
import { Subscription } from 'rxjs';
import { Inject } from '@angular/core';
import { UTCTimestamp } from 'lightweight-charts'; // Importieren Sie UTCTimestamp

@Component({
  selector: 'app-chart',
  templateUrl: './chart.component.html',
  styleUrls: ['./chart.component.css'],
})
export class ChartComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() pair: string = '';
  @Input() isDarkMode: boolean = false;

  @ViewChild('chart', { static: false }) chartElement!: ElementRef;

  private chart: LightweightCharts.IChartApi | undefined;
  private candleSeries: LightweightCharts.ISeriesApi<'Candlestick'> | undefined;
  private lineSeries: LightweightCharts.ISeriesApi<'Line'> | undefined;
  private subscriptions: Subscription = new Subscription();
  private resizeObserver: ResizeObserver | undefined;

  constructor(
    @Inject(ChartDataService) private chartDataService: ChartDataService,
    private renderer: Renderer2
  ) {}

  ngOnInit(): void {
    console.log('ChartComponent initialized with pair:', this.pair);
  }

  ngAfterViewInit(): void {
    console.log(
      'ChartComponent view initialized, starting chart setup for pair:',
      this.pair
    );
    this.initializeChart();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    if (this.chart) {
      this.chart.remove();
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  initializeChart(): void {
    const chartContainer = this.chartElement.nativeElement as HTMLElement;
    if (!chartContainer) return;

    // Chart initialization logic
    this.chart = LightweightCharts.createChart(chartContainer, {
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
        vertLines: {
          color: this.isDarkMode ? '#555' : 'rgba(197, 203, 206, 0.5)',
        },
        horzLines: {
          color: this.isDarkMode ? '#555' : 'rgba(197, 203, 206, 0.5)',
        },
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

    // Add Candlestick Series
    this.candleSeries = this.chart.addCandlestickSeries({
      upColor: '#4caf50',
      downColor: '#f44336',
      borderDownColor: '#f44336',
      borderUpColor: '#4caf50',
      wickDownColor: '#f44336',
      wickUpColor: '#4caf50',
      priceFormat: {
        type: 'custom',
        formatter: (price: any) => price.toFixed(4),
      },
    });

    // Add Line Series for Predictions
    this.lineSeries = this.chart.addLineSeries({
      color: '#2196f3',
      lineWidth: 2,
    });

    // Fetch and set candlestick data
    const barsSub = this.chartDataService
      .getModelBars(this.pair, 2000)
      .subscribe(
        (data: any) => {
          console.log(`Model bars data for ${this.pair}:`, data);
          if (Array.isArray(data)) {
            this.candleSeries?.setData(
              data.map((d: any) => ({
                time: this.convertTimestamp(d.time), // Konvertierte und typisierte Zeit
                open: d.open,
                high: d.high,
                low: d.low,
                close: d.close,
              }))
            );
          } else {
            console.warn(`Unexpected bars data format for ${this.pair}:`, data);
          }
        },
        (error: any) => {
          console.error(`Error loading model bars for ${this.pair}:`, error);
        }
      );

    // Fetch and set prediction data
    const predictionSub = this.chartDataService
      .getPrediction(this.pair)
      .subscribe(
        (predictionData: any) => {
          console.log(`Prediction data for ${this.pair}:`, predictionData);
          if (Array.isArray(predictionData)) {
            this.lineSeries?.setData(
              predictionData.map((d: any) => ({
                time: this.convertTimestamp(d.time), // Konvertierte und typisierte Zeit
                value: d.close,
              }))
            );
          } else {
            console.warn(
              `Unexpected prediction data format for ${this.pair}:`,
              predictionData
            );
          }
        },
        (error: any) => {
          console.error(
            `Error loading prediction data for ${this.pair}:`,
            error
          );
        }
      );

    // Fetch and set confidence markers
const confidenceSub = this.chartDataService.getConfidences(this.pair).subscribe(
  (confidenceData: any) => {
    console.log(`Confidence data for ${this.pair}:`, confidenceData);
    if (Array.isArray(confidenceData) && confidenceData.length > 0) {
      const markers: LightweightCharts.SeriesMarker<UTCTimestamp>[] =
        confidenceData.map((confidence: any) => ({
          time: this.convertTimestamp(confidence.t),
          position: 'belowBar' as LightweightCharts.SeriesMarkerPosition,
          color: this.isDarkMode ? 'white' : 'black',
          shape: 'circle' as LightweightCharts.SeriesMarkerShape,
          text: confidence.value.toString(),
        }));
      this.candleSeries?.setMarkers(markers);
    } else {
      console.warn(
        `Unexpected confidence data format or empty data for ${this.pair}:`,
        confidenceData
      );
    }
  },
  (error: any) => {
    console.error(`Error loading confidence data for ${this.pair}:`, error);
  }
);

    this.subscriptions.add(barsSub);
    this.subscriptions.add(predictionSub);
    this.subscriptions.add(confidenceSub);

    // Initialize ResizeObserver for responsiveness
    this.resizeObserver = new ResizeObserver(() => {
      if (this.chart && this.chartElement) {
        const container = this.chartElement.nativeElement as HTMLElement;
        this.chart.applyOptions({
          width: container.clientWidth,
          height: container.clientHeight,
        });
      }
    });

    this.resizeObserver.observe(this.chartElement.nativeElement);
  }

  // Anpassung der Zeitstempel
  convertTimestamp = (ts: number): UTCTimestamp => {
    // Überprüfen, ob der Zeitstempel in Millisekunden ist (z.B. Länge > 10)
    if (ts > 1e10) {
      return Math.floor(ts / 1000) as UTCTimestamp;
    }
    return ts as UTCTimestamp;
  };
}
