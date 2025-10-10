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
      // 🆕 Primeiro: Conectar ao SSE ANTES de conectar o chat
      // Isso garante que o SSE esteja pronto para receber mensagens
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // 🔑 Usar publicId (sessionId) como chave do SSE, não o nome do canal
      // Isso garante que cada sessão tenha seu próprio canal SSE único
      const sseChannel = existingSessionId || channel; // Usar sessionId como canal SSE
      const sseUrl = existingSessionId 
        ? `/api/sse/${sseChannel}?channel=${channel}`
        : `/api/sse/${channel}`;
      
      console.log(`🔌 Conectando SSE ao canal: ${sseChannel} (chat: ${channel})`);
      const eventSource = new EventSource(sseUrl);
      eventSourceRef.current = eventSource;

      // Configurar handlers de mensagem PRIMEIRO
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
              console.log('📊 Stats recebidos:', data.stats.totalWords, 'palavras');
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

      // Aguardar SSE estar conectado (com timeout maior)
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          console.warn('⚠️ Timeout ao aguardar conexão SSE, mas continuando...');
          resolve(); // Resolver ao invés de rejeitar para não bloquear
        }, 15000); // 15 segundos de timeout

        eventSource.onopen = () => {
          clearTimeout(timeout);
          console.log('✅ SSE conectado para canal:', sseChannel);
          setIsConnected(true);
          resolve();
        };

        eventSource.onerror = (error) => {
          clearTimeout(timeout);
          console.error('❌ Erro inicial ao conectar SSE:', error);
          setIsConnected(false);
          // Não rejeitar, deixar continuar
          resolve();
        };
      });

      // Handler de erro permanente (após conexão inicial)
      eventSource.onerror = (error) => {
        console.error('❌ Erro SSE:', error);
        setIsConnected(false);
      };
      
      // 🆕 Segundo: Conectar ao canal via API DEPOIS do SSE estar pronto
      console.log(`🔗 Conectando chat ao canal ${channel}...`);
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, platform, sessionId: existingSessionId })
      });

      if (response.ok) {
        const data = await response.json();
        setSessionId(data.sessionId);
        console.log(`✅ Chat conectado com sucesso à sessão ${data.sessionId}`);
        setIsLoading(false);
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
