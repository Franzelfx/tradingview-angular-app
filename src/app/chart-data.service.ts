import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment as env } from '../environments/environment';
@Injectable({
  providedIn: 'root',
})
export class ChartDataService {
  private apiUrl = env.apiUrl;

  constructor(private http: HttpClient) {}

  getChartDumps(): Observable<any> {
    return this.http.get(`${this.apiUrl}/dumps`);
  }

  getConfidence(pair: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/confidence/${pair}`);
  }

  getConfidences(pair: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/confidences/${pair}`);
  }

  getModelBars(pair: string, limit: number): Observable<any> {
    return this.http
      .get(`${this.apiUrl}/bars/${pair}/${limit}`)
      .pipe(map((data) => this.adjustTimestamps(data)));
  }

  getPrediction(pair: string): Observable<any> {
    return this.http
      .get(`${this.apiUrl}/prediction/${pair}`)
      .pipe(map((data) => this.adjustTimestamps(data)));
  }

  private adjustTimestamps(data: any): any {
    const currentUtcOffset = this.getCurrentUtcOffsetInSeconds();
    if (data.data) {
      // If the data is nested under 'data' key
      data.data = data.data.map((d: any) => ({
        ...d,
        time: d.time + currentUtcOffset,
      }));
    } else {
      // If the data is an array
      return data.map((d: any) => ({
        ...d,
        time: d.time + currentUtcOffset,
      }));
    }
    return data;
  }

  private getCurrentUtcOffsetInSeconds(): number {
    // Get the current UTC offset in minutes and convert it to seconds
    // Note: getTimezoneOffset() returns the difference in minutes, negative for timezones ahead of UTC
    return -new Date().getTimezoneOffset() * 60;
  }
}
