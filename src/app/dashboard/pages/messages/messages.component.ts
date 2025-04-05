import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-messages',
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class MessagesComponent {
  newMessage: string = '';
  
  conversations = [
    {
      id: 1,
      name: 'Nguyễn Văn A',
      avatar: 'assets/images/avatar-placeholder.jpg',
      lastMessage: 'Chào bạn, bạn khỏe không?',
      lastMessageTime: '10:30 AM',
      unread: true,
      isOnline: true
    },
    {
      id: 2,
      name: 'Trần Thị B',
      avatar: 'assets/images/avatar-placeholder.jpg',
      lastMessage: 'Hẹn gặp lại bạn vào tuần sau nhé!',
      lastMessageTime: 'Hôm qua',
      unread: false,
      isOnline: false
    },
    {
      id: 3,
      name: 'Phạm Văn C',
      avatar: 'assets/images/avatar-placeholder.jpg',
      lastMessage: 'Cảm ơn bạn đã giúp đỡ',
      lastMessageTime: 'Thứ 2',
      unread: false,
      isOnline: true
    }
  ];
  
  selectedConversation = this.conversations[0];
  
  messages = [
    {
      id: 1,
      senderId: 1,
      text: 'Chào bạn, bạn khỏe không?',
      time: '10:30 AM',
      isOutgoing: false
    },
    {
      id: 2,
      senderId: 'me',
      text: 'Chào bạn, mình khỏe cảm ơn bạn. Còn bạn thì sao?',
      time: '10:32 AM',
      isOutgoing: true
    },
    {
      id: 3,
      senderId: 1,
      text: 'Mình cũng khỏe. Mình đang tìm hiểu về Aley, ứng dụng này có vẻ rất thú vị.',
      time: '10:33 AM',
      isOutgoing: false
    }
  ];
  
  constructor() { }
  
  selectConversation(conversation: any) {
    this.selectedConversation = conversation;
    
    // Mark as read when selected
    if (conversation.unread) {
      conversation.unread = false;
    }
  }
  
  sendMessage() {
    if (this.newMessage.trim() === '') return;
    
    // Add to messages
    this.messages.push({
      id: this.messages.length + 1,
      senderId: 'me',
      text: this.newMessage,
      time: this.formatTime(new Date()),
      isOutgoing: true
    });
    
    // Clear input
    this.newMessage = '';
    
    // Scroll to bottom of chat
    setTimeout(() => {
      const chatContainer = document.querySelector('.chat-messages');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 0);
  }
  
  formatTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
} 