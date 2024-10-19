import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http'; // Import HttpClientModule
import { ChartDataService } from './chart-data.service';
import { FormsModule } from '@angular/forms';
import { AppComponent } from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, HttpClientModule, FormsModule], // Add HttpClientModule to imports
  providers: [ChartDataService],
  bootstrap: [AppComponent],
})
export class AppModule {}
