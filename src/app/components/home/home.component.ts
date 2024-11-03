import { Component } from '@angular/core';
import { Inject, Renderer2 } from '@angular/core';
import { OnInit } from '@angular/core';
import { ChartDataService } from '../../services/chart-data.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit {
  pairs: string[] = [];
  isDarkMode: boolean = false;
  isSidebarVisible: boolean = true;
  selectedPairs: string[] = [];

  constructor(
    @Inject(ChartDataService) private chartDataService: ChartDataService,
    private renderer: Renderer2
  ) {}

  ngOnInit(): void {
    // Initialize theme
    const savedTheme = localStorage.getItem('theme');
    this.isDarkMode = savedTheme === 'dark';
    if (this.isDarkMode) {
      this.renderer.addClass(document.body, 'dark-mode');
    }

    // Retrieve selected pairs from localStorage
    const savedPairs = localStorage.getItem('selectedPairs');
    if (savedPairs) {
      this.selectedPairs = JSON.parse(savedPairs);
    }

    // Fetch available pairs
    this.chartDataService.getChartDumps().subscribe(
      (dumps: any) => {
        this.pairs = dumps.map((dump: string) => this.cleanPair(dump));
      },
      (error) => {
        console.error('Error fetching chart dumps:', error);
      }
    );
  }

  toggleDarkMode(isDark: boolean): void {
    this.isDarkMode = isDark;
    if (this.isDarkMode) {
      this.renderer.addClass(document.body, 'dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      this.renderer.removeClass(document.body, 'dark-mode');
      localStorage.setItem('theme', 'light');
    }
  }

  toggleSidebar(): void {
    this.isSidebarVisible = !this.isSidebarVisible;
  }

  togglePairSelection(pair: string): void {
    const index = this.selectedPairs.indexOf(pair);
    if (index > -1) {
      this.selectedPairs.splice(index, 1);
    } else {
      this.selectedPairs.push(pair);
    }
    localStorage.setItem('selectedPairs', JSON.stringify(this.selectedPairs));
  }

  cleanPair(pair: string): string {
    if (!pair) {
      return '';
    }
    return pair.replace(/[^a-zA-Z0-9]/g, '');
  }
}
