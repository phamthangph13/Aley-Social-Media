import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket;
  private messageSubject = new Subject<any>();
  private connected = false;

  constructor(private authService: AuthService) {
    // Khôi phục lại URL chính xác - remove /api nếu có trong URL
    const socketUrl = environment.apiUrl.replace('/api', '');
    console.log('Connecting to socket URL:', socketUrl);
    
    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    // Thiết lập các bộ lắng nghe sự kiện socket
    this.setupSocketListeners();
    
    // Theo dõi người dùng đăng nhập để xác thực socket
    this.authService.currentUser$.subscribe(user => {
      if (user && user._id) {
        this.authenticateSocket(user._id);
      }
    });
  }

  private setupSocketListeners(): void {
    // Nghe sự kiện connect để biết khi socket kết nối thành công
    this.socket.on('connect', () => {
      console.log('Socket connected successfully with ID:', this.socket.id);
      this.connected = true;
      
      // Sau khi kết nối thành công, mới xác thực người dùng
      const userId = this.authService.getCurrentUserId();
      if (userId) {
        this.authenticateSocket(userId);
      }
    });
    
    // Nghe sự kiện connect_error để debug
    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.connected = false;
    });
    
    // Nghe sự kiện disconnect
    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.connected = false;
    });

    // Listen for incoming messages
    this.socket.on('receiveMessage', (data) => {
      console.log('Received message via socket:', data);
      
      // Ensure data is in the expected format
      if (data && data.message && data.conversationId) {
        this.messageSubject.next(data);
      } else if (data && data.recipientId && data.message) {
        // Handle the alternative format
        this.messageSubject.next({
          conversationId: data.message.conversationId,
          message: data.message
        });
      } else {
        console.error('Received malformed message data:', data);
      }
    });
  }

  // Send authentication to the server
  authenticateSocket(userId: string): void {
    console.log('Authenticating socket for user:', userId);
    if (this.connected) {
      this.socket.emit('authenticate', userId);
      console.log('Socket authenticated for user:', userId);
    } else {
      console.warn('Cannot authenticate: socket not connected - trying to reconnect');
      // Thử kết nối lại và xác thực sau khi kết nối thành công
      this.socket.connect();
      this.socket.once('connect', () => {
        console.log('Socket reconnected, now authenticating');
        this.socket.emit('authenticate', userId);
      });
    }
  }

  // Send a message through socket
  sendMessage(recipientId: string, message: any): void {
    if (this.connected) {
      console.log('Sending message via socket to:', recipientId);
      this.socket.emit('sendMessage', { recipientId, message });
    } else {
      console.warn('Cannot send message: socket not connected - trying to reconnect');
      // Thử kết nối lại và gửi message sau khi kết nối thành công
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

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.connected = false;
    }
  }
  
  // Phương thức để thử kết nối lại socket nếu cần
  reconnect(): void {
    if (!this.connected && this.socket) {
      console.log('Attempting to reconnect socket...');
      this.socket.connect();
      
      // Xác thực lại khi kết nối được thiết lập
      this.socket.once('connect', () => {
        const userId = this.authService.getCurrentUserId();
        if (userId) {
          console.log('Socket reconnected successfully, authenticating user:', userId);
          this.authenticateSocket(userId);
        }
      });
    } else if (this.connected) {
      console.log('Socket already connected, ID:', this.socket.id);
      // Nếu đã kết nối, kiểm tra xác thực
      const userId = this.authService.getCurrentUserId();
      if (userId) {
        this.authenticateSocket(userId);
      }
    }
  }
} 