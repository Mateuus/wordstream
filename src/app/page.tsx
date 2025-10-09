'use client';

import { useState, useEffect } from 'react';
import { WordCounter } from '@/src/components/WordCounter';
import { AllowedWordsManager } from '@/src/components/AllowedWordsManager';
import { TimerController } from '@/src/components/TimerController';
import { WinnerDisplay } from '@/src/components/WinnerDisplay';

export default function Home() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Verificar se há sessionId na URL
    const urlParams = new URLSearchParams(window.location.search);
    const urlSessionId = urlParams.get('sessionId');
    
    if (urlSessionId) {
      setSessionId(urlSessionId);
    }
  }, []);

  const createSession = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      if (response.ok) {
        const data = await response.json();
        setSessionId(data.sessionId);
        // Atualizar URL sem recarregar a página
        window.history.pushState({}, '', `/?sessionId=${data.sessionId}`);
      } else {
        console.error('Erro ao criar sessão');
        alert('Erro ao criar sessão');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Erro ao criar sessão');
    } finally {
      setIsLoading(false);
    }
  };

  // Se não há sessionId, mostrar página inicial
  if (!sessionId) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            🏆 WordStream
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Contador de palavras com processamento centralizado no servidor
          </p>
          <div className="space-y-4">
            <button
              onClick={createSession}
              disabled={isLoading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg"
            >
              {isLoading ? 'Criando...' : 'Criar Sessão'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Se há sessionId, mostrar interface do contador
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            🏆 WordStream
          </h1>
          <p className="text-lg text-gray-600">
            Sessão: <span className="font-mono bg-gray-200 px-2 py-1 rounded">{sessionId.slice(-8)}...</span>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contador Principal */}
          <div className="lg:col-span-2">
            <WordCounter sessionId={sessionId} />
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <TimerController sessionId={sessionId} />
            <AllowedWordsManager sessionId={sessionId} />
          </div>
        </div>

        {/* Winner Display */}
        <WinnerDisplay sessionId={sessionId} />
      </div>
    </div>
  );
}