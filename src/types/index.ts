export interface WordCount {
  word: string;
  count: number;
  lastSeen: number;
}

export interface ProcessedMessage {
  id: string;
  username: string;
  message: string;
  timestamp: Date;
  platform: 'twitch' | 'kick';
  sourceChannel?: string;
}

export interface AllowedWord {
  word: string;
  color: string;
  createdAt: Date;
}

export interface SessionConfig {
  allowedWords: AllowedWord[];
  onlyAllowedWords: boolean;
  caseSensitive: boolean;
}

export interface Session {
  id: string;
  createdAt: Date;
  lastActivity: Date;
  totalWords: number;
  isActive: boolean;
  accessCode?: string;
  config: {
    bannedWords: string[];
    minWordLength: number;
    maxRepeatedChars: number;
    allowedWords: AllowedWord[];
    onlyAllowedWords: boolean;
  };
}

export interface ChatConfig {
  platform: 'twitch' | 'kick';
  channel: string;
  isActive: boolean;
  lastConnected?: Date;
  error?: string;
}

export interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: Date;
  platform: 'twitch' | 'kick';
  channel: string;
}

export interface ConnectionStatus {
  sessionId: string;
  platform: 'twitch' | 'kick';
  channel: string;
  isConnected: boolean;
  lastConnected?: Date;
  error?: string;
  messageCount: number;
}

export interface TimerData {
  duration: number; // em segundos
  startTime: number; // timestamp
  isActive: boolean;
  endTime: number; // timestamp
}

export interface WinnerData {
  word: string;
  count: number;
  color: string;
}
