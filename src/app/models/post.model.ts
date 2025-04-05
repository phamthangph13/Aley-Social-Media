export interface Post {
  _id: string;
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string;
  };
  content: string;
  imageUrls?: string[];
  videoUrls?: string[];
  hashtags?: string[];
  emotion: 'happy' | 'sad' | 'angry' | 'excited' | 'surprised' | 'loved' | 'none';
  privacy: 'public' | 'friends' | 'private';
  likes: string[];
  comments: Comment[];
  createdAt: string;
  updatedAt: string;
  showComments?: boolean;
}

export interface Comment {
  _id: string;
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string;
  };
  text: string;
  createdAt: string;
}

export interface PostCreateDto {
  content: string;
  hashtags?: string;
  emotion?: string;
  privacy?: string;
  media?: File[];
}

export interface PostUpdateDto {
  content?: string;
  hashtags?: string;
  emotion?: string;
  privacy?: string;
} 