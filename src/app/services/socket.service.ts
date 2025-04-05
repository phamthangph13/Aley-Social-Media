import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
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

  constructor(private authService: AuthService) {
    // Initialize socket but don't connect yet
    this.socket = io(environment.apiUrl, {
      transports: ['websocket'],
      autoConnect: false
    });
    
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

  private connect(): void {
    this.socket.connect();
    this.connected = true;
    
    if (this.currentUser && this.currentUser._id) {
      this.socket.emit('authenticate', this.currentUser._id);
      console.log('Socket authenticated with user ID:', this.currentUser._id);
    }
  }

  private disconnect(): void {
    this.socket.disconnect();
    this.connected = false;
  }

  emit(event: string, data: any): void {
    if (this.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Socket not connected. Trying to emit:', event);
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
} 