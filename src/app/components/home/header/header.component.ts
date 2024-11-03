import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent {
  @Input() isDarkMode: boolean = false;
  @Input() isSidebarVisible: boolean = true;

  @Output() toggleDarkModeEvent = new EventEmitter<boolean>();
  @Output() toggleSidebarEvent = new EventEmitter<void>();

  onToggleDarkMode(event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.toggleDarkModeEvent.emit(isChecked);
  }

  onToggleSidebar(): void {
    this.toggleSidebarEvent.emit();
  }
}
