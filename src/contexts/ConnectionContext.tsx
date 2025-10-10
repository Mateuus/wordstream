'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface ConnectionStatus {
  isConnected: boolean;
  channel: string;
  platform: 'twitch' | 'kick';
  reconnecting?: boolean;
  reconnectAttempt?: number;
  maxReconnectAttempts?: number;
  reconnectFailed?: boolean;
  message?: string;
}

interface ConnectionContextType {
  isConnected: boolean;
  isLoading: boolean;
  connectionStatus: ConnectionStatus | null;
  connectToChannel: (channel: string, platform?: 'twitch' | 'kick', existingSessionId?: string) => Promise<void>;
  clearSession: () => Promise<void>;
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined);

interface ConnectionProviderProps {
  children: React.ReactNode;
  onConnect: (channel: string, platform?: 'twitch' | 'kick', existingSessionId?: string) => Promise<void>;
  onClearSession: () => Promise<void>;
}

export function ConnectionProvider({ children, onConnect, onClearSession }: ConnectionProviderProps) {
  const [isConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus] = useState<ConnectionStatus | null>(null);

  const connectToChannel = useCallback(async (channel: string, platform: 'twitch' | 'kick' = 'twitch', existingSessionId?: string) => {
    setIsLoading(true);
    try {
      await onConnect(channel, platform, existingSessionId);
    } finally {
      setIsLoading(false);
    }
  }, [onConnect]);

  const clearSession = useCallback(async () => {
    await onClearSession();
  }, [onClearSession]);

  const value: ConnectionContextType = {
    isConnected,
    isLoading,
    connectionStatus,
    connectToChannel,
    clearSession,
  };

  return (
    <ConnectionContext.Provider value={value}>
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection() {
  const context = useContext(ConnectionContext);
  if (context === undefined) {
    throw new Error('useConnection deve ser usado dentro de um ConnectionProvider');
  }
  return context;
}
