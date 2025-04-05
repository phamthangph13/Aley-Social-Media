import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MessagesService {
  private apiUrl = `${environment.apiUrl}/messages`;
  
  constructor(private http: HttpClient) { }
  
  // Lấy danh sách cuộc trò chuyện
  getConversations(): Observable<any> {
    return this.http.get(`${this.apiUrl}/conversations`);
  }
  
  // Lấy tin nhắn của một cuộc trò chuyện
  getMessages(conversationId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${conversationId}`);
  }
  
  // Gửi tin nhắn
  sendMessage(conversationId: string, text: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/send`, { conversationId, text });
  }
  
  // Tạo cuộc trò chuyện mới
  createConversation(recipientId: string, message: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/conversation`, { recipientId, message });
  }
  
  // Lấy danh sách bạn bè để tạo cuộc trò chuyện mới
  getPotentialRecipients(): Observable<any> {
    return this.http.get(`${this.apiUrl}/recipients/friends`);
  }
  
  // Thêm phương thức để lấy thông tin người dùng theo ID
  getUserInfo(userId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/user/${userId}`);
  }
} 