import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  // Sign-in form properties
  username: string = '';
  password: string = '';
  loginError: string = '';

  // Sign-up form properties
  signupName: string = '';
  signupEmail: string = '';
  signupPassword: string = '';
  signupError: string = '';
  signupSuccessMessage: string = '';

  // Password reset form properties
  resetEmail: string = '';
  resetError: string = '';
  resetMessage: string = '';

  // Control which form is displayed
  isSignUp: boolean = false;
  isPasswordReset: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Read query parameters to restore state
    this.route.queryParams.subscribe((params) => {
      this.isSignUp = params['signUp'] === 'true';
      this.isPasswordReset = params['reset'] === 'true';
    });
  }

  // Toggle to Sign In form
  onSignInClick(): void {
    this.isSignUp = false;
    this.isPasswordReset = false;
    this.router.navigate([], { queryParams: {} }); // Clear query params
  }

  // Toggle to Sign Up form
  onSignUpClick(): void {
    this.isSignUp = true;
    this.isPasswordReset = false;
    this.router.navigate([], { queryParams: { signUp: true } });
  }

  // Toggle to Password Reset form
  onForgotPassword(): void {
    this.isSignUp = false;
    this.isPasswordReset = true;
    this.router.navigate([], { queryParams: { reset: true } });
  }

  // Handle Sign In form submission
  async onSignInSubmit(): Promise<void> {
    if (this.username && this.password) {
      try {
        const errorMessage = await this.authService.login(
          this.username,
          this.password
        );
        if (errorMessage) {
          this.loginError = errorMessage;
        } else {
          this.loginError = '';
          this.router.navigate(['/']);
        }
      } catch (error) {
        console.error('Login error:', error);
        this.loginError = 'An unexpected error occurred during login.';
      }
    }
  }

  // Handle Sign Up form submission
  async onSignUpSubmit(): Promise<void> {
    if (this.signupName && this.signupEmail && this.signupPassword) {
      try {
        const errorMessage = await this.authService.register(
          this.signupName,
          this.signupEmail,
          this.signupPassword
        );
        if (errorMessage) {
          this.signupError = errorMessage;
          this.signupSuccessMessage = '';
        } else {
          this.signupError = '';
          this.signupSuccessMessage =
            'Registration successful. Please check your email to verify your account.';
        }
      } catch (error) {
        console.error('Sign-up error:', error);
        this.signupError = 'An unexpected error occurred during registration.';
        this.signupSuccessMessage = '';
      }
    }
  }

  // Handle Password Reset form submission
  async onPasswordResetSubmit(event: Event): Promise<void> {
    event.preventDefault(); // Prevent default form submission behavior
    if (this.resetEmail) {
      try {
        const errorMessage = await this.authService.requestPasswordReset(
          this.resetEmail
        );
        if (errorMessage) {
          this.resetError = errorMessage;
          this.resetMessage = '';
        } else {
          this.resetError = '';
          this.resetMessage =
            'Password reset email sent. Please check your inbox.';
        }
      } catch (error) {
        console.error('Password reset request error:', error);
        this.resetError =
          'Failed to send password reset email. Please try again.';
        this.resetMessage = '';
      }
    }
  }

  // Social login methods (optional)
  loginWithGoogle(): void {
    // Implement Google login functionality here
  }

  loginWithFacebook(): void {
    // Implement Facebook login functionality here
  }
}
