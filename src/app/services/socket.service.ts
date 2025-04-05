import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket;
  private connected = false;
  private currentUser: any = null;
  private connectionStatusSubject = new Subject<boolean>();

  connectionStatus$ = this.connectionStatusSubject.asObservable();

  constructor(private authService: AuthService) {
    // Corrected URL by removing '/api' from the endpoint
    const socketUrl = environment.apiUrl.replace('/api', '');
    console.log('Socket URL:', socketUrl);
    
    // Initialize socket with improved configuration
    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      autoConnect: true
    });
    
    // Setup initial listeners
    this.setupSocketListeners();
    
    // Setup connection when service initializes if user is logged in
    if (this.authService.isAuthenticated()) {
      this.connect();
    }
    
    // Subscribe to auth changes to connect/disconnect socket
    this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
      if (user && !this.connected) {
        this.connect();
      } else if (!user && this.connected) {
        this.disconnect();
      }
    });
  }

  private setupSocketListeners(): void {
    // Connection established
    this.socket.on('connect', () => {
      console.log('Socket connected successfully with ID:', this.socket.id);
      this.connected = true;
      this.connectionStatusSubject.next(true);
      
      // Authenticate immediately after connection
      if (this.currentUser && this.currentUser._id) {
        this.authenticateSocket();
      }
    });
    
    // Connection error
    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.connected = false;
      this.connectionStatusSubject.next(false);
    });
    
    // Disconnection
    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.connected = false;
      this.connectionStatusSubject.next(false);
    });
    
    // Reconnection
    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`Socket reconnected after ${attemptNumber} attempts`);
      this.connected = true;
      this.connectionStatusSubject.next(true);
      
      // Re-authenticate on reconnection
      if (this.currentUser && this.currentUser._id) {
        this.authenticateSocket();
      }
    });
  }

  private connect(): void {
    if (!this.socket.connected) {
      this.socket.connect();
    }
  }

  private disconnect(): void {
    this.socket.disconnect();
    this.connected = false;
    this.connectionStatusSubject.next(false);
  }

  private authenticateSocket(): void {
    if (this.currentUser && this.currentUser._id) {
      console.log('Authenticating socket for user:', this.currentUser._id);
      this.socket.emit('authenticate', this.currentUser._id);
    }
  }

  emit(event: string, data: any): void {
    if (this.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Socket not connected. Attempting to reconnect...');
      this.connect();
      // Try again after connection
      this.socket.once('connect', () => {
        this.socket.emit(event, data);
      });
    }
  }

  listenForEvent<T = any>(event: string): Observable<T> {
    return new Observable<T>(observer => {
      this.socket.on(event, (data: any) => {
        observer.next(data as T);
      });
      
      return () => {
        this.socket.off(event);
      };
    });
  }

  // Public method to check connection status
  isConnected(): boolean {
    return this.connected;
  }

  // Public method to manually reconnect
  reconnect(): void {
    if (!this.connected) {
      this.connect();
    }
  }
} 