import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http'; // Import HttpClientModule
import { ChartDataService } from './chart-data.service';

import { AppComponent } from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, HttpClientModule], // Add HttpClientModule to the imports array
  providers: [ChartDataService],
  bootstrap: [AppComponent],
})
export class AppModule {}
