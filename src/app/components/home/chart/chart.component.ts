// src/app/components/chart/chart.component.ts

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
import { UTCTimestamp } from 'lightweight-charts';

@Component({
  selector: 'app-chart',
  templateUrl: './chart.component.html',
  styleUrls: ['./chart.component.css'],
})
export class ChartComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() pair: string = 'EURUSD';

  @ViewChild('chart', { static: false }) chartElement!: ElementRef;

  private chart: LightweightCharts.IChartApi | undefined;
  private candleSeries: LightweightCharts.ISeriesApi<'Candlestick'> | undefined;
  private lineSeries: LightweightCharts.ISeriesApi<'Line'> | undefined;
  private subscriptions: Subscription = new Subscription();
  private resizeObserver: ResizeObserver | undefined;

  // Time offset in seconds (if needed; currently set to 0)
  private readonly TIME_OFFSET_SECONDS: number = 0;

  constructor(
    private chartDataService: ChartDataService,
    private renderer: Renderer2
  ) { }

  ngOnInit(): void {
    console.log('ChartComponent initialized with pair:', this.pair);
  }

  ngAfterViewInit(): void {
    console.log('ChartComponent view initialized for pair:', this.pair);
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

    // Read global CSS variables
    const style = getComputedStyle(document.documentElement);
    const chartBgColor = style.getPropertyValue('--color-chart-bg').trim();
    const chartTextColor = style.getPropertyValue('--color-chart-text').trim();
    const gridColor = style.getPropertyValue('--color-grid-lines').trim() || '#555';

    // Read candlestick colors from CSS
    const upColor = style.getPropertyValue('--chart-candle-up-color').trim();
    const downColor = style.getPropertyValue('--chart-candle-down-color').trim();
    const borderUpColor = style.getPropertyValue('--chart-candle-border-up-color').trim();
    const borderDownColor = style.getPropertyValue('--chart-candle-border-down-color').trim();
    const wickUpColor = style.getPropertyValue('--chart-candle-wick-up-color').trim();
    const wickDownColor = style.getPropertyValue('--chart-candle-wick-down-color').trim();

    // Create chart with global colors
    this.chart = LightweightCharts.createChart(chartContainer, {
      width: chartContainer.clientWidth,
      height: chartContainer.clientHeight,
      layout: {
        background: {
          type: LightweightCharts.ColorType.Solid,
          color: chartBgColor, // Expected to be black (#000000)
        },
        textColor: chartTextColor, // Expected to be white (#ffeffe)
      },
      grid: {
        vertLines: {
          color: gridColor,
        },
        horzLines: {
          color: gridColor,
        },
      },
      crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: gridColor,
      },
      timeScale: {
        borderColor: gridColor,
        timeVisible: true,
      },
    });

    // Add candlestick series using the CSS-driven colors.
    this.candleSeries = this.chart.addCandlestickSeries({
      upColor: upColor,
      downColor: downColor,
      borderUpColor: borderUpColor,
      borderDownColor: borderDownColor,
      wickUpColor: wickUpColor,
      wickDownColor: wickDownColor,
      priceFormat: {
        type: 'custom',
        formatter: (price: number) => price.toFixed(4),
      },
    });

    // Add line series for predictions.
    this.lineSeries = this.chart.addLineSeries({
      color: '#2196f3',
      lineWidth: 2,
    });

    // Fetch and set candlestick bar data.
    const barsSub = this.chartDataService.getModelBars(this.pair, 2000).subscribe(
      (data: any) => {
        console.log(`Model bars data for ${this.pair}:`, data);
        if (Array.isArray(data)) {
          this.candleSeries?.setData(
            data.map((d: any) => ({
              time: this.convertTimestamp(d.time),
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
        console.error(`Error loading bars for ${this.pair}:`, error);
      }
    );

    // Fetch and set prediction data.
    const predictionSub = this.chartDataService.getPrediction(this.pair).subscribe(
      (predictionData: any) => {
        console.log(`Prediction data for ${this.pair}:`, predictionData);
        if (Array.isArray(predictionData)) {
          this.lineSeries?.setData(
            predictionData.map((d: any) => ({
              time: this.convertTimestamp(d.time),
              value: d.y_hat,
            }))
          );
        } else {
          console.warn(`Unexpected prediction data format for ${this.pair}:`, predictionData);
        }
      },
      (error: any) => {
        console.error(`Error loading prediction data for ${this.pair}:`, error);
      }
    );

    this.subscriptions.add(barsSub);
    this.subscriptions.add(predictionSub);

    // Initialize ResizeObserver for responsive resizing.
    this.resizeObserver = new ResizeObserver(() => {
      if (this.chart && this.chartElement) {
        const container = this.chartElement.nativeElement as HTMLElement;
        this.chart.applyOptions({
          width: container.clientWidth,
          height: container.clientHeight,
        });
      }
    });
    this.resizeObserver.observe(chartContainer);
  }

  /**
   * Converts a timestamp to UTCTimestamp in seconds.
   * If the timestamp is in milliseconds, it is converted to seconds.
   * Also applies any configured time offset.
   * @param ts - The original timestamp.
   * @returns The adjusted timestamp as UTCTimestamp.
   */
  convertTimestamp = (ts: number): UTCTimestamp => {
    let adjustedTs = ts;
    if (ts > 1e10) {
      adjustedTs = Math.floor(ts / 1000);
    }
    adjustedTs += this.TIME_OFFSET_SECONDS;
    return adjustedTs as UTCTimestamp;
  };
}
