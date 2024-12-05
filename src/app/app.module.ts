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
import { HomeComponent } from './components/home/home.component';
import { ExecutionLogComponent } from './components/home/chart/execution-log/execution-log.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { PasswordResetComponent } from './components/password-reset/password-reset.component';
import { AuthModule } from '@auth0/auth0-angular';

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    SidebarComponent,
    ChartComponent,
    LoginComponent,
    HomeComponent,
    ExecutionLogComponent,
    PasswordResetComponent,
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    AppRoutingModule,
    MatDialogModule,
    BrowserAnimationsModule,
    AuthModule.forRoot({
      domain: 'dev-mfwwo0cbjxx7h6of.us.auth0.com',
      clientId: 'GWune1Mzn80V42cTUrSYprKSmuHQbyMY',
      authorizationParams: {
        redirect_uri: window.location.origin, // Use redirect_uri here
      },
    }),
  ],
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
