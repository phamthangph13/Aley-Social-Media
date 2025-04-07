import { Component, ElementRef, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LlamaService } from '../../../core/services/llama.service';
import { Subject, takeUntil } from 'rxjs';

interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
  time: Date;
}

@Component({
  selector: 'app-aley-ask',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './aley-ask.component.html',
  styleUrl: './aley-ask.component.css'
})
export class AleyAskComponent implements OnInit, OnDestroy {
  @ViewChild('chatMessages') chatMessagesElement!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef;

  messages: ChatMessage[] = [];
  newMessage = '';
  isTyping = false;
  userAvatar = 'assets/images/default-avatar.png';
  userName = 'Người dùng';
  errorMessage: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(private llamaService: LlamaService) {}

  ngOnInit() {
    this.loadUserInfo();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUserInfo() {
    // In a real app, this would come from a user service
    this.userAvatar = 'assets/images/default-avatar.png';
    this.userName = 'Người dùng Aley';
  }

  sendMessage() {
    if (!this.newMessage.trim()) return;

    // Add user message
    this.messages.push({
      sender: 'user',
      text: this.newMessage,
      time: new Date()
    });

    // Store message text and clear input
    const messageText = this.newMessage;
    this.newMessage = '';
    this.resetTextareaHeight();
    this.errorMessage = null;

    // Simulate bot typing
    this.isTyping = true;
    setTimeout(() => this.scrollToBottom(), 100);

    // Call the Llama service
    this.llamaService.sendMessage(messageText)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isTyping = false;
          // Add bot response to messages
          if (response && response.response) {
            this.messages.push({
              sender: 'bot',
              text: response.response,
              time: new Date()
            });
          } else {
            this.errorMessage = 'Không nhận được phản hồi từ Llama 3.';
          }
          setTimeout(() => this.scrollToBottom(), 100);
        },
        error: (error) => {
          this.isTyping = false;
          console.error('Error from Llama service:', error);
          this.errorMessage = error.message || 'Có lỗi xảy ra khi xử lý yêu cầu.';
          setTimeout(() => this.scrollToBottom(), 100);
        }
      });
  }

  askQuestion(question: string) {
    this.newMessage = question;
    this.sendMessage();
  }

  adjustTextareaHeight(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }

  resetTextareaHeight() {
    if (this.messageInput && this.messageInput.nativeElement) {
      const textarea = this.messageInput.nativeElement;
      textarea.style.height = 'auto';
    }
  }

  scrollToBottom() {
    if (this.chatMessagesElement && this.chatMessagesElement.nativeElement) {
      const element = this.chatMessagesElement.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
  }
}
