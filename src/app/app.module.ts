// src/app/app.module.ts

import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http'; // Import HTTP_INTERCEPTORS
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { HeaderComponent } from './components/home/header/header.component';
import { SidebarComponent } from './components/home/sidebar/sidebar.component';
import { ChartComponent } from './components/home/chart/chart.component';
import { LoginComponent } from './components/login/login.component';

import { AppRoutingModule } from './app-routing.module';
// Removed direct imports of AuthService, ChartDataService, and AuthGuard from providers
// because they are already providedIn: 'root'

import { AuthInterceptor } from './interceptors/auth.interceptor';
import { HomeComponent } from './components/home/home.component'; // Import AuthInterceptor

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    SidebarComponent,
    ChartComponent,
    LoginComponent,
    HomeComponent,
  ],
  imports: [BrowserModule, HttpClientModule, FormsModule, AppRoutingModule],
  providers: [
    {
      provide: HTTP_INTERCEPTORS, // Register the AuthInterceptor
      useClass: AuthInterceptor,
      multi: true, // Allows multiple interceptors
    },
    // Removed AuthService, ChartDataService, and AuthGuard from providers
    // since they are already provided in 'root' via @Injectable
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
