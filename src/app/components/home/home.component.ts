import { Component, OnInit } from '@angular/core';
import { ChartDataService } from '../../services/chart-data.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit {
  isDarkMode: boolean = true;
  availablePairs: string[] = [];
  selectedPairs: string[] = [];
  isSidebarVisible: boolean = true;

  constructor(private chartDataService: ChartDataService) { }

  ngOnInit(): void {
    this.chartDataService.getAvailablePairs().subscribe(
      (pairs: string[]) => {
        this.availablePairs = pairs;
        // Optionally select all pairs by default
        this.selectedPairs = [...pairs];
      },
      (error: any) => {
        console.error('Error fetching available pairs:', error);
      }
    );
  }

  togglePair(pair: string): void {
    const index = this.selectedPairs.indexOf(pair);
    if (index > -1) {
      this.selectedPairs.splice(index, 1);
    } else {
      this.selectedPairs.push(pair);
    }
  }

  onToggleSidebar(): void {
    // Toggle the sidebar class
    this.isSidebarVisible = !this.isSidebarVisible;
  }

  /**
   * Called once the sidebar transition has ended 
   * (only if the propertyName is 'width').
   */
  onSidebarTransitionEnd(event: TransitionEvent): void {
    // Check if the transition that ended was the width transition
    if (event.propertyName === 'width') {
      // Dispatch a global resize event so the chart can update
      window.dispatchEvent(new Event('resize'));
    }
  }

  /**
   * Build grid-template-rows for each selected chart, e.g. repeat(2, 1fr)
   */
  getGridTemplateRows(): string {
    const count = this.selectedPairs.length || 1;
    return `repeat(${count}, 1fr)`;
  }
}
