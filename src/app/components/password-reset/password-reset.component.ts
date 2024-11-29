// src/app/components/password-reset/password-reset.component.ts

import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-password-reset',
  templateUrl: './password-reset.component.html',
  styleUrls: ['./password-reset.component.css'],
})
export class PasswordResetComponent {
  resetEmail: string = '';
  resetMessage: string = '';
  resetError: string = '';

  constructor(private authService: AuthService) {}

  async onPasswordResetSubmit(): Promise<void> {
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
}
