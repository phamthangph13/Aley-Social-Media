import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessagesService } from '../../../core/services/messages.service';
import { AuthService } from '../../../core/services/auth.service';
import { SocketService } from '../../../core/services/socket.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-messages',
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class MessagesComponent implements OnInit, OnDestroy {
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
  
  private socketSubscription: Subscription = new Subscription();
  
  constructor(
    private messagesService: MessagesService,
    private authService: AuthService,
    private socketService: SocketService
  ) { 
    // Thử kết nối lại socket khi component được khởi tạo
    this.socketService.reconnect();
  }
  
  ngOnInit(): void {
    // Đảm bảo lấy đúng ID người dùng từ service
    this.refreshUserInfo();
    
    // Subscribe to real-time messages
    this.socketSubscription = this.socketService.getMessages().subscribe(data => {
      console.log('Received real-time message in component:', data);
      
      // Handle the message based on whether we're viewing the conversation
      if (data.conversationId && this.selectedConversation?.id === data.conversationId) {
        console.log('Adding message to current conversation');
        // If user is currently viewing this conversation, add the message
        if (data.message) {
          // Đặt isOutgoing = false cho tin nhắn nhận được qua socket
          const message = {...data.message, isOutgoing: false};
          console.log('Modified received message:', message);
          
          // Add message to list
          this.messages.push(message);
          
          // Also update the conversation's last message in the list
          this.updateConversationWithNewMessage(data.conversationId, message);
          
          // Scroll to bottom
          setTimeout(() => {
            this.scrollToBottom();
          }, 0);
        }
      } else {
        console.log('Updating conversation list for new message');
        // Update the conversation list to show new message
        this.loadConversations();
      }
    });
  }
  
  ngOnDestroy(): void {
    if (this.socketSubscription) {
      this.socketSubscription.unsubscribe();
    }
  }
  
  refreshUserInfo(): void {
    // Lấy ID người dùng từ AuthService
    this.currentUserId = this.authService.getCurrentUserId();
    console.log('Current user ID in refreshUserInfo:', this.currentUserId);
    
    // Nếu không có ID, refresh từ server
    if (!this.currentUserId) {
      this.authService.refreshCurrentUser().subscribe({
        next: (user) => {
          if (user) {
            this.currentUserId = this.authService.getCurrentUserId();
            console.log('User ID after refresh:', this.currentUserId);
          }
          // Tải cuộc trò chuyện sau khi có ID
          this.loadConversations();
        },
        error: (error) => {
          console.error('Error refreshing user info:', error);
          this.loadConversations();
        }
      });
    } else {
      // Đã có ID, tải cuộc trò chuyện
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
    if (!this.newMessage.trim() || !this.selectedConversation) return;
    
    this.sendingMessage = true;
    const conversationId = this.selectedConversation.id;
    const messageText = this.newMessage;
    const recipientId = this.selectedConversation.userId;
    
    this.messagesService.sendMessage(conversationId, messageText).subscribe({
      next: (response) => {
        console.log('Message sent successfully:', response);
        // Add message to the list
        if (response.success && response.data) {
          this.messages.push(response.data);
          
          // Let's also update the selected conversation's last message
          this.selectedConversation.lastMessage = response.data.text;
          this.selectedConversation.lastMessageTime = response.data.time;
          
          // Update the conversation in the list
          const convIndex = this.conversations.findIndex(c => c.id === this.selectedConversation.id);
          if (convIndex !== -1) {
            this.conversations[convIndex] = { ...this.selectedConversation };
            // Move this conversation to the top of the list
            this.conversations.splice(0, 0, this.conversations.splice(convIndex, 1)[0]);
          }
          
          // Gửi tin nhắn qua socket để người nhận cập nhật real-time
          if (recipientId) {
            console.log('Sending message via socket to recipient:', recipientId);
            this.socketService.sendMessage(recipientId, {
              ...response.data,
              conversationId: conversationId
            });
          }
          
          // Clear input and scroll to bottom
          this.newMessage = '';
          setTimeout(() => {
            this.scrollToBottom();
          }, 0);
        }
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
  
  // Helper method to update a conversation with a new message
  private updateConversationWithNewMessage(conversationId: string, message: any): void {
    const index = this.conversations.findIndex(c => c.id === conversationId);
    if (index !== -1) {
      // Update the conversation
      this.conversations[index].lastMessage = message.text;
      this.conversations[index].lastMessageTime = message.time;
      this.conversations[index].unread = true;
      
      // Move to top of list
      if (index > 0) {
        const conversation = this.conversations[index];
        this.conversations.splice(index, 1);
        this.conversations.unshift(conversation);
      }
    }
  }
} 