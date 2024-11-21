// src/app/components/execution-log/execution-log.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { WebSocketService } from '../../../../services/web-socket.service';
import { MatDialogRef } from '@angular/material/dialog';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-execution-log',
  templateUrl: './execution-log.component.html',
  styleUrls: ['./execution-log.component.css'],
})
export class ExecutionLogComponent implements OnInit, OnDestroy {
  logMessages: string[] = [];
  private logSubscription: Subscription = new Subscription();

  constructor(
    private wsService: WebSocketService,
    private dialogRef: MatDialogRef<ExecutionLogComponent>
  ) {}

  ngOnInit(): void {
    // Subscribe to log messages
    this.logSubscription = this.wsService.getLogMessages().subscribe(
      (message) => {
        this.logMessages.push(message);
      },
      (error) => {
        console.error('Error receiving log messages:', error);
      }
    );
  }

  ngOnDestroy(): void {
    // Unsubscribe to prevent memory leaks
    this.logSubscription.unsubscribe();
    // Optionally, disconnect the WebSocket if no longer needed
    this.wsService.disconnect();
  }

  closeDialog(): void {
    this.dialogRef.close();
  }

  clearLogs(): void {
    this.logMessages = [];
  }
}
