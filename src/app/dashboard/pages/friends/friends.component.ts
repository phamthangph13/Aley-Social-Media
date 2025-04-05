import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-friends',
  templateUrl: './friends.component.html',
  styleUrls: ['./friends.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class FriendsComponent {
  friendRequests = [
    { id: 1, name: 'Nguyễn Văn A', avatar: 'assets/images/avatar-placeholder.jpg', mutualFriends: 5 },
    { id: 2, name: 'Trần Thị B', avatar: 'assets/images/avatar-placeholder.jpg', mutualFriends: 2 }
  ];
  
  friendsList = [
    { id: 3, name: 'Phạm Văn C', avatar: 'assets/images/avatar-placeholder.jpg', isOnline: true },
    { id: 4, name: 'Lê Thị D', avatar: 'assets/images/avatar-placeholder.jpg', isOnline: false },
    { id: 5, name: 'Hoàng Văn E', avatar: 'assets/images/avatar-placeholder.jpg', isOnline: true }
  ];
  
  constructor() { }
  
  acceptRequest(id: number) {
    console.log('Accept friend request:', id);
    // Implementation would go here
  }
  
  rejectRequest(id: number) {
    console.log('Reject friend request:', id);
    // Implementation would go here
  }
} 