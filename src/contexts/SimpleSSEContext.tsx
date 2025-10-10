'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useDebounce } from '../hooks/useDebounce';

// Constantes de performance
const MAX_CHAT_MESSAGES = 50; // Limite de mensagens para otimizar performance
// TIMER_UPDATE_INTERVAL removido - timer agora é atualizado via SSE
const DEBOUNCE_DELAYS = {
  MESSAGES: 50,    // 50ms para mensagens (rápido para UX)
  STATS: 100,      // 100ms para stats (moderado)
  BANNED_WORDS: 200, // 200ms para palavras banidas (menos crítico)
} as const;

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
  reconnecting?: boolean;
  reconnectAttempt?: number;
  maxReconnectAttempts?: number;
  reconnectFailed?: boolean;
  message?: string;
}

interface SimpleSSEContextType {
  sessionStats: SessionStats | null;
  isConnected: boolean;
  isLoading: boolean;
  connectionStatus: ConnectionStatus | null;
  messages: ChatMessage[];
  sessionId: string | null;
  bannedWords: string[];
  timer: {
    isActive: boolean;
    remainingTime: number;
    duration: number;
  } | null;
  winner: {
    word: string;
    count: number;
    color: string;
  } | null;
  settings: {
    wordLimit: number;
  };
  connectToChannel: (channel: string, platform?: 'twitch' | 'kick', existingSessionId?: string) => Promise<void>;
  clearSession: () => Promise<void>;
  clearMessages: () => void;
  banWord: (word: string) => Promise<void>;
  excludeWord: (word: string) => Promise<void>;
  unbanWord: (word: string) => Promise<void>;
  startTimer: (duration: number) => Promise<void>;
  stopTimer: () => Promise<void>;
  clearCounter: () => Promise<void>;
  updateSettings: (settings: { wordLimit?: number; bannedWords?: string[] }) => Promise<void>;
}

const SimpleSSEContext = createContext<SimpleSSEContextType | undefined>(undefined);

interface SimpleSSEProviderProps {
  children: React.ReactNode;
}

export function SimpleSSEProvider({ children }: SimpleSSEProviderProps) {
  // Estados principais (sem debounce - críticos)
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [timer, setTimer] = useState<{
    isActive: boolean;
    remainingTime: number;
    duration: number;
  } | null>(null);
  const [winner, setWinner] = useState<{
    word: string;
    count: number;
    color: string;
  } | null>(null);
  const [settings, setSettings] = useState<{
    wordLimit: number;
  }>({ wordLimit: 10 });

  // Estados com debounce (para otimização)
  const [pendingMessages, setPendingMessages] = useState<ChatMessage[]>([]);
  const [pendingStats, setPendingStats] = useState<SessionStats | null>(null);
  const [pendingBannedWords, setPendingBannedWords] = useState<string[]>([]);

  // Estados finais (com debounce aplicado)
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [bannedWords, setBannedWords] = useState<string[]>([]);

  // Aplicar debounce aos estados pendentes
  const debouncedMessages = useDebounce(pendingMessages, DEBOUNCE_DELAYS.MESSAGES);
  const debouncedStats = useDebounce(pendingStats, DEBOUNCE_DELAYS.STATS);
  const debouncedBannedWords = useDebounce(pendingBannedWords, DEBOUNCE_DELAYS.BANNED_WORDS);
  
  const eventSourceRef = useRef<EventSource | null>(null);

  // Aplicar debounce aos estados pendentes
  useEffect(() => {
    if (debouncedMessages.length > 0) {
      setMessages(prev => {
        const newMessages = [...prev, ...debouncedMessages];
        return newMessages.slice(-MAX_CHAT_MESSAGES);
      });
      setPendingMessages([]); // Limpar pendências
    }
  }, [debouncedMessages]);

  useEffect(() => {
    if (debouncedStats) {
      setSessionStats(debouncedStats);
      setPendingStats(null); // Limpar pendências
    }
  }, [debouncedStats]);

  useEffect(() => {
    if (debouncedBannedWords.length > 0) {
      setBannedWords(debouncedBannedWords);
      setPendingBannedWords([]); // Limpar pendências
    }
  }, [debouncedBannedWords]);

  const loadSessionWordLists = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch(`/api/session/${sessionId}`);
      if (response.ok) {
        const sessionData = await response.json();
        setBannedWords(sessionData.bannedWords || []);
        console.log('📋 Lista de palavras banidas carregada:', {
          banned: sessionData.bannedWords?.length || 0
        });
      }
    } catch (error) {
      console.error('Erro ao carregar lista de palavras banidas:', error);
    }
  }, []);

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
          
          switch (data.type) {
            case 'connected':
              break;
              
            case 'chatMessage':
              // Usar debounce para mensagens (otimização de performance)
              setPendingMessages(prev => [...prev, data.message]);
              break;
              
            case 'wordUpdate':
              // Usar debounce para stats (otimização de performance)
              setPendingStats(data.stats);
              break;
              
            case 'bannedWordsUpdate':
              // Usar debounce para palavras banidas (otimização de performance)
              setPendingBannedWords(data.bannedWords || []);
              break;
              
            case 'timerUpdate':
              setTimer(data.timer);
              break;
              
            case 'timerFinished':
              setWinner(data.winner);
              setTimer(null);
              break;
              
            case 'connectionStatus':
              setConnectionStatus(data.status);
              setIsConnected(data.status.isConnected);
              
              // Log específico para reconexão
              if (data.status.reconnecting) {
                console.log(`🔄 Reconectando... Tentativa ${data.status.reconnectAttempt}/${data.status.maxReconnectAttempts}`);
              } else if (data.status.reconnectFailed) {
                console.log(`❌ Falha na reconexão: ${data.status.message}`);
              } else if (data.status.isConnected) {
                console.log(`✅ Conectado ao canal ${data.status.channel}`);
              } else {
                console.log(`❌ Desconectado do canal ${data.status.channel}`);
              }
              break;
              
            case 'heartbeat':
              // Silencioso
              break;
              
            default:
              // Tipo de evento desconhecido
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
        
        // Carregar palavras banidas e excluídas da sessão
        await loadSessionWordLists(data.sessionId);
        
        setIsLoading(false);
      } else {
        throw new Error('Falha ao conectar ao canal');
      }
    } catch (error) {
      console.error('Erro ao conectar:', error);
      setIsLoading(false);
    }
  }, [loadSessionWordLists]);

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

  const banWord = useCallback(async (word: string) => {
    if (!sessionId) return;
    
    try {
      const response = await fetch(`/api/sessions/${sessionId}/ban-word`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word })
      });
      
      if (response.ok) {
        setBannedWords(prev => [...prev, word]);
        console.log(`🚫 Palavra "${word}" banida`);
      }
    } catch (error) {
      console.error('Erro ao banir palavra:', error);
    }
  }, [sessionId]);

  const excludeWord = useCallback(async (word: string) => {
    if (!sessionId) return;
    
    // Remover a palavra imediatamente da visualização
    setSessionStats(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        topWords: prev.topWords.filter(w => w.word !== word)
      };
    });
    
    console.log(`❌ Palavra "${word}" removida da visualização`);
    
    // Enviar para o servidor para deletar completamente
    try {
      const response = await fetch(`/api/sessions/${sessionId}/exclude-word`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word })
      });
      
      if (response.ok) {
        console.log(`✅ Palavra "${word}" deletada do servidor`);
      } else {
        console.error(`❌ Erro ao deletar palavra no servidor: ${response.status}`);
      }
    } catch (error) {
      console.error('Erro ao deletar palavra no servidor:', error);
    }
  }, [sessionId]);

  const unbanWord = useCallback(async (word: string) => {
    if (!sessionId) return;
    
    try {
      const response = await fetch(`/api/sessions/${sessionId}/unban-word`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word })
      });
      
      if (response.ok) {
        setBannedWords(prev => prev.filter(w => w !== word));
        console.log(`✅ Palavra "${word}" desbanida`);
      }
    } catch (error) {
      console.error('Erro ao desbanir palavra:', error);
    }
  }, [sessionId]);

  const startTimer = useCallback(async (duration: number) => {
    if (!sessionId) return;
    
    try {
      const response = await fetch(`/api/sessions/${sessionId}/timer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration })
      });
      
      if (response.ok) {
        setTimer({
          isActive: true,
          remainingTime: duration,
          duration
        });
        console.log(`⏱️ Temporizador iniciado: ${duration}s`);
      } else {
        const error = await response.json();
        console.error('Erro ao iniciar temporizador:', error.error);
      }
    } catch (error) {
      console.error('Erro ao iniciar temporizador:', error);
    }
  }, [sessionId]);

  const stopTimer = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      const response = await fetch(`/api/sessions/${sessionId}/timer`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setTimer(null);
        console.log('⏹️ Temporizador parado');
      }
    } catch (error) {
      console.error('Erro ao parar temporizador:', error);
    }
  }, [sessionId]);

  const clearCounter = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      const response = await fetch(`/api/sessions/${sessionId}/clear`, {
        method: 'POST'
      });
      
      if (response.ok) {
        console.log('🗑️ Contador limpo');
        // Limpar também o winner quando limpar o contador
        setWinner(null);
      } else {
        const error = await response.json();
        console.error('Erro ao limpar contador:', error.error);
      }
    } catch (error) {
      console.error('Erro ao limpar contador:', error);
    }
  }, [sessionId]);

  const updateSettings = useCallback(async (newSettings: { wordLimit?: number; bannedWords?: string[] }) => {
    if (!sessionId) return;
    
    try {
      const response = await fetch(`/api/sessions/${sessionId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      
      if (response.ok) {
        const data = await response.json();
        setSettings(prev => ({ ...prev, ...data.settings }));
        if (newSettings.bannedWords !== undefined) {
          setBannedWords(newSettings.bannedWords);
        }
        console.log('⚙️ Configurações atualizadas');
      } else {
        const error = await response.json();
        console.error('Erro ao atualizar configurações:', error.error);
      }
    } catch (error) {
      console.error('Erro ao atualizar configurações:', error);
    }
  }, [sessionId]);

  // Timer agora é atualizado via eventos SSE do backend
  // Removido intervalo local para evitar conflitos

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
    bannedWords,
    timer,
    winner,
    settings,
    connectToChannel,
    clearSession,
    clearMessages,
    banWord,
    excludeWord,
    unbanWord,
    startTimer,
    stopTimer,
    clearCounter,
    updateSettings
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
