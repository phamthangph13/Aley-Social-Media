import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-verify-email',
  templateUrl: './verify-email.component.html',
  styleUrls: ['./verify-email.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink
  ]
})
export class VerifyEmailComponent implements OnInit {
  token = '';
  loading = false;
  verified = false;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['token']) {
        this.token = params['token'];
        this.verifyEmail();
      }
    });
  }

  verifyEmail(): void {
    this.loading = true;
    this.error = '';

    this.authService.verifyEmail(this.token).subscribe({
      next: (response) => {
        this.loading = false;
        this.verified = true;
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 3000);
      },
      error: (error) => {
        this.loading = false;
        this.error = error.error?.message || 'Failed to verify email. Please try again.';
      }
    });
  }
} 