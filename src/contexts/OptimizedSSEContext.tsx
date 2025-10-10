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
      console.log('📨 SSE evento:', data.type);
      
      switch (data.type) {
        case 'connected':
          console.log('🎉 Conexão SSE estabelecida');
          break;
          
        case 'chatMessage':
          addMessage(data.message);
          break;
          
        case 'wordUpdate':
          updateStats(data.stats);
          console.log('📊 Stats recebidos:', data.stats.totalWords, 'palavras');
          break;
          
        case 'bannedWordsUpdate':
          updateBannedWords(data.bannedWords || []);
          console.log('🚫 Palavras banidas atualizadas:', data.bannedWords);
          break;
          
        case 'timerFinished':
          updateWinner(data.winner);
          updateTimer(null);
          console.log('🏆 Temporizador finalizado! Ganhador:', data.winner);
          break;
          
        case 'connectionStatus':
          // Este será tratado pelo ConnectionContext
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
  // Handlers para os contextos
  const handleConnect = useCallback(async (channel: string, platform: 'twitch' | 'kick' = 'twitch') => {
    // Implementar lógica de conexão aqui
    console.log('Conectando ao canal:', channel, platform);
  }, []);

  const handleClearSession = useCallback(async () => {
    // Implementar lógica de limpeza aqui
    console.log('Limpando sessão');
  }, []);

  const handleBanWord = useCallback(async (word: string) => {
    // Implementar lógica de banir palavra aqui
    console.log('Banindo palavra:', word);
  }, []);

  const handleExcludeWord = useCallback(async (word: string) => {
    // Implementar lógica de excluir palavra aqui
    console.log('Excluindo palavra:', word);
  }, []);

  const handleUnbanWord = useCallback(async (word: string) => {
    // Implementar lógica de desbanir palavra aqui
    console.log('Desbanindo palavra:', word);
  }, []);

  const handleStartTimer = useCallback(async (duration: number) => {
    // Implementar lógica de iniciar timer aqui
    console.log('Iniciando timer:', duration);
  }, []);

  const handleStopTimer = useCallback(async () => {
    // Implementar lógica de parar timer aqui
    console.log('Parando timer');
  }, []);

  const handleClearCounter = useCallback(async () => {
    // Implementar lógica de limpar contador aqui
    console.log('Limpando contador');
  }, []);

  const handleUpdateSettings = useCallback(async (settings: Record<string, unknown>) => {
    // Implementar lógica de atualizar configurações aqui
    console.log('Atualizando configurações:', settings);
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
