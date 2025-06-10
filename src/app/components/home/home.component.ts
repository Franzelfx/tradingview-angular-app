import { Component, OnInit } from '@angular/core';
import { ChartDataService } from '../../services/chart-data.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit {
  /**
   * Key used to persist the currently‑selected pairs in localStorage.
   */
  private static readonly LS_KEY = 'selectedPairs';

  // UI state
  isDarkMode = true;
  isSidebarVisible = true;

  // Data
  availablePairs: string[] = [];
  selectedPairs: string[] = []; // « No pairs selected by default »

  constructor(private chartDataService: ChartDataService) { }

  /**
   * Fetch list of available pairs from the API and restore any persisted
   * selection from localStorage (if it is still valid).
   */
  ngOnInit(): void {
    this.chartDataService.getAvailablePairs().subscribe(
      (pairs: string[]) => {
        this.availablePairs = pairs;

        const stored = localStorage.getItem(HomeComponent.LS_KEY);
        if (stored) {
          try {
            const parsed: string[] = JSON.parse(stored);
            // Keep only the pairs that are still present in the latest list.
            this.selectedPairs = parsed.filter((p) => pairs.includes(p));
          } catch {
            // Malformed JSON – ignore and start fresh.
            localStorage.removeItem(HomeComponent.LS_KEY);
            this.selectedPairs = [];
          }
        }
      },
      (error) => console.error('Error fetching available pairs:', error),
    );
  }

  /**
   * Toggle a pair in/out of the selection and persist the change.
   */
  togglePair(pair: string): void {
    const idx = this.selectedPairs.indexOf(pair);
    if (idx > -1) {
      this.selectedPairs.splice(idx, 1);
    } else {
      this.selectedPairs.push(pair);
    }

    // Preserve original ordering as defined by availablePairs.
    this.selectedPairs.sort(
      (a, b) => this.availablePairs.indexOf(a) - this.availablePairs.indexOf(b),
    );

    // Persist the new selection across refreshes.
    localStorage.setItem(
      HomeComponent.LS_KEY,
      JSON.stringify(this.selectedPairs),
    );
  }

  onToggleSidebar(): void {
    this.isSidebarVisible = !this.isSidebarVisible;
    setTimeout(() => window.dispatchEvent(new Event('resize')), 350);
  }

  onSidebarTransitionEnd(event: TransitionEvent): void {
    if (event.propertyName === 'width') {
      setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
    }
  }

  /**
   * Build the CSS grid rows template string, e.g., "repeat(2, 1fr)".
   */
  getGridTemplateRows(): string {
    const count = this.selectedPairs.length || 1;
    return `repeat(${count}, 1fr)`;
  }
}
