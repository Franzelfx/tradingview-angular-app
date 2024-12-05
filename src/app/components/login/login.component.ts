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

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      // Update form states based on query params
      this.isSignUp = params['signUp'] === 'true';
      this.isPasswordReset = params['reset'] === 'true';
      this.isPasswordResetConfirm = false;

      // Clear any existing messages
      this.clearMessages();

      if (params['token']) {
        this.isPasswordResetConfirm = true;
        this.resetToken = params['token'];
      }

      if (params['verify']) {
        this.handleEmailVerification(params['verify']);
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
        this.resetConfirmMessage =
          'Your password has been reset successfully. Please sign in.';
        // Reset the component state to show the sign-in form
        this.isPasswordResetConfirm = false;
        this.isPasswordReset = false;
        this.isSignUp = false;
        this.newPassword = '';
        this.confirmPassword = '';
        this.resetToken = '';
        // Display a success message on the sign-in form
        this.loginSuccessMessage =
          'Your password has been reset successfully. Please sign in.';
      }
    } catch (error) {
      console.error('Password reset error:', error);
      this.resetConfirmError = 'Failed to reset password. Please try again.';
      this.resetConfirmMessage = '';
    }
  }

  // Handle Email Verification
  async handleEmailVerification(token: string): Promise<void> {
    try {
      const errorMessage = await this.authService.verifyEmail(token);
      if (errorMessage) {
        this.verificationError = errorMessage;
        this.verificationMessage = '';
      } else {
        this.verificationError = '';
        this.verificationMessage = 'Your email has been verified successfully.';
      }
    } catch (error) {
      console.error('Email verification error:', error);
      this.verificationError = 'Failed to verify email. Please try again.';
      this.verificationMessage = '';
    }
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

  // Social login methods (optional)
  loginWithGoogle(): void {
    // Implement Google login functionality here
  }

  loginWithFacebook(): void {
    // Implement Facebook login functionality here
  }
}
