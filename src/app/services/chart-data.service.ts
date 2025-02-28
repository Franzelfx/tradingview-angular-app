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
  private readonly POLLING_INTERVAL = 60000; // 60 seconds

  constructor(private http: HttpClient) { }

  /**
   * Retrieves the last N bars of Forex data for the given pair.
   * This method polls the API every 60 seconds and triggers an update when the tab becomes visible.
   */
  getModelBars(pair: string, bars: number): Observable<any> {
    // Observable that emits when the document becomes visible
    const visibilityChange$ = fromEvent(document, 'visibilitychange').pipe(
      filter(() => document.visibilityState === 'visible')
    );

    // Merge the polling interval and the visibility change observables
    return merge(
      interval(this.POLLING_INTERVAL).pipe(startWith(0)),
      visibilityChange$
    ).pipe(
      switchMap(() =>
        this.http.get(`${this.apiUrl}/bars/${pair}/${bars}`).pipe(
          tap((data) =>
            console.log(
              `getModelBars response for ${pair} (bars: ${bars}):`,
              data
            )
          ),
          map((data) => this.adjustTimestamps(data))
        )
      )
    );
  }

  /**
   * Retrieves prediction data for the given pair.
   * This method polls the API every 60 seconds and triggers an update when the tab becomes visible.
   */
  getPrediction(pair: string): Observable<any> {
    const visibilityChange$ = fromEvent(document, 'visibilitychange').pipe(
      filter(() => document.visibilityState === 'visible')
    );

    return merge(
      interval(this.POLLING_INTERVAL).pipe(startWith(0)),
      visibilityChange$
    ).pipe(
      switchMap(() =>
        this.http.get(`${this.apiUrl}/prediction/${pair}`).pipe(
          tap((data) =>
            console.log(`getPrediction response for ${pair}:`, data)
          ),
          map((data) => this.adjustTimestamps(data))
        )
      )
    );
  }

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
