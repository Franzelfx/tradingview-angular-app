// src/app/services/web-socket.service.ts

import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  private ws: WebSocket | null = null;
  private logSubject = new Subject<string>();

  private apiUrl = environment.apiUrlWs;

  /**
   * Establishes a WebSocket connection to the server.
   * @param pair The trading pair for which to stream logs.
   */
  connect(pair: string): void {
    // Ensure no existing connection
    if (this.ws) {
      this.ws.close();
    }

    // Establish WebSocket connection for the specific pair
    this.ws = new WebSocket(
      `${this.apiUrl}/logs`
    );

    this.ws.onopen = () => {
      console.log('WebSocket connection opened');
      // Optionally, send a message to specify the pair if needed
      // this.ws?.send(JSON.stringify({ pair }));
    };

    this.ws.onmessage = (event) => {
      // Send incoming log messages to subscribers
      this.logSubject.next(event.data);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket connection closed');
    };
  }

  /**
   * Closes the current WebSocket connection.
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Returns an observable stream of log messages.
   */
  getLogMessages(): Observable<string> {
    return this.logSubject.asObservable();
  }
}
