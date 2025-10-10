'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSimpleSSE, SimpleSSEProvider } from '@/src/contexts/SimpleSSEContext';

interface SessionPageProps {
  params: Promise<{ publicId: string }>;
}

export default function SessionPage({ params }: SessionPageProps) {
  return (
    <SimpleSSEProvider>
      <SessionPageContent params={params} />
    </SimpleSSEProvider>
  );
}

function SessionPageContent({ params }: SessionPageProps) {
  const [publicId, setPublicId] = useState<string>('');
  const [sessionData, setSessionData] = useState<{
    channel: string;
    platform: 'twitch' | 'kick';
    sessionId: string;
    publicId: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const {
    sessionStats,
    isConnected,
    messages,
    connectToChannel,
    clearSession,
    clearMessages
  } = useSimpleSSE();
  
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    params.then(({ publicId }) => setPublicId(publicId));
  }, [params]);

  // Carregar dados da sessão
  useEffect(() => {
    if (!publicId) return;

    const loadSession = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/session/${publicId}`);
        
        if (response.ok) {
          const data = await response.json();
          setSessionData(data);
          setError(null);
          
          // Conectar automaticamente ao chat quando a sessão for carregada usando o sessionId existente
          console.log('Sessão carregada, conectando ao chat:', data.channel, data.platform, 'SessionId:', data.sessionId);
          await connectToChannel(data.channel, data.platform, data.sessionId);
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Sessão não encontrada');
        }
      } catch (error) {
        setError('Erro ao carregar sessão');
        console.error('Erro ao carregar sessão:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, [publicId, connectToChannel]);

  // Auto-scroll para a última mensagem apenas dentro do container do chat
  useEffect(() => {
    if (chatContainerRef.current && messages.length > 0) {
      setTimeout(() => {
        chatContainerRef.current?.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }, 50);
    }
  }, [messages]);

  const handleConnect = async () => {
    if (!sessionData) return;
    console.log('Conectando ao canal:', sessionData.channel, sessionData.platform);
    await connectToChannel(sessionData.channel, sessionData.platform, sessionData.sessionId);
  };


  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Carregando sessão...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-6xl mb-6">❌</div>
          <h1 className="text-3xl font-bold mb-4">
            Sessão não encontrada
          </h1>
          <p className="text-gray-400 mb-6">
            {error}
          </p>
          <Link
            href="/"
            className="inline-block bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg transition-colors"
          >
            ← Voltar ao início
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Header */}
      <div className="glass border-b border-white border-opacity-20 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto">
          {/* Mobile Layout */}
          <div className="block sm:hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className="text-sm font-medium">
                  {isConnected ? 'Conectado' : 'Desconectado'}
                </span>
              </div>
            </div>
            <h1 className="text-lg font-bold mb-2">
              WordStream - {sessionData?.channel}
            </h1>
            <div className="glass rounded-lg px-2 py-1 mb-3">
              <span className="text-xs text-gray-300">
                Sessão: <span className="font-mono text-blue-400">{publicId}</span>
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={clearMessages}
                className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs transition-colors"
              >
                Limpar Chat
              </button>
              <button
                onClick={clearSession}
                className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs transition-colors"
              >
                Limpar Contador
              </button>
            </div>
          </div>
          
          {/* Desktop Layout */}
          <div className="hidden sm:flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className="text-sm font-medium">
                  {isConnected ? 'Conectado' : 'Desconectado'}
                </span>
              </div>
              <h1 className="text-xl font-bold">
                WordStream - {sessionData?.channel}
              </h1>
              <div className="glass rounded-lg px-3 py-1">
                <span className="text-sm text-gray-300">
                  Sessão: <span className="font-mono text-blue-400">{publicId}</span>
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={clearMessages}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm transition-colors"
              >
                Limpar Chat
              </button>
              <button
                onClick={clearSession}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm transition-colors"
              >
                Limpar Contador
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Connection Panel */}
      {!isConnected && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="glass rounded-2xl p-4 sm:p-6 mb-6">
            <h3 className="text-lg font-bold text-white mb-4">Conectar à Sessão</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <p className="text-gray-300 text-sm mb-2">
                  Canal: <span className="font-semibold text-blue-400">{sessionData?.channel}</span>
                </p>
                <p className="text-gray-300 text-sm mb-4">
                  Plataforma: <span className="font-semibold text-green-400">{sessionData?.platform}</span>
                </p>
              </div>
              <button
                onClick={handleConnect}
                disabled={!sessionData}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-semibold transition-colors"
              >
                Conectar ao Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Messages and Word Counter */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        {/* Mobile Layout */}
        <div className="block sm:hidden">
          <div className="space-y-4" style={{ minHeight: 'calc(100vh - 300px)' }}>
            
            {/* Chat Area - Mobile */}
            <div className="glass rounded-2xl border border-white border-opacity-20">
              <div className="flex flex-col">
                {/* Header do Chat */}
                <div className="bg-white bg-opacity-10 px-4 py-3 border-b border-white border-opacity-20">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-medium text-sm">
                      Chat - {sessionData?.channel}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                      <span className="text-xs text-gray-300">
                        {isConnected ? 'AO VIVO' : 'OFF'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Container das Mensagens */}
                <div 
                  ref={chatContainerRef}
                  className="overflow-y-auto p-3"
                  style={{ 
                    height: '300px',
                    maxHeight: '300px'
                  }}
                >
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <div className="text-center">
                        <div className="text-3xl mb-3">💬</div>
                        <p className="text-sm font-medium mb-1">
                          {isConnected ? 'Aguardando mensagens...' : 'Conecte-se ao chat'}
                        </p>
                        <p className="text-xs">
                          {isConnected 
                            ? 'Mensagens aparecerão aqui'
                            : 'Clique em "Conectar ao Chat"'
                            }
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {messages.map((message, index) => (
                        <div key={message.id || index} className="w-full">
                          <div className="flex items-start space-x-2 p-2 hover:bg-white hover:bg-opacity-5 rounded-lg transition-colors">
                            <span className="text-blue-400 font-semibold text-xs">
                              {message.username}:
                            </span>
                            <span className="text-gray-200 text-xs flex-1">
                              {message.message}
                            </span>
                            <span className="text-gray-500 text-xs">
                              {new Date(message.timestamp).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Word Counter - Mobile */}
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="text-lg">📊</div>
                  <h3 className="text-lg font-bold text-white">
                    Contador de Palavras
                  </h3>
                </div>
              </div>

              {/* Stats */}
              {sessionStats && (
                <div className="bg-gray-800 bg-opacity-50 rounded-xl p-3 mb-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-xl font-bold text-blue-400">{sessionStats.totalWords}</div>
                      <div className="text-xs text-gray-300">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-green-400">{sessionStats.uniqueWords}</div>
                      <div className="text-xs text-gray-300">Únicas</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Word List */}
              <div className="max-h-64 overflow-y-auto">
                {sessionStats && sessionStats.topWords.length > 0 ? (
                  <div className="space-y-2">
                    {sessionStats.topWords.map((wordCount, index) => (
                      <div
                        key={wordCount.word}
                        className="flex items-center justify-between p-2 bg-white bg-opacity-5 rounded-xl hover:bg-opacity-10 transition-all duration-200"
                      >
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <span className="text-xs text-gray-600 font-mono w-4 text-center">
                            #{index + 1}
                          </span>
                          <span className="text-gray-800 font-semibold text-sm truncate">
                            {wordCount.word}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <span className="text-blue-600 font-bold text-sm">
                            {wordCount.count}
                          </span>
                          <div className="w-12 bg-white bg-opacity-20 rounded-full h-1.5">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-purple-500 h-1.5 rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.min(100, (wordCount.count / Math.max(...sessionStats.topWords.map(w => w.count))) * 100)}%`
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-3xl mb-3">📊</div>
                    <h4 className="text-sm font-semibold text-white mb-1">
                      Aguardando palavras...
                    </h4>
                    <p className="text-gray-400 text-xs">
                      As palavras mencionadas no chat aparecerão aqui
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden sm:flex gap-6" style={{ height: 'calc(100vh - 200px)' }}>
          
          {/* Chat Area - 60% da largura */}
          <div className="w-3/5">
            <div className="glass rounded-2xl border border-white border-opacity-20 h-full">
              <div className="h-full flex flex-col">
                {/* Header do Chat */}
                <div className="bg-white bg-opacity-10 px-4 py-3 border-b border-white border-opacity-20">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-medium">
                      Chat em Tempo Real - {sessionData?.channel}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                      <span className="text-xs text-gray-300">
                        {isConnected ? 'AO VIVO' : 'DESCONECTADO'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Container das Mensagens */}
                <div 
                  ref={chatContainerRef}
                  className="flex-1 overflow-y-auto p-4"
                  style={{ 
                    height: 'calc(100% - 60px)',
                    maxHeight: 'calc(100% - 60px)'
                  }}
                >
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <div className="text-center">
                        <div className="text-4xl mb-4">💬</div>
                        <p className="text-lg font-medium mb-2">
                          {isConnected ? 'Aguardando mensagens...' : 'Conecte-se ao chat para começar'}
                        </p>
                        <p className="text-sm">
                          {isConnected 
                            ? 'As mensagens do chat aparecerão aqui em tempo real'
                            : 'Clique em "Conectar ao Chat" para começar'
                          }
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {messages.map((message, index) => (
                        <div key={message.id || index} className="w-full">
                          <div className="flex items-start space-x-2 p-2 hover:bg-white hover:bg-opacity-5 rounded-lg transition-colors">
                            <span className="text-blue-400 font-semibold text-sm">
                              {message.username}:
                            </span>
                            <span className="text-gray-200 text-sm flex-1">
                              {message.message}
                            </span>
                            <span className="text-gray-500 text-xs">
                              {new Date(message.timestamp).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Word Counter - 40% da largura */}
          <div className="w-2/5">
            <div className="glass rounded-2xl p-6 h-full">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="text-lg">📊</div>
                  <h3 className="text-lg font-bold text-white">
                    Contador de Palavras
                  </h3>
                </div>
              </div>

              {/* Stats */}
              {sessionStats && (
                <div className="bg-gray-800 bg-opacity-50 rounded-xl p-4 mb-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-400">{sessionStats.totalWords}</div>
                      <div className="text-xs text-gray-300">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">{sessionStats.uniqueWords}</div>
                      <div className="text-xs text-gray-300">Únicas</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Word List */}
              <div className="max-h-96 overflow-y-auto">
                {sessionStats && sessionStats.topWords.length > 0 ? (
                  <div className="space-y-2">
                    {sessionStats.topWords.map((wordCount, index) => (
                      <div
                        key={wordCount.word}
                        className="flex items-center justify-between p-3 bg-white bg-opacity-5 rounded-xl hover:bg-opacity-10 transition-all duration-200"
                      >
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <span className="text-xs text-gray-600 font-mono w-6 text-center">
                            #{index + 1}
                          </span>
                          <span className="text-gray-800 font-semibold truncate">
                            {wordCount.word}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <span className="text-blue-600 font-bold text-lg">
                            {wordCount.count}
                          </span>
                          <div className="w-16 bg-white bg-opacity-20 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.min(100, (wordCount.count / Math.max(...sessionStats.topWords.map(w => w.count))) * 100)}%`
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">📊</div>
                    <h4 className="text-lg font-semibold text-white mb-2">
                      Aguardando palavras...
                    </h4>
                    <p className="text-gray-400 text-sm">
                      As palavras mencionadas no chat aparecerão aqui
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="glass border-t border-white border-opacity-20 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto text-center text-xs sm:text-sm text-gray-400">
          <p>🏆 WordStream | Sessão: {publicId} | Canal: {sessionData?.channel}</p>
        </div>
      </div>
    </div>
  );
}
