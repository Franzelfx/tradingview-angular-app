import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, interval, fromEvent, merge, of } from "rxjs";
import { map, switchMap, filter, take, startWith } from "rxjs/operators";
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

@Injectable({ providedIn: "root" })
export class ChartDataService {
  private apiUrl = env.apiUrl;
  private readonly POLLING_INTERVAL = 10_000; // 10 s

  constructor(private http: HttpClient) { }

  // ────────────────────────────────────────────────────────────────────────────
  // BAR DATA
  // ────────────────────────────────────────────────────────────────────────────
  /**
   * Retrieve the last **`bars`** OHLC candles for **`pair`**.
   *
   * If *intervalOverride* is **not** provided, we derive the candle size from
   * the prediction series so that chart & forecast always line‑up.  The
   * heuristic now uses the **most common Δt** in the series, not just the first
   * gap, making it robust against header gaps or out‑of‑order rows.
   */
  getModelBars(
    pair: string,
    bars: number,
    intervalOverride?: string,
  ): Observable<Bar[]> {
    const vis$ = fromEvent(document, "visibilitychange").pipe(
      filter(() => document.visibilityState === "visible")
    );

    const interval$ = intervalOverride
      ? of(intervalOverride)
      : this.getPrediction(pair).pipe(
        take(1),
        map((seriesArr) => this.computeInterval(seriesArr[0] ?? []))
      );

    return interval$.pipe(
      switchMap((intv) =>
        merge(interval(this.POLLING_INTERVAL).pipe(startWith(0)), vis$).pipe(
          switchMap(() =>
            this.http.get<Bar[]>(`${this.apiUrl}/bars/${pair}/${bars}?interval=${intv}`)
          ),
          map((data) => this.applyUtcOffset(data))
        )
      )
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // PREDICTIONS (single‑series, wrapped)
  // ────────────────────────────────────────────────────────────────────────────
  getPrediction(pair: string, field: string | null = null): Observable<PredictionPoint[][]> {
    const vis$ = fromEvent(document, "visibilitychange").pipe(
      filter(() => document.visibilityState === "visible")
    );

    return merge(interval(this.POLLING_INTERVAL).pipe(startWith(0)), vis$).pipe(
      switchMap(() => this.http.get<any>(field
        ? `${this.apiUrl}/predictions/${pair}?field=${field}`
        : `${this.apiUrl}/predictions/${pair}`)),
      map((raw) => this.transformPredictionResponse(raw))
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // AVAILABLE PAIRS
  // ────────────────────────────────────────────────────────────────────────────
  getAvailablePairs(): Observable<string[]> {
    return this.http
      .get<{ available_pairs: string[] }>(`${this.apiUrl}/available_pairs`)
      .pipe(map((resp) => resp.available_pairs));
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Helpers
  // ════════════════════════════════════════════════════════════════════════════

  /** Convert backend prediction into our canonical shape and wrap in an array. */
  private transformPredictionResponse(raw: any): PredictionPoint[][] {
    const rows: any[] = Array.isArray(raw) ? raw : raw?.data ?? [];
    if (!rows.length) return [[]];

    const valueKey = Object.keys(rows[0]).find((k) => k !== "timestamp");
    if (!valueKey) return [[]];

    const offset = this.getUtcOffset();
    const series = rows
      .map((r) => ({ time: +r.timestamp + offset, y_hat: +r[valueKey] }))
      .filter((p) => !isNaN(p.time) && !isNaN(p.y_hat))
      .sort((a, b) => a.time - b.time);

    return [series];
  }

  /**
   * Compute the candle interval (e.g. "15m") by taking the **mode** of all
   * positive Δt values. This resists single missing rows or header gaps.
   */
  private computeInterval(series: { time: number }[]): string {
    if (series.length < 3) return "1m";

    const deltas: number[] = [];
    for (let i = 1; i < series.length; i++) {
      const d = series[i].time - series[i - 1].time;
      if (d > 0) deltas.push(d);
    }
    if (!deltas.length) return "1m";

    const freq = new Map<number, number>();
    for (const d of deltas) freq.set(d, (freq.get(d) ?? 0) + 1);
    const [modeSec] = [...freq.entries()].sort((a, b) => b[1] - a[1])[0];

    return this.secToIntervalString(modeSec);
  }

  /** Convert seconds to Influx/endpoint interval string. */
  private secToIntervalString(sec: number): string {
    if (sec % 86_400 === 0) return `${sec / 86_400}d`;
    if (sec % 3_600 === 0) return `${sec / 3_600}h`;
    if (sec % 60 === 0) return `${sec / 60}m`;
    return `${sec}s`;
  }

  private applyUtcOffset<T extends { time: number }>(data: T[]): T[] {
    const off = this.getUtcOffset();
    return data.map((d) => ({ ...d, time: d.time + off } as T));
  }

  private getUtcOffset(): number {
    return -new Date().getTimezoneOffset() * 60; // seconds
  }
}
