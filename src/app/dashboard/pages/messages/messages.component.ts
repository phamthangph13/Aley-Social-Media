import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessagesService } from '../../../core/services/messages.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-messages',
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class MessagesComponent implements OnInit {
  newMessage: string = '';
  showNewConversationModal: boolean = false;
  potentialRecipients: any[] = [];
  selectedRecipient: any = null;
  newConversationMessage: string = '';
  
  conversations: any[] = [];
  selectedConversation: any = null;
  messages: any[] = [];
  loading: boolean = true;
  sendingMessage: boolean = false;
  currentUserId: string = '';
  
  constructor(
    private messagesService: MessagesService,
    private authService: AuthService
  ) { }
  
  ngOnInit(): void {
    // Tải thông tin người dùng hiện tại trước
    this.refreshUserInfo();
  }
  
  refreshUserInfo(): void {
    // Đầu tiên thử lấy từ localStorage
    this.currentUserId = this.authService.getCurrentUserId();
    
    // Nếu không có, refresh từ server
    if (!this.currentUserId) {
      this.authService.refreshCurrentUser().subscribe({
        next: (user) => {
          if (user) {
            this.currentUserId = this.authService.getCurrentUserId();
          }
          // Sau khi có thông tin người dùng, mới tải cuộc trò chuyện
          this.loadConversations();
        },
        error: (error) => {
          console.error('Error refreshing user info:', error);
          // Vẫn tải cuộc trò chuyện ngay cả khi có lỗi
          this.loadConversations();
        }
      });
    } else {
      // Nếu đã có userId, tải cuộc trò chuyện trực tiếp
      this.loadConversations();
    }
  }
  
  loadConversations(): void {
    this.loading = true;
    this.messagesService.getConversations().subscribe({
      next: (response) => {
        this.conversations = response.data;
        this.loading = false;
        
        // Chọn cuộc trò chuyện đầu tiên nếu có
        if (this.conversations.length > 0 && !this.selectedConversation) {
          this.selectConversation(this.conversations[0]);
        }
      },
      error: (error) => {
        console.error('Error loading conversations:', error);
        this.loading = false;
      }
    });
  }
  
  selectConversation(conversation: any): void {
    this.selectedConversation = conversation;
    this.loadMessages(conversation.id);
    
    // Mark as read when selected (UI update)
    if (conversation.unread) {
      conversation.unread = false;
    }
  }
  
  // Force correct display regardless of data from backend
  private manuallyAssignOutgoingStatus(messages: any[], myId: string): any[] {
    if (!messages || !messages.length) return [];
    
    const senderIds = messages.map(m => m.senderId).filter((v, i, a) => a.indexOf(v) === i);
    console.log('Unique senderIds in conversation:', senderIds);
    
    // If we have exactly 2 unique senders (typical for 1:1 chat)
    if (senderIds.length === 2) {
      // Find my ID, or the ID that appears in more recent messages (more likely to be me)
      let myProbableId = myId;
      
      // If we can't reliably determine my ID, use the sender of the last message
      if (!myProbableId) {
        const latestMessages = [...messages].sort((a, b) => {
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });
        
        if (latestMessages.length > 0) {
          myProbableId = latestMessages[0].senderId;
        }
      }
      
      // Assign outgoing status based on determined ID
      return messages.map(message => {
        message.isOutgoing = message.senderId === myProbableId;
        return message;
      });
    }
    
    return messages;
  }

  loadMessages(conversationId: string): void {
    this.loading = true;
    this.messagesService.getMessages(conversationId).subscribe({
      next: (response) => {
        console.log('Current user ID:', this.currentUserId);
        console.log('Messages before processing:', JSON.stringify(response.data));
        
        // Kiểm tra và đặt lại thuộc tính isOutgoing cho mỗi tin nhắn
        let messages = response.data.map((message: any) => {
          if (this.currentUserId) {
            // Đảm bảo so sánh string với string
            const senderId = typeof message.senderId === 'object' ? message.senderId._id : message.senderId;
            const currentUserId = this.currentUserId;
            
            console.log(`Message ${message.id}: senderId=${senderId}, currentUserId=${currentUserId}`);
            message.isOutgoing = senderId === currentUserId;
          }
          return message;
        });
        
        // Áp dụng giải pháp dự phòng nếu cần
        if (!this.currentUserId || this.messages.some(m => m.isOutgoing === undefined)) {
          console.log('Applying fallback solution for message display');
          messages = this.manuallyAssignOutgoingStatus(messages, this.currentUserId);
        }
        
        console.log('Messages after processing:', JSON.stringify(messages));
        this.messages = messages;
        this.loading = false;
        
        // Scroll to bottom of chat
        setTimeout(() => {
          this.scrollToBottom();
        }, 0);
      },
      error: (error) => {
        console.error('Error loading messages:', error);
        this.loading = false;
      }
    });
  }
  
  sendMessage(): void {
    if (this.newMessage.trim() === '' || !this.selectedConversation) return;
    
    this.sendingMessage = true;
    
    this.messagesService.sendMessage(this.selectedConversation.id, this.newMessage).subscribe({
      next: (response) => {
        // Add the new message to the messages array
        const newMessage = response.data;
        // Đảm bảo tin nhắn mới gửi luôn được đánh dấu là outgoing
        newMessage.isOutgoing = true;
        this.messages.push(newMessage);
        
        // Clear input
        this.newMessage = '';
        
        // Update conversation's last message
        this.selectedConversation.lastMessage = newMessage.text;
        this.selectedConversation.lastMessageTime = newMessage.time;
        
        // Scroll to bottom of chat
        setTimeout(() => {
          this.scrollToBottom();
        }, 0);
        
        this.sendingMessage = false;
      },
      error: (error) => {
        console.error('Error sending message:', error);
        this.sendingMessage = false;
      }
    });
  }
  
  scrollToBottom(): void {
    const chatContainer = document.querySelector('.chat-messages');
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }
  
  openNewConversationModal(): void {
    this.showNewConversationModal = true;
    this.loadPotentialRecipients();
  }
  
  closeNewConversationModal(): void {
    this.showNewConversationModal = false;
    this.selectedRecipient = null;
    this.newConversationMessage = '';
  }
  
  loadPotentialRecipients(): void {
    this.messagesService.getPotentialRecipients().subscribe({
      next: (response) => {
        this.potentialRecipients = response.data;
      },
      error: (error) => {
        console.error('Error loading potential recipients:', error);
      }
    });
  }
  
  selectRecipient(recipient: any): void {
    this.selectedRecipient = recipient;
  }
  
  createNewConversation(): void {
    if (!this.selectedRecipient || this.newConversationMessage.trim() === '') return;
    
    this.sendingMessage = true;
    
    this.messagesService.createConversation(
      this.selectedRecipient.id,
      this.newConversationMessage
    ).subscribe({
      next: (response) => {
        // Add the new conversation to the conversations array
        this.conversations.unshift(response.data.conversation);
        
        // Select the new conversation
        this.selectConversation(response.data.conversation);
        
        // Close the modal
        this.closeNewConversationModal();
        
        this.sendingMessage = false;
      },
      error: (error) => {
        console.error('Error creating conversation:', error);
        this.sendingMessage = false;
      }
    });
  }
} 