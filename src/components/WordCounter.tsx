'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface WordCount {
  word: string;
  count: number;
}

interface WordCounterProps {
  sessionId: string;
  className?: string;
}

export const WordCounter: React.FC<WordCounterProps> = ({ 
  sessionId, 
  className = '' 
}) => {
  const [wordCounts, setWordCounts] = useState<WordCount[]>([]);
  const [totalWords, setTotalWords] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchSessionData = useCallback(async () => {
    try {
      const response = await fetch(`/api/sessions?sessionId=${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setTotalWords(data.totalWords || 0);
        setWordCounts(data.topWords || []);
      }
    } catch (error) {
      console.error('Error fetching session data:', error);
    }
  }, [sessionId]);

  // Conectar ao SSE
  useEffect(() => {
    if (!sessionId) return;

    const eventSource = new EventSource(`/api/sse/${sessionId}`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('SSE connected');
      setIsConnected(true);
      setIsLoading(false);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'wordUpdate') {
          // Atualizar contador em tempo real
          fetchSessionData();
        } else if (data.type === 'timerFinished') {
          // Timer finalizado - mostrar resultado
          console.log('Timer finished:', data.winner);
        } else if (data.type === 'heartbeat') {
          // Manter conexão viva
          console.log('Heartbeat received');
        }
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      setIsConnected(false);
    };

    // Buscar dados iniciais
    fetchSessionData();

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [sessionId, fetchSessionData]);


  const createNewSession = async () => {
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      if (response.ok) {
        const data = await response.json();
        window.location.href = `/?sessionId=${data.sessionId}`;
      }
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Conectando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">🏆 Top Palavras</h2>
          <p className="text-sm text-gray-600">
            Sessão: {sessionId.slice(-8)}...
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-600">
            {isConnected ? 'Conectado' : 'Desconectado'}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-600">Total de Palavras</p>
          <p className="text-2xl font-bold text-blue-800">{totalWords}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm text-green-600">Palavras Únicas</p>
          <p className="text-2xl font-bold text-green-800">{wordCounts.length}</p>
        </div>
      </div>

      {/* Word List */}
      <div className="space-y-3">
        {wordCounts.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📊</div>
            <p className="text-gray-600">Aguardando palavras...</p>
            <p className="text-sm text-gray-500 mt-2">
              Envie mensagens para o chat para começar a contagem
            </p>
          </div>
        ) : (
          wordCounts.map((wordCount, index) => (
            <div
              key={wordCount.word}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <span className="text-lg font-bold text-gray-600">
                  #{index + 1}
                </span>
                <span className="text-lg font-semibold text-gray-800">
                  {wordCount.word}
                </span>
              </div>
              <div className="text-xl font-bold text-blue-600">
                {wordCount.count}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Actions */}
      <div className="mt-6 flex justify-center">
        <button
          onClick={createNewSession}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Nova Sessão
        </button>
      </div>
    </div>
  );
};
