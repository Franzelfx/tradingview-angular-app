import {
  Component,
  Input,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  HostListener,
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
export class ChartComponent implements AfterViewInit, OnDestroy {
  @Input() pair: string = 'EURUSD';

  @ViewChild('chart', { static: false }) private chartElement!: ElementRef;

  @HostListener('window:resize')
  onWindowResize(): void {
    const chartContainer = this.chartElement?.nativeElement as HTMLElement;
    this.chart?.resize(chartContainer.clientWidth, chartContainer.clientHeight);
  }

  private chart?: LightweightCharts.IChartApi;
  private candleSeries?: LightweightCharts.ISeriesApi<'Candlestick'>;
  private predictionSeries: LightweightCharts.ISeriesApi<'Line'>[] = [];
  private readonly subscriptions = new Subscription();

  /**
   * Allows shifting the time axis, e.g., when backend timestamps are not UTC.
   * Keep at 0 unless you need an offset.
   */
  private readonly TIME_OFFSET_SECONDS = 0;

  constructor(private readonly chartDataService: ChartDataService) { }

  // ---------------------------------------------------------------------------
  //  LIFECYCLE
  // ---------------------------------------------------------------------------

  ngAfterViewInit(): void {
    this.initChart();
    this.observeResize();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.predictionSeries.forEach((series) => this.chart?.removeSeries(series));
    if (this.candleSeries) this.chart?.removeSeries(this.candleSeries);
    this.chart?.remove();
  }

  // ---------------------------------------------------------------------------
  //  INITIALISATION
  // ---------------------------------------------------------------------------

  /**
   * Create the Price Chart and add the required series.
   */
  private initChart(): void {
    const container = this.chartElement.nativeElement as HTMLElement;
    if (!container) return;

    const {
      '--color-chart-bg': chartBg = '#000',
      '--color-chart-text': chartText = '#fff',
      '--color-grid-lines': grid = '#555',
      '--chart-candle-up-color': up = 'lime',
      '--chart-candle-down-color': down = 'red',
      '--chart-candle-border-up-color': borderUp = 'lime',
      '--chart-candle-border-down-color': borderDown = 'red',
      '--chart-candle-wick-up-color': wickUp = 'lime',
      '--chart-candle-wick-down-color': wickDown = 'red',
    } = getComputedStyle(document.documentElement) as unknown as Record<string, string>;

    // --- Chart instance ------------------------------------------------------
    this.chart = LightweightCharts.createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      layout: {
        background: { type: LightweightCharts.ColorType.Solid, color: chartBg.trim() },
        textColor: chartText.trim(),
      },
      grid: {
        vertLines: { color: grid.trim() },
        horzLines: { color: grid.trim() },
      },
      crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
      rightPriceScale: { borderColor: grid.trim() },
      timeScale: { borderColor: grid.trim(), timeVisible: true },
    });

    // --- Candlesticks --------------------------------------------------------
    this.candleSeries = this.chart.addCandlestickSeries({
      upColor: up.trim(),
      downColor: down.trim(),
      borderUpColor: borderUp.trim(),
      borderDownColor: borderDown.trim(),
      wickUpColor: wickUp.trim(),
      wickDownColor: wickDown.trim(),
      priceFormat: {
        type: 'custom',
        formatter: (price: number) => price.toFixed(4),
      },
    });

    this.subscribeBars();
    this.subscribePredictions();
  }

  /**
   * ResizeObserver keeps the chart responsive inside flex/grid layouts.
   */
  private observeResize(): void {
    const container = this.chartElement.nativeElement as HTMLElement;
    const ro = new ResizeObserver(() => {
      this.chart?.resize(container.clientWidth, container.clientHeight);
    });
    ro.observe(container);
  }

  // ---------------------------------------------------------------------------
  //  DATA SUBSCRIPTIONS
  // ---------------------------------------------------------------------------

  private subscribeBars(): void {
    const barsSub = this.chartDataService.getModelBars(this.pair, 2000).subscribe({
      next: (data) => {
        if (!Array.isArray(data)) {
          console.warn(`[Chart] Unexpected bars for ${this.pair}:`, data);
          return;
        }
        this.candleSeries?.setData(
          data.map((d) => ({
            time: this.toUtc(d.time),
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
          }))
        );
      },
      error: (err) => console.error(`[Chart] Bars error for ${this.pair}:`, err),
    });
    this.subscriptions.add(barsSub);
  }

  private subscribePredictions(): void {
    const predSub = this.chartDataService.getPrediction(this.pair).subscribe({
      next: (seriesArr) => this.updatePredictionSeries(seriesArr),
      error: (err) => console.error(`[Chart] Prediction error for ${this.pair}:`, err),
    });
    this.subscriptions.add(predSub);
  }

  // ---------------------------------------------------------------------------
  //  HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Draw the prediction lines without modifying (interpolating) incoming data.
   */
  private updatePredictionSeries(
    seriesArr: { time: number; y_hat: number }[][]
  ): void {
    // Clear old series
    this.predictionSeries.forEach((s) => this.chart?.removeSeries(s));
    this.predictionSeries = [];

    // Determine colouring based on mean value of each prediction series
    const means = seriesArr.map(
      (s) => s.reduce((sum, p) => sum + p.y_hat, 0) / s.length
    );
    const minMean = Math.min(...means);
    const maxMean = Math.max(...means);

    seriesArr.forEach((series, idx) => {
      let color = '#2196f3'; // default blue
      if (means[idx] === maxMean) color = 'green';
      else if (means[idx] === minMean) color = 'red';

      const line = this.chart!.addLineSeries({ color, lineWidth: 2 });
      line.setData(
        series.map((p) => ({
          time: this.toUtc(p.time),
          value: p.y_hat,
        }))
      );
      this.predictionSeries.push(line);
    });
  }

  /**
   * Lightweight Charts expects seconds since UNIX epoch (UTC).
   * Accepts ms or s and applies optional offset.
   */
  private toUtc(ts: number): UTCTimestamp {
    const seconds = ts > 1e10 ? Math.floor(ts / 1000) : ts; // convert ms → s if needed
    return (seconds + this.TIME_OFFSET_SECONDS) as UTCTimestamp;
  }
}
