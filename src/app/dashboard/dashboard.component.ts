import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet
  ]
})
export class DashboardComponent implements OnInit {
  user: any = null;
  
  constructor(
    private authService: AuthService,
    public router: Router
  ) { }
  
  ngOnInit(): void {
    this.authService.currentUser.subscribe(user => {
      this.user = user;
    });
    
    this.loadUserProfile();
  }
  
  loadUserProfile(): void {
    this.authService.getProfile().subscribe();
  }
  
  logout(): void {
    this.authService.logout();
  }
} 