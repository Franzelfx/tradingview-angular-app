import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment as env } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ChartDataService {
  private apiUrl = env.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Retrieves the last N bars of Forex data for the given pair.
   * Corresponds to the API endpoint: GET /bars/{pair}/{bars}
   */
  getModelBars(pair: string, bars: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/bars/${pair}/${bars}`).pipe(
      tap((data) =>
        console.log(
          `getModelBars response for ${pair} (bars: ${bars}):`,
          data
        )
      ),
      map((data) => this.adjustTimestamps(data))
    );
  }

  /**
   * Retrieves prediction data for the given pair.
   * Corresponds to the API endpoint: GET /prediction/{pair}
   */
  getPrediction(pair: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/prediction/${pair}`).pipe(
      tap((data) =>
        console.log(`getPrediction response for ${pair}:`, data)
      ),
      map((data) => this.adjustTimestamps(data))
    );
  }

  private adjustTimestamps(data: any): any {
    const currentUtcOffset = this.getCurrentUtcOffsetInSeconds();
    // Check if data is nested under a 'data' key or is an array
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
