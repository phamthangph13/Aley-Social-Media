import { Injectable, NgZone } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
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
  
  // Getter để truy cập trạng thái kết nối
  get isConnected(): boolean {
    return this.connectedSubject.value;
  }

  constructor(
    private authService: AuthService,
    private ngZone: NgZone
  ) {
    console.log('Initializing SocketService');
    // Khởi tạo socket với cấu hình đơn giản hơn
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
        console.log('Disconnecting old socket connection');
        this.socket.disconnect();
      }
      
      // Khởi tạo socket mới
      this.socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        timeout: 20000
      });
      
      console.log('Socket connection initialized with ID:', this.socket.id);
      
      // Thiết lập các bộ lắng nghe sự kiện socket
      this.setupSocketListeners();
    } catch (error) {
      console.error('Error initializing socket:', error);
      // Thử kết nối lại sau 5 giây nếu khởi tạo thất bại
      setTimeout(() => this.reconnect(), 5000);
    }
  }

  private setupSocketListeners(): void {
    // Debug - Ghi lại tất cả các sự kiện socket nhận được
    // this.socket.onAny((event, ...args) => {
    //  console.log(`DEBUG - Socket event received: ${event}`, args);
    // });
    
    this.socket.on('connect', () => {
      this.ngZone.run(() => {
        this.reconnectAttempts = 0;
        console.log('Socket connected successfully with ID:', this.socket.id);
        this.connectedSubject.next(true);
        
        // Sau khi kết nối thành công, mới xác thực người dùng
        const userId = this.authService.getCurrentUserId();
        if (userId) {
          console.log('Authenticating socket after connection:', userId);
          this.authenticateSocket(userId);
        }
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
          setTimeout(() => this.reconnect(), 2000);
        } else {
          console.error('Max reconnection attempts reached');
        }
      });
    });
    
    this.socket.on('disconnect', (reason) => {
      this.ngZone.run(() => {
        console.log('Socket disconnected:', reason);
        this.connectedSubject.next(false);
        
        // Tự động kết nối lại sau khi bị ngắt kết nối
        if (reason !== 'io client disconnect') {
          setTimeout(() => this.reconnect(), 2000);
        }
      });
    });

    console.log('Setting up receiveMessage event listener');
    this.socket.on('receiveMessage', (data) => {
      // Giảm thiểu console.log, chỉ log dữ liệu quan trọng
      console.log('SOCKET EVENT - Received message');
      
      this.ngZone.run(() => {
        try {
          // Xử lý dữ liệu tin nhắn để đảm bảo định dạng nhất quán
          let formattedData = null;
          
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
          } else if (data && data.recipientId && data.message) {
            // Format 2: {recipientId: '...', message: {...}}
            formattedData = {
              conversationId: data.message.conversationId || data.conversationId,
              message: {
                ...data.message,
                id: data.message.id || data.message._id || `msg_${Date.now()}`,
                text: data.message.text || data.message.content,
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
          
          if (formattedData) {
            // Phát sự kiện trực tiếp không cần setTimeout
            this.messageSubject.next(formattedData);
          }
        } catch (error) {
          console.error('Error processing socket message:', error);
        }
      });
    });
    
    // Handle socket errors
    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }

  // Send authentication to the server
  authenticateSocket(userId: string): void {
    if (!userId) {
      console.error('Cannot authenticate socket: No user ID provided');
      return;
    }
    
    console.log('Authenticating socket for user:', userId);
    if (this.socket && this.socket.connected) {
      this.socket.emit('authenticate', userId);
      console.log('Socket authenticated for user:', userId);
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
      }, 2000);
    }
  }

  // Send a message through socket
  sendMessage(recipientId: string, message: any): void {
    console.log(`SOCKET - Sending message to ${recipientId}:`, message);
    if (this.socket && this.socket.connected) {
      console.log('Sending message via socket to:', recipientId);
      
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
    } else {
      console.warn('Cannot send message: socket not connected - trying to reconnect');
      this.socket.connect();
      this.socket.once('connect', () => {
        console.log('Socket reconnected, now sending message');
        this.socket.emit('sendMessage', { recipientId, message });
      });
    }
  }

  // Get messages from socket
  getMessages(): Observable<any> {
    return this.messageSubject.asObservable();
  }
  
  // Get connection status as an Observable
  getConnectionStatus(): Observable<boolean> {
    return this.connectedSubject.asObservable();
  }

  // Manually reconnect the socket
  reconnect(): void {
    console.log('Attempting to reconnect socket...');
    
    try {
      // Khởi tạo lại socket hoàn toàn
      this.initSocket();
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
    }
  }
} 