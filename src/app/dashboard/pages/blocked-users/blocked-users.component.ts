import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BlockService, BlockedUser } from '../../../services/block.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-blocked-users',
  templateUrl: './blocked-users.component.html',
  styleUrls: ['./blocked-users.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class BlockedUsersComponent implements OnInit {
  blockedUsers: BlockedUser[] = [];
  isLoading = true;
  error: string | null = null;

  constructor(
    private blockService: BlockService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadBlockedUsers();
  }

  loadBlockedUsers(): void {
    this.isLoading = true;
    this.blockService.getBlockedUsers().subscribe({
      next: (response) => {
        this.blockedUsers = response.blockedUsers;
        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'Không thể tải danh sách người dùng bị chặn';
        this.isLoading = false;
        console.error('Error loading blocked users:', err);
      }
    });
  }

  unblockUser(userId: string): void {
    this.blockService.unblockUser(userId).subscribe({
      next: () => {
        // Remove user from the list
        this.blockedUsers = this.blockedUsers.filter(user => user.id !== userId);
      },
      error: (err) => {
        console.error('Error unblocking user:', err);
        // Show an error message
        alert('Không thể bỏ chặn người dùng này. Vui lòng thử lại sau.');
      }
    });
  }

  viewProfile(userId: string): void {
    this.router.navigate(['/dashboard/user', userId]);
  }
} 