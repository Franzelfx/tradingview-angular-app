import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  private logMessagesSubject = new Subject<string>();
  private inferenceCompleteSubject = new Subject<string>();
  private websocket: WebSocket | undefined;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000; // 5 seconds

  connect(pair: string): void {
    const wsUrl = `${environment.apiUrlWs}/${pair}`;
    console.log(`[WebSocketService] Connecting to: ${wsUrl}`);
    this.websocket = new WebSocket(wsUrl);

    this.websocket.onopen = () => {
      console.log(
        `[WebSocketService] Connected to WebSocket for pair: ${pair}`
      );
      this.reconnectAttempts = 0; // Reset reconnect attempts
    };

    this.websocket.onmessage = (event) => {
      const message = event.data;
      this.logMessagesSubject.next(message);

      // Check if the message indicates inference completion
      if (message.includes('Inference completed for pair')) {
        const match = message.match(/Inference completed for pair (\w+)/);
        if (match && match[1]) {
          const pairName = match[1];
          this.inferenceCompleteSubject.next(pairName);
        }
      }
    };

    this.websocket.onclose = (event) => {
      console.warn(`[WebSocketService] WebSocket closed:`, event);
      this.reconnect(pair);
    };

    this.websocket.onerror = (event) => {
      console.error(`[WebSocketService] WebSocket error:`, event);
      if (!environment.production) {
        console.error('WebSocket error details:', event);
      }
    };
  }

  private reconnect(pair: string): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(
        `[WebSocketService] Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
      );
      setTimeout(() => {
        this.connect(pair);
      }, this.reconnectInterval);
    } else {
      console.error(
        `[WebSocketService] Maximum reconnect attempts reached. WebSocket not connected.`
      );
    }
  }

  getLogMessages(): Observable<string> {
    return this.logMessagesSubject.asObservable();
  }

  getInferenceComplete(): Observable<string> {
    return this.inferenceCompleteSubject.asObservable();
  }

  disconnect(): void {
    if (this.websocket) {
      console.log('[WebSocketService] Disconnecting WebSocket...');
      this.websocket.close();
      this.websocket = undefined;
    }
  }
}
