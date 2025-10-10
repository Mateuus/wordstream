'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: Date;
  platform: 'twitch' | 'kick';
  color?: string;
  badges?: Array<{
    name: string;
    title?: string;
    imageUrl?: string;
    icon?: string;
    color?: string;
  }>;
  parsedContent?: Array<{
    type: 'text' | 'emote';
    content: string;
    emoteUrl?: string;
    emoteName?: string;
    emoteId?: string;
  }>;
}

interface MessagesContextType {
  messages: ChatMessage[];
  clearMessages: () => void;
  addMessage: (message: ChatMessage) => void;
}

const MessagesContext = createContext<MessagesContextType | undefined>(undefined);

interface MessagesProviderProps {
  children: React.ReactNode;
  maxMessages?: number;
}

export function MessagesProvider({ children, maxMessages = 50 }: MessagesProviderProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => {
      const newMessages = [...prev, message];
      return newMessages.slice(-maxMessages);
    });
  }, [maxMessages]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const value: MessagesContextType = {
    messages,
    clearMessages,
    addMessage,
  };

  return (
    <MessagesContext.Provider value={value}>
      {children}
    </MessagesContext.Provider>
  );
}

export function useMessages() {
  const context = useContext(MessagesContext);
  if (context === undefined) {
    throw new Error('useMessages deve ser usado dentro de um MessagesProvider');
  }
  return context;
}
