import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink
  ]
})
export class ForgotPasswordComponent implements OnInit {
  forgotPasswordForm!: FormGroup;
  submitted = false;
  emailSent = false;
  error = '';
  isLoading = false;

  constructor(
    private formBuilder: FormBuilder,
    public router: Router,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.forgotPasswordForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  get f() { return this.forgotPasswordForm.controls; }

  onSubmit(): void {
    this.submitted = true;
    this.error = '';

    if (this.forgotPasswordForm.invalid) {
      return;
    }

    this.isLoading = true;
    
    this.authService.forgotPassword(this.forgotPasswordForm.value.email)
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          this.emailSent = true;
        },
        error: (err) => {
          this.isLoading = false;
          this.error = err.error?.message || 'An error occurred. Please try again.';
        }
      });
  }
} 