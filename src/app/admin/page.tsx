'use client';

import { useState } from 'react';

export default function AdminPage() {
  const [channel, setChannel] = useState('');
  const [platform, setPlatform] = useState<'twitch' | 'kick'>('twitch');
  const [createdBy, setCreatedBy] = useState('admin');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{error?: string; message?: string; shareUrl?: string; publicId?: string} | null>(null);
  const [sessions, setSessions] = useState<Array<{id: string; sessionId: string; publicId: string; channel: string; platform: string; createdAt: string; isActive: boolean; totalWords: number; uniqueWords: number; createdBy: string; shareUrl: string}>>([]);

  const createSession = async () => {
    if (!channel.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: channel.trim(),
          platform,
          createdBy
        }),
      });

      const data = await response.json();
      setResult(data);
      
      if (response.ok) {
        // Limpar formulário
        setChannel('');
        // Recarregar lista de sessões
        loadSessions();
      }
    } catch {
      setResult({ error: 'Erro ao criar sessão' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadSessions = async () => {
    try {
      const response = await fetch('/api/admin/sessions?adminKey=admin123');
      const data = await response.json();
      
      if (response.ok) {
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Erro ao carregar sessões:', error);
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (!confirm('Tem certeza que deseja desativar esta sessão?')) return;

    try {
      const response = await fetch(`/api/admin/sessions?sessionId=${sessionId}&adminKey=admin123`, {
        method: 'DELETE',
      });

      if (response.ok) {
        loadSessions(); // Recarregar lista
        setResult({ message: 'Sessão desativada com sucesso' });
      } else {
        const errorData = await response.json();
        setResult({ error: errorData.error });
      }
    } catch {
      setResult({ error: 'Erro ao desativar sessão' });
    }
  };

  const renewSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/admin/sessions?sessionId=${sessionId}&adminKey=admin123`, {
        method: 'PUT'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setResult({ message: `Sessão ${sessionId} renovada com sucesso!` });
        // Recarregar lista de sessões
        loadSessions();
      } else {
        setResult({ error: data.error || 'Erro ao renovar sessão' });
      }
    } catch {
      setResult({ error: 'Erro ao renovar sessão' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">
            🛠️ Painel de Administração
          </h1>
          <p className="text-gray-400">
            Gerencie sessões compartilhadas do WordStream
          </p>
        </div>

        {/* Criar Nova Sessão */}
        <div className="glass rounded-2xl p-6 mb-8">
          <h2 className="text-2xl font-bold mb-6">Criar Nova Sessão</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2">Canal</label>
              <input
                type="text"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                placeholder="Nome do canal"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Plataforma</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as 'twitch' | 'kick')}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="twitch">🎮 Twitch</option>
                <option value="kick">⚡ Kick</option>
              </select>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Criado por</label>
            <input
              type="text"
              value={createdBy}
              onChange={(e) => setCreatedBy(e.target.value)}
              placeholder="Nome do moderador"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={createSession}
            disabled={isLoading || !channel.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            {isLoading ? 'Criando...' : '🚀 Criar Sessão'}
          </button>

          {/* Resultado */}
          {result && (
            <div className={`mt-4 p-4 rounded-lg ${result.error ? 'bg-red-900 text-red-200' : 'bg-green-900 text-green-200'}`}>
              {result.error ? (
                <p>❌ {result.error}</p>
              ) : result.shareUrl ? (
                <div>
                  <p>✅ {result.message}</p>
                  <div className="mt-3 p-3 bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-300 mb-2">Link para compartilhar:</p>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={result.shareUrl}
                        readOnly
                        className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                      />
                      <button
                        onClick={() => result.shareUrl && navigator.clipboard.writeText(result.shareUrl)}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
                      >
                        📋 Copiar
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      ID Público: <span className="font-mono">{result.publicId}</span>
                    </p>
                  </div>
                </div>
              ) : (
                <p>✅ {result.message}</p>
              )}
            </div>
          )}
        </div>

        {/* Lista de Sessões Ativas */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Sessões Ativas</h2>
            <button
              onClick={loadSessions}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
            >
              🔄 Atualizar
            </button>
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <div className="text-4xl mb-4">📊</div>
              <p>Nenhuma sessão ativa encontrada</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div key={session.sessionId} className="bg-gray-800 bg-opacity-50 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-2">
                        <h3 className="text-lg font-semibold">
                          {session.channel}
                        </h3>
                        <span className="px-2 py-1 bg-blue-600 rounded text-xs">
                          {session.platform}
                        </span>
                        <span className="px-2 py-1 bg-green-600 rounded text-xs">
                          {session.publicId}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-300">
                        <div>
                          <span className="text-blue-400 font-semibold">{session.totalWords}</span> Total
                        </div>
                        <div>
                          <span className="text-green-400 font-semibold">{session.uniqueWords}</span> Únicas
                        </div>
                        <div>
                          Criado por: <span className="text-yellow-400">{session.createdBy}</span>
                        </div>
                        <div>
                          Ativo desde: <span className="text-purple-400">
                            {new Date(session.createdAt).toLocaleString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <a
                        href={session.shareUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
                      >
                        🔗 Abrir
                      </a>
                      <button
                        onClick={() => renewSession(session.sessionId)}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors"
                      >
                        🔄 Renovar
                      </button>
                      <button
                        onClick={() => deleteSession(session.sessionId)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm transition-colors"
                      >
                        🗑️ Desativar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
