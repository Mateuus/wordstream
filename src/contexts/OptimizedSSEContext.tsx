'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { ConnectionProvider } from './ConnectionContext';
import { MessagesProvider } from './MessagesContext';
import { StatsProvider } from './StatsContext';
import { TimerProvider } from './TimerContext';
import { useConnection } from './ConnectionContext';
import { useMessages } from './MessagesContext';
import { useStats } from './StatsContext';
import { useTimer } from './TimerContext';

interface OptimizedSSEProviderProps {
  children: React.ReactNode;
}

function SSEConnectionManager({ children }: OptimizedSSEProviderProps) {
  const { updateStats, updateBannedWords } = useStats();
  const { addMessage } = useMessages();
  const { updateTimer, updateWinner } = useTimer();
  const eventSourceRef = useRef<EventSource | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSSEMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'connected':
          break;
          
        case 'chatMessage':
          addMessage(data.message);
          break;
          
        case 'wordUpdate':
          updateStats(data.stats);
          break;
          
        case 'bannedWordsUpdate':
          updateBannedWords(data.bannedWords || []);
          break;
          
        case 'timerFinished':
          updateWinner(data.winner);
          updateTimer(null);
          break;
          
        case 'connectionStatus':
          // Este será tratado pelo ConnectionContext
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
  }, [addMessage, updateStats, updateBannedWords, updateTimer, updateWinner]);

  // Cleanup
  useEffect(() => {
    const eventSource = eventSourceRef.current;
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  return <>{children}</>;
}

export function OptimizedSSEProvider({ children }: OptimizedSSEProviderProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleConnect = useCallback(async (channel: string, _platform: 'twitch' | 'kick' = 'twitch') => {
    // Implementar lógica de conexão aqui
    // Conectando ao canal
  }, []);

  const handleClearSession = useCallback(async () => {
    // Implementar lógica de limpeza aqui
    // Limpando sessão
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleBanWord = useCallback(async (_word: string) => {
    // Implementar lógica de banir palavra aqui
    // Banindo palavra
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleExcludeWord = useCallback(async (_word: string) => {
    // Implementar lógica de excluir palavra aqui
    // Excluindo palavra
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleUnbanWord = useCallback(async (_word: string) => {
    // Implementar lógica de desbanir palavra aqui
    // Desbanindo palavra
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleStartTimer = useCallback(async (_duration: number) => {
    // Implementar lógica de iniciar timer aqui
    // Iniciando timer
  }, []);

  const handleStopTimer = useCallback(async () => {
    // Implementar lógica de parar timer aqui
    // Parando timer
  }, []);

  const handleClearCounter = useCallback(async () => {
    // Implementar lógica de limpar contador aqui
    // Limpando contador
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleUpdateSettings = useCallback(async (_settings: Record<string, unknown>) => {
    // Implementar lógica de atualizar configurações aqui
    // Atualizando configurações
  }, []);

  return (
    <ConnectionProvider onConnect={handleConnect} onClearSession={handleClearSession}>
      <MessagesProvider maxMessages={50}>
        <StatsProvider 
          onBanWord={handleBanWord}
          onExcludeWord={handleExcludeWord}
          onUnbanWord={handleUnbanWord}
        >
          <TimerProvider
            onStartTimer={handleStartTimer}
            onStopTimer={handleStopTimer}
            onClearCounter={handleClearCounter}
            onUpdateSettings={handleUpdateSettings}
          >
            <SSEConnectionManager>
              {children}
            </SSEConnectionManager>
          </TimerProvider>
        </StatsProvider>
      </MessagesProvider>
    </ConnectionProvider>
  );
}

// Hook combinado para compatibilidade com código existente
export function useOptimizedSSE() {
  const connection = useConnection();
  const messages = useMessages();
  const stats = useStats();
  const timer = useTimer();

  return {
    // Connection
    isConnected: connection.isConnected,
    isLoading: connection.isLoading,
    connectionStatus: connection.connectionStatus,
    connectToChannel: connection.connectToChannel,
    clearSession: connection.clearSession,
    
    // Messages
    messages: messages.messages,
    clearMessages: messages.clearMessages,
    
    // Stats
    sessionStats: stats.sessionStats,
    sessionId: stats.sessionId,
    bannedWords: stats.bannedWords,
    banWord: stats.banWord,
    excludeWord: stats.excludeWord,
    unbanWord: stats.unbanWord,
    
    // Timer
    timer: timer.timer,
    winner: timer.winner,
    settings: timer.settings,
    startTimer: timer.startTimer,
    stopTimer: timer.stopTimer,
    clearCounter: timer.clearCounter,
    updateSettings: timer.updateSettings,
  };
}
