// src/app/components/home/home.component.ts

import { Component, OnInit } from '@angular/core';
import { ChartDataService } from '../../services/chart-data.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit {
  // Always dark mode by default
  isDarkMode: boolean = true;

  constructor(private chartDataService: ChartDataService) {}

  ngOnInit(): void {
    // Optionally, test API call here.
    this.chartDataService.getModelBars('EURUSD', 2000).subscribe(
      (data: any) => {
        console.log('Model Bars data:', data);
      },
      (error: any) => {
        console.error('Error fetching model bars:', error);
      }
    );
  }
}
