import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, interval, fromEvent, merge, of } from "rxjs";
import { map, switchMap, tap, filter, take, startWith } from "rxjs/operators";
import { environment as env } from "../../environments/environment";

export interface Bar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface PredictionPoint {
  time: number;
  y_hat: number;
}

@Injectable({
  providedIn: "root",
})
export class ChartDataService {
  private apiUrl = env.apiUrl;
  private readonly POLLING_INTERVAL = 10_000; // 10 seconds

  constructor(private http: HttpClient) { }

  /**
   * ----------  BAR DATA  ---------------------------------------------------
   * Retrieves the last `bars` OHLC candles for `pair` at the given interval.
   * If `intervalOverride` is omitted, it derives the coarsest interval it can
   * observe from the first prediction series (fallback: "1m").
   */
  getModelBars(
    pair: string,
    bars: number,
    intervalOverride?: string,
  ): Observable<Bar[]> {
    const visibility$ = fromEvent(document, "visibilitychange").pipe(
      filter(() => document.visibilityState === "visible")
    );

    // Derive interval if the caller did not supply one.
    const maybeInterval$ = intervalOverride
      ? of(intervalOverride)
      : this.getPrediction(pair).pipe(
        take(1),
        map((seriesArray) => this.computeInterval(seriesArray[0] || [])) // seriesArray always length 1
      );

    return maybeInterval$.pipe(
      switchMap((intervalStr) =>
        merge(interval(this.POLLING_INTERVAL).pipe(startWith(0)), visibility$).pipe(
          switchMap(() =>
            this.http.get<Bar[]>(
              `${this.apiUrl}/bars/${pair}/${bars}?interval=${intervalStr}`
            )
          ),
          map((barsData) => this.applyUtcOffset(barsData))
        )
      )
    );
  }

  /**
   * ----------  PREDICTIONS  -------------------------------------------------
   * Returns **one** prediction series (array of PredictionPoint) wrapped in a
   * single‑element array so that consumers expecting an array of series can
   * keep working unchanged.
   */
  getPrediction(
    pair: string,
    field: string | null = null
  ): Observable<PredictionPoint[][]> {
    const visibility$ = fromEvent(document, "visibilitychange").pipe(
      filter(() => document.visibilityState === "visible")
    );

    return merge(interval(this.POLLING_INTERVAL).pipe(startWith(0)), visibility$).pipe(
      switchMap(() =>
        this.http.get<any>(
          field
            ? `${this.apiUrl}/predictions/${pair}?field=${field}`
            : `${this.apiUrl}/predictions/${pair}`
        )
      ),
      map((raw) => this.transformPredictionResponse(raw))
    );
  }

  /**
   * ----------  AVAILABLE PAIRS  -------------------------------------------
   */
  getAvailablePairs(): Observable<string[]> {
    return this.http
      .get<{ available_pairs: string[] }>(`${this.apiUrl}/available_pairs`)
      .pipe(map((resp) => resp.available_pairs));
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  /** Convert backend prediction (which may have any single value column) into
   *  our canonical shape and wrap it in an outer array. */
  private transformPredictionResponse(raw: any): PredictionPoint[][] {
    const rows: any[] = Array.isArray(raw) ? raw : raw?.data ?? [];
    if (!rows.length) return [[]];

    // Find the first key that is not "timestamp".
    const valueKey = Object.keys(rows[0]).find((k) => k !== "timestamp");
    if (!valueKey) return [[]];

    const utcOffset = this.getCurrentUtcOffset();
    const series: PredictionPoint[] = rows
      .map((r) => ({
        time: Number(r.timestamp) + utcOffset,
        y_hat: Number(r[valueKey]),
      }))
      .filter((p) => !isNaN(p.time) && !isNaN(p.y_hat))
      .sort((a, b) => a.time - b.time);

    return [series]; // single‑series wrapped
  }

  /** Compute an interval string such as "5m" from a series. */
  private computeInterval(series: { time: number }[]): string {
    if (series.length < 2) return "1m";
    const deltaSec = series[1].time - series[0].time;
    if (deltaSec % 86_400 === 0) return `${deltaSec / 86_400}d`;
    if (deltaSec % 3_600 === 0) return `${deltaSec / 3_600}h`;
    if (deltaSec % 60 === 0) return `${deltaSec / 60}m`;
    return `${deltaSec}s`;
  }

  /** Apply local UTC offset to each bar's time. */
  private applyUtcOffset<T extends { time: number }>(data: T[]): T[] {
    const offset = this.getCurrentUtcOffset();
    return data.map((d) => ({ ...d, time: d.time + offset } as T));
  }

  private getCurrentUtcOffset(): number {
    return -new Date().getTimezoneOffset() * 60; // seconds
  }
}
