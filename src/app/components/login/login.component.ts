// login.component.ts
import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  username: string = '';
  password: string = '';
  loginFailed: boolean = false;

  constructor(private authService: AuthService) {}

  async onSubmit(): Promise<void> {
    if (this.username && this.password) {
      try {
        const success = await this.authService.login(
          this.username,
          this.password
        );
        if (success) {
          // Handle successful login, e.g., navigate to dashboard
          this.loginFailed = false;
        } else {
          // Handle failed login
          this.loginFailed = true;
        }
      } catch (error) {
        // Handle errors (e.g., network issues)
        console.error('Login error:', error);
        this.loginFailed = true;
      }
    }
  }

  loginWithGoogle(): void {

  }

  loginWithFacebook(): void {

  }
}
