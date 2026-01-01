// types.ts

export enum UserRole {
  GUEST = 'guest',
  TRADER = 'trader',
  ADMIN = 'admin',
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar: string;
  following: string[];
  privacy: 'public' | 'private';
  email?: string;
}

export interface RegistrationToken {
    code: string;
    isUsed: boolean;
    generatedBy: string;
    generatedAt: number;
    usedBy?: string;
}

export enum TradeStatus {
  PENDING = 'pending',
  REVIEWED = 'reviewed',
  REJECTED = 'rejected',
}

export type TradeStrategy = 'Breakout' | 'Wick Fill' | 'Flip' | 'News';

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  avatar?: string;
  text: string;
  timestamp: number;
}

export interface Trade {
  id: string;
  userId: string;
  userName: string;
  pair: string;
  type: 'BUY' | 'SELL';
  timeframe: string;
  entryPrice: number;
  exitPrice: number;
  stopLoss: number;
  pnl: number;
  notes: string;
  status: TradeStatus;
  strategy: TradeStrategy;
  imageUrl?: string;
  videoUrl?: string;
  openTime: number;
  closeTime: number;
  timestamp: number;
  adminFeedback?: string;
  adminFeedbackAudio?: string;
  likes: string[];
  comments: Comment[];
}

export interface Notification {
  id: string;
  userId: string;
  type: 'mentor_review' | 'new_trade';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  relatedId?: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  content: string;
  imageUrl?: string;
  timestamp: number;
  channelId: string;
}

export interface Channel {
  id: string;
  name: string;
  type: 'public' | 'private' | 'voice';
}

export interface AIState {
  isThinking: boolean;
  isSpeaking: boolean;
  isListening: boolean;
}

// --- Mentor Outlook Types ---

export interface KeyLevel {
  price: number;
  type: 'support' | 'resistance';
  strength: 'weak' | 'medium' | 'strong';
  note?: string;
}

export type OutlookType = 'session' | 'daily' | 'weekly' | 'monthly';

export interface TimelineEvent {
  id: string;
  label: string;
  title: string;
  type: 'news' | 'mentor' | 'structure';
  impact?: 'high' | 'medium' | 'low';
}

export interface OutlookNote {
    id: string;
    content: string;
    timestamp: number;
}

export interface MentorOutlook {
  id: string;
  type: OutlookType;
  title: string; 
  timestamp: number;
  bias: 'bullish' | 'bearish' | 'neutral';
  summary: string;
  videoUrl?: string;
  levels: KeyLevel[];
  timeline: TimelineEvent[];
  notes: OutlookNote[];
  
  // Specific Fields
  date?: string;
  startDate?: string;
  endDate?: string;
  sessionName?: 'Asia' | 'London' | 'New York';
  startHour?: number;
  endHour?: number;
}

// --- Video Archive Types ---
export interface VideoResource {
    id: string;
    title: string;
    description: string;
    url: string;
    thumbnail?: string;
    authorName: string;
    timestamp: number;
    type: 'live_recording' | 'upload';
    duration?: string;
}

// --- Course / LMS Types (CONSOLIDATED) ---

export interface QuizQuestion {
    id: string;
    question: string;
    options: string[];
    correctOptionIndex: number;
}

// 1. A single Lesson (The standard unit)
export interface CourseLesson {
    id: string;
    moduleId: string; // Required now for better linking
    title: string;
    type: 'video' | 'text' | 'quiz'; // Changed 'article' to 'text' to match your code
    order: number; // Added: Critical for sorting
    duration: string;     
    
    // Optional data fields based on type
    videoUrl?: string;    
    textContent?: string; // Renamed from 'content' to match your code usage
    quizData?: QuizQuestion[]; // Added for quiz support
    
    isFree?: boolean; 
}

// Alias for compatibility if any code still uses "CourseContent"
export type CourseContent = CourseLesson;

// 2. A Module (Chapter)
export interface CourseModule {
    id: string;
    title: string;
    description: string;
    order: number;
    lessons: CourseLesson[];
}

// 3. User Progress
export interface UserCourseProgress {
    userId: string;
    completedContentIds: string[]; // Changed from completedLessonIds to match code
    lastAccessedId?: string;      
    totalProgress: number;        
}