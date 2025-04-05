import { Component, OnInit, OnDestroy, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessagesService } from '../../../core/services/messages.service';
import { AuthService } from '../../../core/services/auth.service';
import { SocketService } from '../../../core/services/socket.service';
import { Subscription } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

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
  socketConnected: boolean = false;
  
  private socketSubscription: Subscription = new Subscription();
  private connectionStatusSubscription: Subscription = new Subscription();
  
  constructor(
    private messagesService: MessagesService,
    private authService: AuthService,
    private socketService: SocketService,
    private route: ActivatedRoute,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) { 
    // Thử kết nối lại socket khi component được khởi tạo
    this.socketService.reconnect();
  }
  
  ngOnInit(): void {
    console.log('MessagesComponent initialized');
    // Đảm bảo lấy đúng ID người dùng từ service
    this.refreshUserInfo();
    
    // Theo dõi trạng thái kết nối socket
    this.connectionStatusSubscription = this.socketService.getConnectionStatus().subscribe(isConnected => {
      console.log('Socket connection status changed:', isConnected);
      this.socketConnected = isConnected;
      // Chỉ gọi detectChanges() khi trạng thái thực sự thay đổi
      if (this.socketConnected !== isConnected) {
        this.cdr.detectChanges();
      }
      
      // Nếu socket bị ngắt kết nối, thử kết nối lại sau 3 giây
      if (!isConnected) {
        setTimeout(() => {
          console.log('Auto-reconnecting socket...');
          this.socketService.reconnect();
        }, 3000);
      }
    });
    
    // Kiểm tra xem có yêu cầu tạo cuộc trò chuyện mới không
    this.route.queryParams.subscribe(params => {
      const newConversationUserId = params['newConversation'];
      if (newConversationUserId) {
        this.loadUserToStartConversation(newConversationUserId);
      }
    });
    
    console.log('Setting up socket message subscription');
    // Xử lý tin nhắn thời gian thực với debug cải tiến
    this.socketSubscription = this.socketService.getMessages().subscribe({
      next: (data) => {
        // Giảm bớt các log không cần thiết
        console.log('New message received via socket');
        
        // Log socket status để debug
        // this.logSocketStatus();
        
        // Sử dụng ngZone để đảm bảo Angular change detection được kích hoạt
        this.ngZone.run(() => {
          try {
            // Kiểm tra xem dữ liệu có đúng định dạng không
            if (!data || !data.message) {
              console.error('Received malformed socket message data:', data);
              return;
            }
            
            // Đảm bảo có conversation ID
            const conversationId = data.conversationId || 
              (data.message && data.message.conversationId) || 
              (data.message && data.message.id);
            
            if (!conversationId) {
              console.error('Missing conversation ID in socket message:', data);
              return;
            }
            
            // Xử lý tin nhắn thời gian thực đúng cách
            const newMessage = data.message;
            
            console.log('Processing message for conversation:', conversationId);
            console.log('Current user ID:', this.currentUserId);
            
            // Đảm bảo tin nhắn có senderId
            if (!newMessage.senderId) {
              // Nếu không có senderId, có thể tin nhắn này đến từ hệ thống hoặc định dạng khác
              console.log('Message has no senderId, attempting to recover');
              if (newMessage.sender && typeof newMessage.sender === 'object') {
                newMessage.senderId = newMessage.sender._id || newMessage.sender.id;
              }
            }
            
            console.log('Message sender ID:', typeof newMessage.senderId === 'object' ? 
                        (newMessage.senderId as any)._id || newMessage.senderId : newMessage.senderId);
            
            // Đảm bảo tin nhắn đến có trạng thái isOutgoing đúng
            // So sánh ID của người gửi với ID của người dùng hiện tại
            const senderId = typeof newMessage.senderId === 'object' ? 
                            ((newMessage.senderId as any)._id || newMessage.senderId) : newMessage.senderId;
            
            // Đảm bảo currentUserId là chuỗi để so sánh chính xác
            const currentId = typeof this.currentUserId === 'object' ? 
                            ((this.currentUserId as any)._id || this.currentUserId) : this.currentUserId;
            
            newMessage.isOutgoing = senderId === currentId;
            console.log('Message isOutgoing:', newMessage.isOutgoing, 'senderId:', senderId, 'currentId:', currentId);
            
            // Kiểm tra cả ID cuộc trò chuyện lẫn ObjectID
            const currentConversationId = this.selectedConversation?.id;
            const isCurrentConversation = 
                currentConversationId === conversationId || 
                // So sánh với các dạng ID có thể có
                (this.selectedConversation && 
                (this.selectedConversation._id === conversationId || 
                 conversationId.includes(this.selectedConversation.id))); 
            
            console.log('Is current conversation:', isCurrentConversation, 
                        'Current:', currentConversationId, 
                        'Message conversation:', conversationId);
            
            // 1. Xử lý tin nhắn cho cuộc trò chuyện hiện tại
            if (isCurrentConversation) {
              console.log('Adding new message to current conversation:', newMessage);
              
              // Xác định ID tin nhắn đúng cách
              const messageId = newMessage.id || newMessage._id;
              // Kiểm tra xem tin nhắn đã tồn tại trong danh sách chưa
              const existingMsg = messageId ? 
                  this.messages.find(m => {
                    const mId = m.id || (m as any)._id;
                    return mId === messageId || 
                           (m.text === newMessage.text && 
                            m.senderId === newMessage.senderId);
                  }) : null;
              
              if (!existingMsg) {
                // Format tin nhắn để hiển thị đúng
                const formattedMessage = {
                  ...newMessage,
                  id: messageId || `temp_${Date.now()}`,
                  text: newMessage.text || newMessage.content,
                  time: newMessage.time || new Date().toLocaleTimeString(),
                  isOutgoing: newMessage.isOutgoing
                };
                
                // Thêm tin nhắn mới vào danh sách và tạo một mảng mới để trigger change detection
                this.messages = [...this.messages, formattedMessage];
                console.log('Message added to conversation, new length:', this.messages.length);
                
                // Đánh dấu cuộc trò chuyện là đã đọc vì người dùng đang xem
                this.updateConversationWithNewMessage(conversationId, formattedMessage, false);
                
                // Cuộn xuống dưới để hiển thị tin nhắn mới
                setTimeout(() => {
                  this.scrollToBottom();
                  // Force Angular change detection
                  this.cdr.detectChanges();
                }, 0);
              } else {
                console.log('Message already exists in conversation, skipping');
              }
            } 
            // 2. Xử lý tin nhắn cho cuộc trò chuyện khác
            else {
              console.log('Updating other conversation with new message');
              // Cập nhật cuộc trò chuyện với tin nhắn mới và đánh dấu là chưa đọc
              this.updateConversationWithNewMessage(conversationId, newMessage, true);
              
              // Kiểm tra xem cuộc trò chuyện này đã được load trong danh sách chưa
              const conversationExists = this.conversations.some(c => c.id === conversationId);
              if (!conversationExists) {
                console.log('Conversation not in list, refreshing conversations');
                // Tải lại danh sách cuộc trò chuyện nếu cần
                this.loadConversations();
              } else {
                // Force refresh conversation list
                this.conversations = [...this.conversations];
                this.cdr.detectChanges();
              }
            }
            
            // Chỉ chạy detectChanges() một lần ở cuối thay vì nhiều lần trong quá trình xử lý
            this.cdr.detectChanges();
          } catch (error) {
            console.error('Error processing socket message in component:', error);
          }
        });
      },
      error: (error) => {
        console.error('Error in socket message subscription:', error);
      }
    });
    
    // Tải danh sách cuộc trò chuyện ngay khi component được khởi tạo
    this.loadConversations();
  }
  
  ngOnDestroy(): void {
    if (this.socketSubscription) {
      this.socketSubscription.unsubscribe();
    }
    if (this.connectionStatusSubscription) {
      this.connectionStatusSubscription.unsubscribe();
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
    
    // Giảm bớt log không cần thiết
    console.log('Sending message...');
    
    // Tạo bản sao của tin nhắn để thêm vào giao diện trước khi nhận phản hồi từ server
    // để đảm bảo giao diện cập nhật ngay lập tức
    const optimisticMessage = {
      id: 'temp_' + Date.now(),
      text: messageText,
      senderId: this.currentUserId,
      time: new Date().toLocaleTimeString(),
      conversationId: conversationId,
      isOutgoing: true
    };
    
    // Thêm tin nhắn vào giao diện ngay lập tức để UX tức thời
    this.messages = [...this.messages, optimisticMessage];
    
    // Xóa tin nhắn nhập
    this.newMessage = '';
    
    // Cập nhật UI chỉ một lần sau khi đã thực hiện tất cả thay đổi
    this.scrollToBottom();
    this.cdr.detectChanges();
    
    this.messagesService.sendMessage(conversationId, messageText).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          // Tìm và thay thế tin nhắn optimistic bằng tin nhắn thật từ server
          const tempIndex = this.messages.findIndex(m => m.id === optimisticMessage.id);
          if (tempIndex !== -1) {
            const updatedMessages = [...this.messages];
            updatedMessages[tempIndex] = {
              ...response.data,
              isOutgoing: true
            };
            this.messages = updatedMessages;
          } else {
            // Nếu không tìm thấy tin nhắn optimistic, thêm tin nhắn mới
            this.messages = [...this.messages, {...response.data, isOutgoing: true}];
          }
          
          // Cập nhật thông tin cuộc trò chuyện
          this.selectedConversation = {
            ...this.selectedConversation,
            lastMessage: response.data.text,
            lastMessageTime: response.data.time
          };
          
          // Update the conversation in the list
          const convIndex = this.conversations.findIndex(c => c.id === this.selectedConversation.id);
          if (convIndex !== -1) {
            // Cập nhật bản sao của mảng conversations
            const updatedConversations = [...this.conversations];
            updatedConversations[convIndex] = { ...this.selectedConversation };
            
            // Di chuyển cuộc trò chuyện này lên đầu danh sách nếu không phải đã ở đầu
            if (convIndex > 0) {
              const movedConversation = updatedConversations.splice(convIndex, 1)[0];
              updatedConversations.unshift(movedConversation);
            }
            
            // Cập nhật lại mảng conversations
            this.conversations = updatedConversations;
          }
          
          // Gửi tin nhắn qua socket để người nhận cập nhật real-time
          if (this.socketConnected && recipientId) {
            this.socketService.sendMessage(recipientId, response.data);
          }
          
          // Cập nhật UI một lần duy nhất sau khi thực hiện tất cả thay đổi
          this.cdr.detectChanges();
        }
        this.sendingMessage = false;
      },
      error: (error) => {
        console.error('Error sending message');
        this.sendingMessage = false;
        
        // Xóa tin nhắn tạm khỏi giao diện nếu gửi thất bại
        this.messages = this.messages.filter(m => m.id !== optimisticMessage.id);
        // Khôi phục tin nhắn trong input
        this.newMessage = messageText;
        this.cdr.detectChanges();
      }
    });
  }
  
  scrollToBottom(): void {
    const chatContainer = document.querySelector('.chat-messages');
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }
  
  // Phương thức debug để in ra thông tin về socket và tin nhắn
  logSocketStatus(): void {
    console.log('--------- SOCKET DEBUG ----------');
    console.log('Socket connected:', this.socketConnected);
    console.log('Current user ID:', this.currentUserId);
    console.log('Selected conversation:', this.selectedConversation ? this.selectedConversation.id : 'none');
    console.log('Total conversations:', this.conversations.length);
    console.log('Total messages in current conversation:', this.messages.length);
    console.log('--------------------------------');
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
  
  // Cập nhật phương thức updateConversationWithNewMessage để hỗ trợ đánh dấu đã đọc/chưa đọc
  private updateConversationWithNewMessage(conversationId: string, message: any, markAsUnread: boolean = false): void {
    // Giảm bớt các log không cần thiết
    
    // Tìm conversation dựa trên nhiều tiêu chí ID có thể có
    const index = this.conversations.findIndex(c => {
      return c.id === conversationId || 
             c._id === conversationId || 
             conversationId.includes(c.id);
    });
    
    if (index !== -1) {
      // Tạo bản sao của cuộc trò chuyện để cập nhật thay vì cập nhật trực tiếp
      const updatedConversation = {...this.conversations[index]};
      // Đảm bảo cập nhật các trường có định dạng đúng
      updatedConversation.lastMessage = message.text || message.content;
      updatedConversation.lastMessageTime = message.time || new Date().toLocaleTimeString();
      
      // Đánh dấu là chưa đọc nếu tin nhắn đến từ người khác và cần đánh dấu
      if (markAsUnread && !message.isOutgoing) {
        updatedConversation.unread = true;
      }
      
      // Tạo bản sao mới của mảng conversations
      const updatedConversations = [...this.conversations];
      updatedConversations[index] = updatedConversation;
      
      // Move to top of list if needed
      if (index > 0) {
        const conversation = updatedConversations.splice(index, 1)[0];
        updatedConversations.unshift(conversation);
      }
      
      // Cập nhật lại mảng conversations
      this.conversations = updatedConversations;
      
      // Không gọi detectChanges() ở đây vì sẽ được gọi ở hàm xử lý tin nhắn
    } else {
      // Nếu không tìm thấy cuộc trò chuyện, có thể cần tải lại danh sách
      console.log('Conversation not found in list');
      // Thay vì tải lại ngay lập tức, đặt flag để tránh request liên tục
      if (!this.loading) {
        this.loadConversations();
      }
    }
  }
  
  // Thêm phương thức để tải thông tin người dùng và bắt đầu cuộc trò chuyện mới
  loadUserToStartConversation(userId: string): void {
    this.messagesService.getUserInfo(userId).subscribe({
      next: (userData) => {
        if (userData) {
          this.selectedRecipient = {
            id: userData._id,
            name: `${userData.firstName} ${userData.lastName}`,
            avatar: userData.avatarUrl || 'assets/images/default-avatar.png'
          };
          
          this.openNewConversationModal();
        }
      },
      error: (err) => {
        console.error('Error loading user for new conversation:', err);
      }
    });
  }
} 