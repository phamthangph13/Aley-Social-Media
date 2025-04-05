export interface Notification {
  _id: string;
  recipient: string;
  sender: {
    _id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string;
  };
  type: 'like' | 'comment' | 'friend_request';
  postId?: {
    _id: string;
    content: string;
  };
  commentId?: string;
  read: boolean;
  createdAt: string;
}

export interface NotificationResponse {
  notifications: Notification[];
  unreadCount: number;
}

export interface UnreadCountResponse {
  unreadCount: number;
} 