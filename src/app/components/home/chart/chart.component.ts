import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  ElementRef,
  HostListener
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

  @HostListener('window:resize')
  onWindowResize() {
    if (this.chart) {
      const chartContainer = this.chartElement.nativeElement as HTMLElement;
      this.chart.resize(chartContainer.clientWidth, chartContainer.clientHeight);
    }
  }

  private chart: LightweightCharts.IChartApi | undefined;
  private candleSeries: LightweightCharts.ISeriesApi<'Candlestick'> | undefined;
  // Instead of a single lineSeries, we maintain an array for multiple prediction series.
  private predictionSeries: LightweightCharts.ISeriesApi<'Line'>[] = [];
  private subscriptions: Subscription = new Subscription();

  // Define the target interval (5 minutes in seconds)
  private readonly TARGET_INTERVAL_SECONDS = 300;
  // Global time offset (if needed).
  private readonly TIME_OFFSET_SECONDS: number = 0;

  constructor(private chartDataService: ChartDataService) { }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    this.initializeChart();
    const chartContainer = this.chartElement.nativeElement as HTMLElement;
    const ro = new ResizeObserver(() => {
      if (this.chart) {
        this.chart.resize(chartContainer.clientWidth, chartContainer.clientHeight);
      }
    });
    ro.observe(chartContainer);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.predictionSeries.forEach(series => this.chart?.removeSeries(series));
    if (this.candleSeries) {
      this.chart?.removeSeries(this.candleSeries);
    }
    if (this.chart) {
      this.chart.remove();
    }
  }

  /**
   * Initializes the chart, creates the candlestick series, and subscribes to bar and prediction data.
   */
  private initializeChart(): void {
    const chartContainer = this.chartElement.nativeElement as HTMLElement;
    if (!chartContainer) {
      console.warn('Chart container is not available.');
      return;
    }

    // Read global CSS variables for theming.
    const style = getComputedStyle(document.documentElement);
    const chartBgColor = style.getPropertyValue('--color-chart-bg').trim() || '#000000';
    const chartTextColor = style.getPropertyValue('--color-chart-text').trim() || '#ffffff';
    const gridColor = style.getPropertyValue('--color-grid-lines').trim() || '#555';

    // Candlestick series colors.
    const upColor = style.getPropertyValue('--chart-candle-up-color').trim() || 'lime';
    const downColor = style.getPropertyValue('--chart-candle-down-color').trim() || 'red';
    const borderUpColor = style.getPropertyValue('--chart-candle-border-up-color').trim() || 'lime';
    const borderDownColor = style.getPropertyValue('--chart-candle-border-down-color').trim() || 'red';
    const wickUpColor = style.getPropertyValue('--chart-candle-wick-up-color').trim() || 'lime';
    const wickDownColor = style.getPropertyValue('--chart-candle-wick-down-color').trim() || 'red';

    // Create chart.
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

    // Add candlestick series.
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

    // Subscribe to bar data.
    const barsSub = this.chartDataService.getModelBars(this.pair, 2000).subscribe(
      (data: any) => {
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
      error => console.error(`Error loading bars for pair=${this.pair}:`, error)
    );
    this.subscriptions.add(barsSub);

    // Subscribe to prediction data.
    const predictionSub = this.chartDataService.getPrediction(this.pair).subscribe(
      (seriesArray: any[]) => {

        // Remove any existing prediction series.
        this.predictionSeries.forEach(series => this.chart?.removeSeries(series));
        this.predictionSeries = [];

        // Optionally, interpolate each series to fill gaps until the target resolution.
        const interpolatedSeries = seriesArray.map(series =>
          this.interpolatePredictionSeries(series, this.TARGET_INTERVAL_SECONDS)
        );

        // Compute mean prediction of each series.
        const means = interpolatedSeries.map(series =>
          series.reduce((sum: number, point: any) => sum + point.y_hat, 0) / series.length
        );
        const minMean = Math.min(...means);
        const maxMean = Math.max(...means);

        // Create a new line series for each prediction series.
        interpolatedSeries.forEach((series, index) => {
          let color = '#2196f3'; // default blue
          if (means[index] === maxMean) {
            color = 'green';
          } else if (means[index] === minMean) {
            color = 'red';
          }
          const newSeries = this.chart!.addLineSeries({
            color: color,
            lineWidth: 2,
          });
          const formattedData = series.map((d: any) => ({
            time: this.convertTimestamp(d.time),
            value: d.y_hat,
          }));
          newSeries.setData(formattedData);
          this.predictionSeries.push(newSeries);
        });
      },
      error => console.error(`Error loading predictions for pair=${this.pair}:`, error)
    );
    this.subscriptions.add(predictionSub);
  }

  /**
   * Helper: Interpolates a prediction series to the target interval (in seconds).
   * Uses linear interpolation between consecutive points.
   */
  private interpolatePredictionSeries(
    series: { time: number, y_hat: number }[],
    targetIntervalSeconds: number
  ): { time: number, y_hat: number }[] {
    if (series.length < 2) {
      return series;
    }
    const interpolated: { time: number, y_hat: number }[] = [];
    for (let i = 0; i < series.length - 1; i++) {
      const pointA = series[i];
      const pointB = series[i + 1];
      interpolated.push(pointA);
      const gap = pointB.time - pointA.time;
      // Calculate how many additional points to generate.
      const numExtra = Math.floor(gap / targetIntervalSeconds) - 1;
      for (let j = 1; j <= numExtra; j++) {
        const interpTime = pointA.time + j * targetIntervalSeconds;
        const fraction = (interpTime - pointA.time) / gap;
        const interpY = pointA.y_hat + fraction * (pointB.y_hat - pointA.y_hat);
        interpolated.push({ time: interpTime, y_hat: interpY });
      }
    }
    // Append the last point.
    interpolated.push(series[series.length - 1]);
    // Ensure sorted order.
    interpolated.sort((a, b) => a.time - b.time);
    return interpolated;
  }

  /**
   * Convert a given timestamp (in seconds or ms) to a UTCTimestamp recognized by LightweightCharts.
   * Applies TIME_OFFSET_SECONDS if needed.
   */
  private convertTimestamp(ts: number): UTCTimestamp {
    let adjustedTs = ts;
    // If the timestamp is in milliseconds, convert to seconds.
    if (ts > 1e10) {
      adjustedTs = Math.floor(ts / 1000);
    }
    adjustedTs += this.TIME_OFFSET_SECONDS;
    return adjustedTs as UTCTimestamp;
  }
}
