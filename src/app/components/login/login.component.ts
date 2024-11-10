// src/app/components/login/login.component.ts
import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  // Sign-in form properties
  username: string = '';
  password: string = '';
  loginFailed: boolean = false;

  // Sign-up form properties
  signupName: string = '';
  signupEmail: string = '';
  signupPassword: string = '';

  // Control which panel is active
  isSignUp: boolean = false;

  constructor(private authService: AuthService) {}

  // Toggle to Sign In form
  onSignInClick(): void {
    this.isSignUp = false;
  }

  // Toggle to Sign Up form
  onSignUpClick(): void {
    this.isSignUp = true;
  }

  // Handle Sign In form submission
  async onSignInSubmit(): Promise<void> {
    if (this.username && this.password) {
      try {
        const success = await this.authService.login(
          this.username,
          this.password
        );
        this.loginFailed = !success;
        // Navigate to another page if login is successful
      } catch (error) {
        console.error('Login error:', error);
        this.loginFailed = true;
      }
    }
  }

  // Handle Sign Up form submission
  async onSignUpSubmit(): Promise<void> {
    if (this.signupName && this.signupEmail && this.signupPassword) {
      try {
        // Implement sign-up functionality
        // e.g., await this.authService.signup(this.signupName, this.signupEmail, this.signupPassword);
        // After successful sign-up, you might want to log the user in or navigate to another page
      } catch (error) {
        console.error('Sign-up error:', error);
        // Handle sign-up errors
      }
    }
  }

  // Social login methods
  loginWithGoogle(): void {
    // Implement Google login
  }

  loginWithFacebook(): void {
    // Implement Facebook login
  }
}
