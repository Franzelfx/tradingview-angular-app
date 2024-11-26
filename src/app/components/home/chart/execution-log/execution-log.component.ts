import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { WebSocketService } from '../../../../services/web-socket.service';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-execution-log',
  templateUrl: './execution-log.component.html',
  styleUrls: ['./execution-log.component.css'],
})
export class ExecutionLogComponent implements OnInit, OnDestroy {
  logMessages: string[] = [];
  private logSubscription: Subscription = new Subscription();
  pair: string = '';

  constructor(
    private wsService: WebSocketService,
    private dialogRef: MatDialogRef<ExecutionLogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any // Inject dialog data
  ) {
    this.pair = data.pair; // Assign the passed pair
  }

  ngOnInit(): void {
    // Connect to WebSocket with the received pair
    this.wsService.connect(this.pair);
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
    // Disconnect the WebSocket
    this.wsService.disconnect();
  }

  closeDialog(): void {
    this.dialogRef.close();
  }

  clearLogs(): void {
    this.logMessages = [];
  }
}
