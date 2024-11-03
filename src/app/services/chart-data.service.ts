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

  getChartDumps(): Observable<any> {
    return this.http
      .get(`${this.apiUrl}/dumps`)
      .pipe(tap((data) => console.log('getChartDumps response:', data)));
  }

  getConfidence(pair: string): Observable<any> {
    return this.http
      .get(`${this.apiUrl}/confidence/${pair}`)
      .pipe(
        tap((data) => console.log(`getConfidence response for ${pair}:`, data))
      );
  }

  getConfidences(pair: string): Observable<any> {
    return this.http
      .get(`${this.apiUrl}/confidences/${pair}`)
      .pipe(
        tap((data) => console.log(`getConfidences response for ${pair}:`, data))
      );
  }

  getModelBars(pair: string, limit: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/bars/${pair}/${limit}`).pipe(
      tap((data) =>
        console.log(
          `getModelBars response for ${pair} (limit: ${limit}):`,
          data
        )
      ),
      map((data) => this.adjustTimestamps(data))
    );
  }

  getPrediction(pair: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/prediction/${pair}`).pipe(
      tap((data) => console.log(`getPrediction response for ${pair}:`, data)),
      map((data) => this.adjustTimestamps(data))
    );
  }

  private adjustTimestamps(data: any): any {
    const currentUtcOffset = this.getCurrentUtcOffsetInSeconds();
    if (data.data) {
      // If the data is nested under 'data' key
      console.log('Adjusting timestamps for nested data:', data.data);
      data.data = data.data.map((d: any) => ({
        ...d,
        time: d.time + currentUtcOffset,
      }));
    } else {
      // If the data is an array
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
