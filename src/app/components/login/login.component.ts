import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router, ActivatedRoute } from '@angular/router';
import { Injector } from '@angular/core';

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
  loginSuccessMessage: string = '';

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

  // Password reset confirmation properties
  isPasswordResetConfirm: boolean = false;
  resetToken: string = '';
  newPassword: string = '';
  confirmPassword: string = '';
  resetConfirmError: string = '';
  resetConfirmMessage: string = '';

  // Email verification properties
  verificationError: string = '';
  verificationMessage: string = '';

  // Control which form is displayed
  isSignUp: boolean = false;
  isPasswordReset: boolean = false;
  verificationComplete: boolean = false; // State to show the confirmation screen

  public auth0Service: any; // Declare Auth0Service dynamically

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private injector: Injector // Use Angular Injector
  ) {
    const isSecureOrigin =
      window.location.protocol === 'https:' ||
      window.location.hostname === 'localhost';

    if (isSecureOrigin) {
      try {
        // Dynamically resolve Auth0Service
        this.auth0Service = this.injector.get('Auth0Service');
        console.log('Auth0Service initialized:', this.auth0Service);
      } catch (error) {
        console.error('Error initializing Auth0Service:', error);
      }
    } else {
      console.warn(
        'Auth0Service not initialized. Application must run on a secure origin (HTTPS or localhost).'
      );
    }
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      console.log('Query params:', params); // Log the query params for debugging

      this.isSignUp = params['signUp'] === 'true';
      this.isPasswordReset = params['reset'] === 'true';
      this.isPasswordResetConfirm = false;

      // Clear existing messages
      this.clearMessages();

      if (params['token'] && !params['reset']) {
        console.log('Handling email verification...');
        this.handleEmailVerification(params['token']);
      } else if (params['token'] && params['reset']) {
        console.log('Handling password reset...');
        this.isPasswordResetConfirm = true;
        this.resetToken = params['token'];
      }
    });
  }

  // Toggle to Sign In form
  onSignInClick(): void {
    this.isSignUp = false;
    this.isPasswordReset = false;
    this.isPasswordResetConfirm = false;
    this.clearMessages();
    // Update URL without query params
    this.router.navigate([], { queryParams: {} });
  }

  // Toggle to Sign Up form
  // Optionally, remove navigation in click handlers
  onSignUpClick(): void {
    this.isSignUp = true;
    this.isPasswordReset = false;
    this.isPasswordResetConfirm = false;
    this.clearMessages();
    // Log the state of the form in the URL
    console.log('Sign-up form displayed');
    // Remove or comment out the navigation
    // this.router.navigate([], { queryParams: { signUp: true } });
  }

  // Toggle to Password Reset form
  onForgotPassword(): void {
    this.isSignUp = false;
    this.isPasswordReset = true;
    this.isPasswordResetConfirm = false;
    this.clearMessages();
    // Update URL with reset query param
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
          this.loginSuccessMessage = '';
        } else {
          this.loginError = '';
          this.loginSuccessMessage = '';
          this.router.navigate(['/']);
        }
      } catch (error) {
        console.error('Login error:', error);
        this.loginError = 'An unexpected error occurred during login.';
        this.loginSuccessMessage = '';
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
          this.signupSuccessMessage = ''; // Clear success message
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

  // Handle Password Reset Confirmation form submission
  async onPasswordResetConfirmSubmit(): Promise<void> {
    if (this.newPassword !== this.confirmPassword) {
      this.resetConfirmError = 'Passwords do not match.';
      return;
    }

    try {
      const errorMessage = await this.authService.resetPassword(
        this.resetToken,
        this.newPassword
      );
      if (errorMessage) {
        this.resetConfirmError = errorMessage;
        this.resetConfirmMessage = '';
      } else {
        this.resetConfirmError = '';
        this.resetConfirmMessage = 'Your password has been reset successfully.';
      }
    } catch (error) {
      console.error('Password reset error:', error);
      this.resetConfirmError =
        'An unexpected error occurred. Please try again.';
    }
  }

  // Handle Email Verification
  async handleEmailVerification(token: string): Promise<void> {
    try {
      const result = await this.authService.verifyEmail(token);
      console.log('Verification result:', result); // Log the response for debugging

      if (result?.message === 'Email verified successfully') {
        this.verificationError = '';
        this.verificationMessage = result.message;
        this.verificationComplete = true; // Show the registration complete screen
      } else {
        this.verificationError = result.message || 'Verification failed.';
        this.verificationMessage = '';
      }
    } catch (error) {
      console.error('Email verification error:', error);
      this.verificationError = 'Failed to verify email. Please try again.';
      this.verificationMessage = '';
    }
  }

  // Navigate back to the login page
  navigateToLogin(): void {
    this.verificationComplete = false; // Reset the state
    this.router.navigate(['/login']); // Navigate to login route
  }

  // Clear all messages
  private clearMessages(): void {
    this.loginError = '';
    this.loginSuccessMessage = '';
    this.signupError = '';
    this.signupSuccessMessage = '';
    this.resetError = '';
    this.resetMessage = '';
    this.resetConfirmError = '';
    this.resetConfirmMessage = '';
    this.verificationError = '';
    this.verificationMessage = '';
  }

  loginWithGoogle(): void {
    if (!this.auth0Service) {
      console.error('Auth0Service is not initialized');
    } else {
      this.auth0Service.loginWithRedirect({
        authorizationParams: { connection: 'google-oauth2' },
      });
    }
  }

  loginWithGitHub(): void {
    if (!this.auth0Service) {
      console.error('Auth0Service is not initialized');
    } else {
      this.auth0Service.loginWithRedirect({
        authorizationParams: { connection: 'github' },
      });
    }
  }

  loginWithLinkedIn(): void {
    if (!this.auth0Service) {
      console.error('Auth0Service is not initialized');
    } else {
      this.auth0Service.loginWithRedirect({
        authorizationParams: { connection: 'linkedin' },
      });
    }
  }

  loginWithFacebook(): void {
    if (!this.auth0Service) {
      console.error('Auth0Service is not initialized');
    } else {
      this.auth0Service.loginWithRedirect({
        authorizationParams: { connection: 'facebook' },
      });
    }
  }
}
