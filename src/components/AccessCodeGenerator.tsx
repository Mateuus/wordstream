'use client';

import React, { useState } from 'react';

interface AccessCodeGeneratorProps {
  sessionId: string;
  className?: string;
}

export const AccessCodeGenerator: React.FC<AccessCodeGeneratorProps> = ({ 
  sessionId, 
  className = '' 
}) => {
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const generateCode = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });

      if (response.ok) {
        const data = await response.json();
        setAccessCode(data.accessCode);
        setShareUrl(data.shareUrl);
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao gerar código');
      }
    } catch (error) {
      console.error('Error generating access code:', error);
      alert('Erro ao gerar código');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Código copiado para a área de transferência!');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-800 mb-4">
          🔗 Código de Acesso
        </h3>

        {!accessCode ? (
          <div className="space-y-4">
            <p className="text-gray-600">
              Gere um código para compartilhar esta sessão com outras pessoas.
            </p>
            <button
              onClick={generateCode}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Gerando...' : '🔑 Gerar Código'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Código de Acesso:</p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-mono font-bold text-blue-600">
                  {accessCode}
                </span>
                <button
                  onClick={() => copyToClipboard(accessCode)}
                  className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                >
                  📋 Copiar
                </button>
              </div>
            </div>

            {shareUrl && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Link para Compartilhar:</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-600 truncate flex-1 mr-2">
                    {shareUrl}
                  </span>
                  <button
                    onClick={() => copyToClipboard(shareUrl)}
                    className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                  >
                    📋 Copiar
                  </button>
                </div>
              </div>
            )}

            <div className="text-xs text-gray-500">
              ⏰ O código expira em 24 horas
            </div>

            <button
              onClick={() => {
                setAccessCode(null);
                setShareUrl(null);
              }}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              🔄 Gerar Novo Código
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
