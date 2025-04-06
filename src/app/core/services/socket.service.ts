import { Injectable, NgZone, ApplicationRef } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject, BehaviorSubject, distinctUntilChanged, from } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket!: Socket;
  private messageSubject = new Subject<any>();
  private connectedSubject = new BehaviorSubject<boolean>(false);
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimer: any;
  private pingInterval: any;
  private authenticationPending = false;
  private messageQueue: any[] = []; // Lưu trữ tin nhắn chưa gửi khi socket đang kết nối lại
  
  // Getter để truy cập trạng thái kết nối
  get isConnected(): boolean {
    return this.connectedSubject.value;
  }

  constructor(
    private authService: AuthService,
    private ngZone: NgZone,
    private appRef: ApplicationRef
  ) {
    console.log('Initializing SocketService');
    
    // Khởi tạo socket khi service được tạo
    this.initSocket();
    
    // Theo dõi người dùng đăng nhập để xác thực socket
    this.authService.currentUser$.subscribe(user => {
      if (user && user._id) {
        console.log('User logged in, authenticating socket:', user._id);
        this.authenticateSocket(user._id);
      }
    });
  }

  private initSocket(): void {
    try {
      // Khôi phục lại URL chính xác - remove /api nếu có trong URL
      const socketUrl = environment.apiUrl.replace('/api', '');
      console.log('Socket URL:', socketUrl);
      
      // Tắt socket cũ nếu có
      if (this.socket) {
        this.socket.removeAllListeners();
        console.log('Disconnecting old socket connection');
        this.socket.disconnect();
      }
      
      // Khởi tạo socket mới với các tùy chọn cải thiện
      this.socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        forceNew: true  // Force new connection
      });
      
      console.log('Socket connection initialized with ID:', this.socket.id);
      
      // Thiết lập các bộ lắng nghe sự kiện socket
      this.setupSocketListeners();
      
      // Thiết lập ping để giữ kết nối socket
      this.setupPingInterval();
    } catch (error) {
      console.error('Error initializing socket:', error);
      // Thử kết nối lại sau 5 giây nếu khởi tạo thất bại
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
      }
      this.reconnectTimer = setTimeout(() => this.reconnect(), 5000);
    }
  }

  private setupPingInterval(): void {
    // Xóa interval cũ nếu có
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    // Thiết lập ping mỗi 30 giây để giữ kết nối
    this.pingInterval = setInterval(() => {
      if (this.socket && this.socket.connected) {
        this.socket.emit('ping', { timestamp: Date.now() });
      } else {
        console.log('Socket not connected, attempting to reconnect during ping');
        this.reconnect();
      }
    }, 30000);
  }

  private setupSocketListeners(): void {
    // Debug - Ghi lại tất cả các sự kiện socket nhận được
    // this.socket.onAny((event, ...args) => {
    //   console.log(`DEBUG - Socket event received: ${event}`, args);
    // });
    
    this.socket.on('connect', () => {
      this.ngZone.run(() => {
        this.reconnectAttempts = 0;
        console.log('Socket connected successfully with ID:', this.socket.id);
        this.connectedSubject.next(true);
        
        // Sau khi kết nối thành công, xác thực người dùng
        const userId = this.authService.getCurrentUserId();
        if (userId) {
          console.log('Authenticating socket after connection:', userId);
          this.authenticateSocket(userId);
        }
        
        // Xử lý hàng đợi tin nhắn sau khi kết nối thành công
        this.processMessageQueue();
        
        // Đảm bảo Angular detectChanges
        this.appRef.tick();
      });
    });
    
    this.socket.on('connect_error', (error) => {
      this.ngZone.run(() => {
        console.error('Socket connection error:', error);
        this.connectedSubject.next(false);
        
        // Thử kết nối lại nếu có lỗi kết nối
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`Connection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
          if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
          }
          this.reconnectTimer = setTimeout(() => this.reconnect(), 2000);
        } else {
          console.error('Max reconnection attempts reached');
          // Reset sau một thời gian dài
          setTimeout(() => {
            this.reconnectAttempts = 0;
            this.reconnect();
          }, 60000);
        }
      });
    });
    
    this.socket.on('disconnect', (reason) => {
      this.ngZone.run(() => {
        console.log('Socket disconnected:', reason);
        this.connectedSubject.next(false);
        
        // Tự động kết nối lại sau khi bị ngắt kết nối
        if (reason !== 'io client disconnect') {
          if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
          }
          this.reconnectTimer = setTimeout(() => this.reconnect(), 2000);
        }
      });
    });

    this.socket.on('reconnect', (attempt) => {
      console.log(`Socket reconnected after ${attempt} attempts`);
      // Xác thực lại người dùng sau khi kết nối lại
      const userId = this.authService.getCurrentUserId();
      if (userId) {
        this.authenticateSocket(userId);
      }
    });

    console.log('Setting up receiveMessage event listener');
    this.socket.on('receiveMessage', (data) => {
      console.log('SOCKET EVENT - Received message', JSON.stringify(data));
      
      // Đảm bảo xử lý trong NgZone để kích hoạt change detection
      this.ngZone.run(() => {
        try {
          // Xử lý dữ liệu tin nhắn để đảm bảo định dạng nhất quán
          let formattedData = this.formatMessageData(data);
          
          if (formattedData) {
            console.log('Processed message data:', JSON.stringify(formattedData));
            // Phát sự kiện trực tiếp
            this.messageSubject.next(formattedData);
            // Đảm bảo Angular detectChanges
            this.appRef.tick();
          } else {
            console.error('Failed to format message data:', data);
          }
        } catch (error) {
          console.error('Error processing socket message:', error);
        }
      });
    });
    
    // Handle messageSent event 
    this.socket.on('messageSent', (response) => {
      console.log('Message sent confirmation:', response);
    });
    
    // Handle socket errors
    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
    
    // Handle pong responses to keep connection alive
    this.socket.on('pong', (data) => {
      const latency = Date.now() - (data?.timestamp || 0);
      console.log(`Socket latency: ${latency}ms`);
    });
  }
  
  // Hàm mới để xử lý dữ liệu tin nhắn nhất quán
  private formatMessageData(data: any): any {
    if (!data) return null;
    
    let formattedData = null;
    
    // Xử lý đặc biệt cho tin nhắn nhận từ server khi sử dụng sendMessage
    if (data && data.recipientId && data.message) {
      // Format cho tin nhắn kiểu {recipientId, message}
      const message = data.message;
      formattedData = {
        conversationId: message.conversationId || message.id,
        message: {
          ...message,
          id: message.id || message._id || `msg_${Date.now()}`,
          text: message.text || message.content,
          time: message.time || new Date().toLocaleTimeString(),
          senderId: message.senderId,
          senderName: message.senderName
        }
      };
      return formattedData;
    }
    
    if (data && data.message && data.conversationId) {
      // Format 1: {message: {...}, conversationId: '...'}
      formattedData = {
        conversationId: data.conversationId,
        message: {
          ...data.message,
          // Đảm bảo tin nhắn có ID để dễ dàng kiểm tra trùng lặp
          id: data.message.id || data.message._id || `msg_${Date.now()}`,
          text: data.message.text || data.message.content, // Chuẩn hóa dữ liệu
          time: data.message.time || new Date().toLocaleTimeString()
        }
      };
    } else if (data && (data.senderId || data.sender) && (data.text || data.content)) {
      // Format 3: Tin nhắn trực tiếp từ server
      const messageText = data.text || data.content;
      const conversationId = data.conversationId || data.id; // ID cuộc trò chuyện hoặc ID của tin nhắn
      
      formattedData = {
        conversationId: conversationId,
        message: {
          ...data,
          id: data.id || data._id || `msg_${Date.now()}`,
          text: messageText,
          senderId: data.senderId || (data.sender ? (data.sender._id || data.sender.id) : null),
          time: data.time || data.createdAt || new Date().toLocaleTimeString()
        }
      };
    } else {
      // Nếu không khớp với định dạng nào chuẩn, thử tạo định dạng từ dữ liệu
      if (typeof data === 'object') {
        const conversationId = data.conversationId || 
                              (data.message && data.message.conversationId) || 
                              data.id || 
                              (data.message && (data.message.id || data.message._id));
        
        const message = data.message || data;
        
        // Chuẩn hóa tin nhắn
        const normalizedMessage = {
          ...message,
          id: message.id || message._id || `msg_${Date.now()}`,
          text: message.text || message.content || '(Không có nội dung)',
          time: message.time || message.createdAt || new Date().toLocaleTimeString(),
          senderId: message.senderId || (message.sender ? (message.sender._id || message.sender.id) : null)
        };
        
        if (conversationId && message) {
          formattedData = { 
            conversationId, 
            message: normalizedMessage 
          };
        }
      }
    }
    
    return formattedData;
  }

  // Xử lý hàng đợi tin nhắn
  private processMessageQueue(): void {
    if (this.messageQueue.length > 0) {
      console.log(`Processing message queue (${this.messageQueue.length} items)`);
      
      // Xử lý các tin nhắn trong hàng đợi
      while (this.messageQueue.length > 0) {
        const queuedMessage = this.messageQueue.shift();
        console.log('Sending queued message:', queuedMessage);
        
        if (this.socket && this.socket.connected) {
          this.sendMessageDirectly(queuedMessage.recipientId, queuedMessage.message);
        } else {
          // Nếu vẫn chưa kết nối, đưa tin nhắn trở lại hàng đợi
          this.messageQueue.unshift(queuedMessage);
          break;
        }
      }
    }
  }

  // Send authentication to the server
  authenticateSocket(userId: string): void {
    if (!userId) {
      console.error('Cannot authenticate socket: No user ID provided');
      return;
    }
    
    // Nếu đang xử lý xác thực, không làm gì
    if (this.authenticationPending) {
      console.log('Authentication already pending, skipping duplicate request');
      return;
    }
    
    this.authenticationPending = true;
    console.log('Authenticating socket for user:', userId);
    
    if (this.socket && this.socket.connected) {
      this.socket.emit('authenticate', userId);
      console.log('Socket authenticated for user:', userId);
      this.authenticationPending = false;
    } else {
      console.warn('Cannot authenticate: socket not connected - trying to reconnect');
      this.socket.connect();
      
      // Set a timeout to check if connection was established
      setTimeout(() => {
        if (this.socket && this.socket.connected) {
          console.log('Socket reconnected, now authenticating');
          this.socket.emit('authenticate', userId);
        } else {
          console.error('Socket reconnection failed after timeout');
        }
        this.authenticationPending = false;
      }, 2000);
    }
  }

  // Phương thức gửi tin nhắn trực tiếp (khi socket đã kết nối)
  private sendMessageDirectly(recipientId: string, message: any): void {
    if (!this.socket || !this.socket.connected) {
      console.error('Socket not connected, cannot send message directly');
      return;
    }
    
    console.log(`SOCKET - Sending message directly to ${recipientId}:`, message);
    
    // Đảm bảo tin nhắn có định dạng đúng
    const messageData = {
      recipientId,
      message: {
        ...message,
        // Đảm bảo tin nhắn có conversationId
        conversationId: message.conversationId || (typeof message === 'object' && message.id ? message.id : null)
      }
    };
    
    console.log('Formatted message data for socket:', messageData);
    
    // Thêm logic xử lý phản hồi ngay lập tức để debug
    this.socket.emit('sendMessage', messageData, (response: any) => {
      if (response) {
        console.log('Socket message sent, server confirmed:', response);
      } else {
        console.log('Socket message sent, no confirmation from server');
      }
    });
  }

  // Send a message through socket (public API)
  sendMessage(recipientId: string, message: any): void {
    console.log(`SOCKET - Sending message to ${recipientId}:`, message);
    
    // Nếu socket đã kết nối, gửi tin nhắn ngay
    if (this.socket && this.socket.connected) {
      this.sendMessageDirectly(recipientId, message);
    } else {
      console.warn('Socket not connected - adding message to queue and reconnecting');
      
      // Thêm tin nhắn vào hàng đợi
      this.messageQueue.push({ recipientId, message });
      
      // Thử kết nối lại socket
      this.reconnect();
    }
  }

  // Get messages from socket
  getMessages(): Observable<any> {
    return this.messageSubject.asObservable();
  }
  
  // Get connection status as an Observable
  getConnectionStatus(): Observable<boolean> {
    return this.connectedSubject.asObservable().pipe(
      distinctUntilChanged() // Chỉ emit khi giá trị thay đổi
    );
  }

  // Manually reconnect the socket
  reconnect(): void {
    console.log('Attempting to reconnect socket...');
    
    try {
      // Đảm bảo không nhiều yêu cầu kết nối đồng thời
      if (this.socket && !this.socket.connected && !(this.socket as any).connecting) {
        console.log('Reconnecting socket...');
        this.socket.connect();
      } else if (this.socket && (this.socket as any).connecting) {
        console.log('Socket already reconnecting...');
      } else {
        // Khởi tạo lại socket hoàn toàn
        this.initSocket();
      }
    } catch (error) {
      console.error('Error reconnecting socket:', error);
    }
  }
  
  // Force refresh socket connection
  forceRefresh(): void {
    console.log('Force refreshing socket connection');
    this.disconnect();
    setTimeout(() => {
      this.reconnect();
    }, 1000);
  }
  
  // Disconnect the socket
  disconnect(): void {
    if (this.socket) {
      console.log('Disconnecting socket');
      this.socket.disconnect();
      this.connectedSubject.next(false);
      
      // Xóa các timers
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
      }
      
      if (this.pingInterval) {
        clearInterval(this.pingInterval);
      }
    }
  }
  
  // Clean up resources when service is destroyed
  ngOnDestroy(): void {
    this.disconnect();
  }
} 