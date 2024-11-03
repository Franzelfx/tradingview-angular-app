import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
})
export class SidebarComponent {
  @Input() pairs: string[] = [];
  @Input() selectedPairs: string[] = [];
  @Input() isSidebarVisible: boolean = true;

  @Output() togglePairSelection = new EventEmitter<string>();

  onTogglePairSelection(pair: string): void {
    this.togglePairSelection.emit(pair);
  }
}
