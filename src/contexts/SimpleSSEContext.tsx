'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

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

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: Date;
  platform: 'twitch' | 'kick';
  channel: string;
}

interface ConnectionStatus {
  isConnected: boolean;
  channel: string;
  platform: 'twitch' | 'kick';
}

interface SimpleSSEContextType {
  sessionStats: SessionStats | null;
  isConnected: boolean;
  isLoading: boolean;
  connectionStatus: ConnectionStatus | null;
  messages: ChatMessage[];
  sessionId: string | null;
  connectToChannel: (channel: string, platform?: 'twitch' | 'kick', existingSessionId?: string) => Promise<void>;
  clearSession: () => Promise<void>;
  clearMessages: () => void;
}

const SimpleSSEContext = createContext<SimpleSSEContextType | undefined>(undefined);

interface SimpleSSEProviderProps {
  children: React.ReactNode;
}

export function SimpleSSEProvider({ children }: SimpleSSEProviderProps) {
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);

  const connectToChannel = useCallback(async (channel: string, platform: 'twitch' | 'kick' = 'twitch', existingSessionId?: string) => {
    setIsLoading(true);
    try {
      // Conectar ao canal via API usando a sessão existente se fornecida
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, platform, sessionId: existingSessionId })
      });

      if (response.ok) {
        const data = await response.json();
        setSessionId(data.sessionId);
        
        // Conectar ao SSE
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }

        const eventSource = new EventSource(`/api/sse/${channel}`);
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
          console.log('✅ SSE conectado para canal:', channel);
          setIsConnected(true);
          setIsLoading(false);
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('📨 SSE evento:', data.type);
            
            switch (data.type) {
              case 'connected':
                console.log('🎉 Conexão SSE estabelecida');
                break;
                
              case 'chatMessage':
                setMessages(prev => [...prev, data.message]);
                break;
                
              case 'wordUpdate':
                setSessionStats(data.stats);
                break;
                
              case 'connectionStatus':
                setConnectionStatus(data.status);
                setIsConnected(data.status.isConnected);
                break;
                
              case 'heartbeat':
                // Silencioso
                break;
                
              default:
                console.log('❓ Tipo de evento desconhecido:', data.type);
            }
          } catch (error) {
            console.error('❌ Erro ao processar evento SSE:', error);
          }
        };

        eventSource.onerror = (error) => {
          console.error('❌ Erro SSE:', error);
          setIsConnected(false);
          setIsLoading(false);
        };
      } else {
        throw new Error('Falha ao conectar ao canal');
      }
    } catch (error) {
      console.error('Erro ao conectar:', error);
      setIsLoading(false);
    }
  }, []);

  const clearSession = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      const response = await fetch(`/api/sessions?sessionId=${sessionId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setSessionStats(null);
        setMessages([]);
        console.log('🗑️ Sessão limpa');
      }
    } catch (error) {
      console.error('Erro ao limpar sessão:', error);
    }
  }, [sessionId]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const value: SimpleSSEContextType = {
    sessionStats,
    isConnected,
    isLoading,
    connectionStatus,
    messages,
    sessionId,
    connectToChannel,
    clearSession,
    clearMessages
  };

  return (
    <SimpleSSEContext.Provider value={value}>
      {children}
    </SimpleSSEContext.Provider>
  );
}

export function useSimpleSSE() {
  const context = useContext(SimpleSSEContext);
  if (context === undefined) {
    throw new Error('useSimpleSSE deve ser usado dentro de um SimpleSSEProvider');
  }
  return context;
}
