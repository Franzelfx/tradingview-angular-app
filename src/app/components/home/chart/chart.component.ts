// src/app/components/chart/chart.component.ts

import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  ElementRef
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

  // If you need a global time offset for your chart data, set this in seconds.
  private readonly TIME_OFFSET_SECONDS: number = 0;

  constructor(
    private chartDataService: ChartDataService
  ) { }

  ngOnInit(): void {
    console.log(`ChartComponent (pair=${this.pair}) => ngOnInit`);
  }

  ngAfterViewInit(): void {
    console.log(`ChartComponent (pair=${this.pair}) => ngAfterViewInit`);
    this.initializeChart();

    // Option A: Listen for the global "resize" event,
    // which HomeComponent triggers after sidebar transition.
    window.addEventListener('resize', this.handleWindowResize);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();

    // Remove the chart if it exists
    if (this.chart) {
      this.chart.remove();
    }

    // Disconnect the ResizeObserver
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    // Stop listening for the global "resize" event
    window.removeEventListener('resize', this.handleWindowResize);
  }

  /**
   * Initializes the LightweightCharts chart, sets up watchers for container resizing,
   * and subscribes to data from ChartDataService.
   */
  private initializeChart(): void {
    const chartContainer = this.chartElement.nativeElement as HTMLElement;
    if (!chartContainer) {
      console.warn('Chart container is not available.');
      return;
    }

    // Read global CSS variables for theming
    const style = getComputedStyle(document.documentElement);
    const chartBgColor = style.getPropertyValue('--color-chart-bg').trim() || '#000000';
    const chartTextColor = style.getPropertyValue('--color-chart-text').trim() || '#ffffff';
    const gridColor = style.getPropertyValue('--color-grid-lines').trim() || '#555';

    // Candlestick colors
    const upColor = style.getPropertyValue('--chart-candle-up-color').trim() || 'lime';
    const downColor = style.getPropertyValue('--chart-candle-down-color').trim() || 'red';
    const borderUpColor = style.getPropertyValue('--chart-candle-border-up-color').trim() || 'lime';
    const borderDownColor = style.getPropertyValue('--chart-candle-border-down-color').trim() || 'red';
    const wickUpColor = style.getPropertyValue('--chart-candle-wick-up-color').trim() || 'lime';
    const wickDownColor = style.getPropertyValue('--chart-candle-wick-down-color').trim() || 'red';

    // Create the chart
    this.chart = LightweightCharts.createChart(chartContainer, {
      width: chartContainer.clientWidth,
      height: chartContainer.clientHeight,
      layout: {
        background: { type: LightweightCharts.ColorType.Solid, color: chartBgColor },
        textColor: chartTextColor,
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
      rightPriceScale: { borderColor: gridColor },
      timeScale: {
        borderColor: gridColor,
        timeVisible: true,
      },
    });

    // Candlestick series
    this.candleSeries = this.chart.addCandlestickSeries({
      upColor,
      downColor,
      borderUpColor,
      borderDownColor,
      wickUpColor,
      wickDownColor,
      priceFormat: {
        type: 'custom',
        formatter: (price: number) => price.toFixed(4),
      },
    });

    // Line series for predictions
    this.lineSeries = this.chart.addLineSeries({
      color: '#2196f3',
      lineWidth: 2,
    });

    // Subscribe to bar (candlestick) data
    const barsSub = this.chartDataService.getModelBars(this.pair, 2000).subscribe(
      (data: any) => {
        console.log(`Bars data for pair=${this.pair}:`, data);
        if (Array.isArray(data)) {
          this.candleSeries?.setData(
            data.map(d => ({
              time: this.convertTimestamp(d.time),
              open: d.open,
              high: d.high,
              low: d.low,
              close: d.close,
            }))
          );
        } else {
          console.warn(`Unexpected bars data format for pair=${this.pair}:`, data);
        }
      },
      (error) => {
        console.error(`Error loading bars for pair=${this.pair}:`, error);
      }
    );
    this.subscriptions.add(barsSub);

    // Subscribe to prediction data
    const predictionSub = this.chartDataService.getPrediction(this.pair).subscribe(
      (data: any) => {
        console.log(`Prediction data for pair=${this.pair}:`, data);
        if (Array.isArray(data)) {
          this.lineSeries?.setData(
            data.map(d => ({
              time: this.convertTimestamp(d.time),
              value: d.y_hat,
            }))
          );
        } else {
          console.warn(`Unexpected prediction data format for pair=${this.pair}:`, data);
        }
      },
      (error) => {
        console.error(`Error loading prediction for pair=${this.pair}:`, error);
      }
    );
    this.subscriptions.add(predictionSub);

    // Initialize a ResizeObserver for normal container resizing
    this.resizeObserver = new ResizeObserver(() => {
      this.updateChartSize();
    });
    this.resizeObserver.observe(chartContainer);
  }

  /**
   * Recalculate the chart's width & height from the container's clientWidth/clientHeight.
   */
  private updateChartSize(): void {
    if (!this.chart || !this.chartElement) return;
    const container = this.chartElement.nativeElement as HTMLElement;
    this.chart.applyOptions({
      width: container.clientWidth,
      height: container.clientHeight,
    });
  }

  /**
   * Convert a given timestamp (sec or ms) to a UTCTimestamp recognized by LightweightCharts.
   * Applies TIME_OFFSET_SECONDS if needed.
   */
  private convertTimestamp(ts: number): UTCTimestamp {
    let adjustedTs = ts;
    // If timestamp is in milliseconds, convert to seconds
    if (ts > 1e10) {
      adjustedTs = Math.floor(ts / 1000);
    }
    adjustedTs += this.TIME_OFFSET_SECONDS;
    return adjustedTs as UTCTimestamp;
  }

  /**
   * Handles global window 'resize' events,
   * triggered by setTimeout(...) in the HomeComponent after toggling sidebar.
   */
  private handleWindowResize = (): void => {
    this.updateChartSize();
  };
}
