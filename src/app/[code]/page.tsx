'use client';

import { WordCounter } from '@/src/components/WordCounter';
import { AllowedWordsManager } from '@/src/components/AllowedWordsManager';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface CodePageProps {
  params: Promise<{ code: string }>;
}

export default function CodePage({ params }: CodePageProps) {
  const [code, setCode] = useState<string>('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadParams = async () => {
      const resolvedParams = await params;
      setCode(resolvedParams.code);
      await fetchSessionByCode(resolvedParams.code);
    };
    loadParams();
  }, [params]);

  const fetchSessionByCode = async (code: string) => {
    try {
      const response = await fetch(`/api/codes?code=${code}`);
      if (response.ok) {
        const data = await response.json();
        setSessionId(data.sessionId);
      } else {
        setError('Código inválido ou expirado');
      }
    } catch (error) {
      console.error('Error fetching session by code:', error);
      setError('Erro ao buscar sessão');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error || !sessionId) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6">❌</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Código Inválido ou Expirado
          </h1>
          <p className="text-gray-600 mb-6">
            O código &quot;{code}&quot; não foi encontrado ou expirou.
          </p>
          <Link
            href="/"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Voltar ao Início
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            🏆 Contador Compartilhado
          </h1>
          <p className="text-lg text-gray-600">
            Acessando sessão via código: <span className="font-mono bg-gray-200 px-2 py-1 rounded">{code}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contador Principal */}
          <div className="lg:col-span-2">
            <WordCounter sessionId={sessionId} />
          </div>

          {/* Gerenciador de Palavras Permitidas */}
          <div className="lg:col-span-1">
            <AllowedWordsManager sessionId={sessionId} />
          </div>
        </div>
      </div>
    </div>
  );
}
