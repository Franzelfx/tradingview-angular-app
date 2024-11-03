// src/app/components/login/login.component.ts
import {
  Component,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { AnimeInstance } from 'animejs';
import * as anime from 'animejs';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements AfterViewInit, OnDestroy {
  username: string = '';
  password: string = '';
  loginFailed: boolean = false;

  @ViewChild('emailInput') emailInput!: ElementRef;
  @ViewChild('passwordInputField') passwordInputField!: ElementRef;
  @ViewChild('submitButton') submitButton!: ElementRef;
  @ViewChild('svgPath') svgPath!: ElementRef<SVGPathElement>;

  private currentAnimation: AnimeInstance | null = null;

  constructor(private authService: AuthService) {}

  async onSubmit(): Promise<void> {
    if (this.username && this.password) {
      try {
        const success = await this.authService.login(
          this.username,
          this.password
        );
        this.loginFailed = !success;
        // Navigate on success if required
      } catch (error) {
        console.error('Login error:', error);
        this.loginFailed = true;
      }
    }
  }

  loginWithGoogle(): void {
    // Implement Google login
  }

  loginWithFacebook(): void {
    // Implement Facebook login
  }

  ngAfterViewInit(): void {
    const path = this.svgPath.nativeElement;

    const animatePath = (offset: number, dasharray: string) => {
      if (this.currentAnimation) this.currentAnimation.pause();
      this.currentAnimation = anime({
        targets: path,
        strokeDashoffset: {
          value: offset,
          duration: 700,
          easing: 'easeOutQuart',
        },
        strokeDasharray: {
          value: dasharray,
          duration: 700,
          easing: 'easeOutQuart',
        },
      });
    };

    this.emailInput.nativeElement.addEventListener('focus', () => {
      animatePath(0, '240 1386');
    });

    this.passwordInputField.nativeElement.addEventListener('focus', () => {
      animatePath(-336, '240 1386');
    });

    this.submitButton.nativeElement.addEventListener('focus', () => {
      animatePath(-730, '530 1386');
    });
  }

  ngOnDestroy(): void {
    if (this.currentAnimation) this.currentAnimation.pause();
  }
}
