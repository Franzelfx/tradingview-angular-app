import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval, fromEvent, merge } from 'rxjs';
import { map, tap, startWith, switchMap, filter } from 'rxjs/operators';
import { environment as env } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ChartDataService {
  private apiUrl = env.apiUrl;
  private readonly POLLING_INTERVAL = 10000; // 10 seconds

  constructor(private http: HttpClient) { }

  /**
   * Retrieves the last N bars of Forex data for the given pair.
   */
  getModelBars(pair: string, bars: number): Observable<any> {
    const visibilityChange$ = fromEvent(document, 'visibilitychange').pipe(
      filter(() => document.visibilityState === 'visible')
    );

    return merge(
      interval(this.POLLING_INTERVAL).pipe(startWith(0)),
      visibilityChange$
    ).pipe(
      switchMap(() =>
        this.http.get(`${this.apiUrl}/bars/${pair}/${bars}`).pipe(
          tap((data) =>
            console.log(`getModelBars response for ${pair} (bars: ${bars}):`, data)
          ),
          map((data) => this.adjustTimestamps(data))
        )
      )
    );
  }

  /**
   * Retrieves prediction data for the given pair and transforms it into multiple prediction series.
   * 
   * The backend response is expected to be an array of objects where each object looks like:
   * {
   *   "timestamp": 1744664700,
   *   "close_sma_10_SOLUSD": 391.2088623047,
   *   "close_moving_grid_min_288_5_SOLUSD": 385.0978088379,
   *   "close_moving_grid_max_288_95_SOLUSD": 396.9638977051
   * }
   * 
   * This function extracts all keys (other than "timestamp") and returns an array where each element 
   * corresponds to one prediction series (an array of points). Each point is in the form:
   * { time: number, y_hat: number }
   * 
   * The current UTC offset (in seconds) is added to each timestamp.
   */
  getPrediction(pair: string, field: string = 'close'): Observable<any> {
    const visibilityChange$ = fromEvent(document, 'visibilitychange').pipe(
      filter(() => document.visibilityState === 'visible')
    );

    return merge(
      interval(this.POLLING_INTERVAL).pipe(startWith(0)),
      visibilityChange$
    ).pipe(
      switchMap(() =>
        this.http.get(`${this.apiUrl}/predictions/${pair}?field=${field}`)
      ),
      tap((data) =>
        console.log(`getPrediction response for ${pair} (field: ${field}):`, data)
      ),
      map((data: any) => {
        // Support responses that are either an array or an object with a 'data' property.
        let rows: any[] = [];
        if (Array.isArray(data)) {
          rows = data;
        } else if (data && Array.isArray(data.data)) {
          rows = data.data;
        }
        if (!rows || rows.length === 0) {
          return []; // return empty array if no data
        }

        // Extract all prediction column names (all keys except "timestamp").
        const seriesNames = Object.keys(rows[0]).filter(key => key !== 'timestamp');
        // Build one prediction series per key.
        const seriesArray = seriesNames.map(name => {
          return rows.map(row => {
            const timeValue = Number(row.timestamp);
            return {
              time: isNaN(timeValue) ? NaN : timeValue,
              y_hat: row[name]
            };
          }).filter(point => !isNaN(point.time));
        });

        // Adjust each series' timestamps by the current UTC offset and sort by time.
        const utcOffset = this.getCurrentUtcOffsetInSeconds();
        seriesArray.forEach(series => {
          series.forEach(point => {
            point.time += utcOffset;
          });
          series.sort((a, b) => a.time - b.time);
        });
        return seriesArray;
      })
    );
  }


  /**
   * Retrieves available pairs from the backend.
   */
  getAvailablePairs(): Observable<string[]> {
    return this.http
      .get<{ available_pairs: string[] }>(`${this.apiUrl}/available_pairs`)
      .pipe(
        map(response => response.available_pairs),
        tap(pairs => console.log('Available pairs:', pairs))
      );
  }

  /**
   * Adjusts timestamps in the data.
   *
   * If data is an array of objects with a 'time' field, adds the current UTC offset.
   * If data is nested (e.g., { data: [...] }) then adjusts the inner array.
   */
  private adjustTimestamps(data: any): any {
    const currentUtcOffset = this.getCurrentUtcOffsetInSeconds();
    if (data.data) {
      console.log('Adjusting timestamps for nested data:', data.data);
      data.data = data.data.map((d: any) => ({
        ...d,
        time: d.time + currentUtcOffset,
      }));
    } else if (Array.isArray(data)) {
      console.log('Adjusting timestamps for array data:', data);
      data = data.map((d: any) => ({
        ...d,
        time: d.time + currentUtcOffset,
      }));
    }
    console.log('Data after timestamp adjustment:', data);
    return data;
  }

  private getCurrentUtcOffsetInSeconds(): number {
    const offsetInSeconds = -new Date().getTimezoneOffset() * 60;
    console.log('Current UTC offset in seconds:', offsetInSeconds);
    return offsetInSeconds;
  }
}
