'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface WordCount {
  word: string;
  count: number;
  lastSeen: Date;
}

interface SessionStats {
  sessionId: string;
  publicId?: string;
  channel: string;
  platform: 'twitch' | 'kick';
  totalWords: number;
  uniqueWords: number;
  topWords: WordCount[];
  createdAt: Date;
  lastActivity: Date;
  isActive?: boolean;
  createdBy?: string;
}

interface StatsContextType {
  sessionStats: SessionStats | null;
  sessionId: string | null;
  bannedWords: string[];
  banWord: (word: string) => Promise<void>;
  excludeWord: (word: string) => Promise<void>;
  unbanWord: (word: string) => Promise<void>;
  updateStats: (stats: SessionStats) => void;
  updateBannedWords: (words: string[]) => void;
}

const StatsContext = createContext<StatsContextType | undefined>(undefined);

interface StatsProviderProps {
  children: React.ReactNode;
  onBanWord: (word: string) => Promise<void>;
  onExcludeWord: (word: string) => Promise<void>;
  onUnbanWord: (word: string) => Promise<void>;
}

export function StatsProvider({ children, onBanWord, onExcludeWord, onUnbanWord }: StatsProviderProps) {
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [bannedWords, setBannedWords] = useState<string[]>([]);

  const updateStats = useCallback((stats: SessionStats) => {
    setSessionStats(stats);
    setSessionId(stats.sessionId);
  }, []);

  const updateBannedWords = useCallback((words: string[]) => {
    setBannedWords(words);
  }, []);

  const banWord = useCallback(async (word: string) => {
    await onBanWord(word);
    setBannedWords(prev => [...prev, word]);
  }, [onBanWord]);

  const excludeWord = useCallback(async (word: string) => {
    await onExcludeWord(word);
    // Remover a palavra imediatamente da visualização
    setSessionStats(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        topWords: prev.topWords.filter(w => w.word !== word)
      };
    });
  }, [onExcludeWord]);

  const unbanWord = useCallback(async (word: string) => {
    await onUnbanWord(word);
    setBannedWords(prev => prev.filter(w => w !== word));
  }, [onUnbanWord]);

  const value: StatsContextType = {
    sessionStats,
    sessionId,
    bannedWords,
    banWord,
    excludeWord,
    unbanWord,
    updateStats,
    updateBannedWords,
  };

  return (
    <StatsContext.Provider value={value}>
      {children}
    </StatsContext.Provider>
  );
}

export function useStats() {
  const context = useContext(StatsContext);
  if (context === undefined) {
    throw new Error('useStats deve ser usado dentro de um StatsProvider');
  }
  return context;
}
