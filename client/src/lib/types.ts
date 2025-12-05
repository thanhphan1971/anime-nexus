export interface User {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  bio: string;
  stats?: {
    level: number;
    followers: string;
    following: number;
  };
  badges?: string[];
  matchScore?: number;
  animeInterests?: string[];
  theme?: string;
}

export interface Post {
  id: string;
  userId: string;
  user: User;
  content?: string;
  image?: string;
  likes: number;
  comments: number;
  timestamp: string;
}
