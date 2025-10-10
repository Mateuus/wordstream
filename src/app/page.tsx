'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [channel, setChannel] = useState<string>('');
  const [platform, setPlatform] = useState<'twitch' | 'kick'>('twitch');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{error?: string; message?: string; shareUrl?: string} | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restorePublicId, setRestorePublicId] = useState<string>('');
  const [restorePassword, setRestorePassword] = useState<string>('');

  const handleCreateSession = async () => {
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
          createdBy: 'admin',
          password: password.trim() || undefined
        }),
      });

      const data = await response.json();
      setResult(data);
      
            if (response.ok) {
              // Aguardar mais tempo para garantir que Redis estabilize
              await new Promise(resolve => setTimeout(resolve, 3000));

              // Verificar se a sessão existe antes de redirecionar
              let sessionFound = false;
              let attempts = 0;
              const maxAttempts = 5;

              while (!sessionFound && attempts < maxAttempts) {
                attempts++;
                // Tentativa de verificar sessão
                
                const sessionCheck = await fetch(`/api/session/${data.publicId}`);
                if (sessionCheck.ok) {
                  sessionFound = true;
                  window.location.href = data.shareUrl;
                } else {
                  if (attempts < maxAttempts) {
                    // Sessão não encontrada, aguardando
                    await new Promise(resolve => setTimeout(resolve, 2000));
                  }
                }
              }

              if (!sessionFound) {
                setResult({
                  error: 'Sessão criada mas Redis ainda está estabilizando. Aguarde alguns segundos e acesse o link manualmente.',
                  shareUrl: data.shareUrl
                });
              }
            }
    } catch (error) {
      console.error('Erro ao criar sessão:', error);
      setResult({ error: 'Erro ao criar sessão. Verifique sua conexão e tente novamente.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToSession = () => {
    if (!channel.trim()) return;
    window.location.href = `/session/${channel.trim()}`;
  };

  const handleRestoreSession = async () => {
    if (!restorePublicId.trim() || !restorePassword.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publicId: restorePublicId.trim(),
          password: restorePassword.trim()
        }),
      });

      const data = await response.json();
      setResult(data);
      
      if (response.ok) {
        // Redirecionar para a sessão restaurada
        window.location.href = data.session.shareUrl;
      }
    } catch {
      setResult({ error: 'Erro ao restaurar sessão' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
        {/* Background dinâmico com múltiplas camadas */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900"></div>
        
        {/* Efeitos de partículas animadas */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 animate-pulse" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Ccircle cx='50' cy='50' r='3'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
            animation: 'float 20s ease-in-out infinite'
          }}></div>
        </div>
        
        {/* Gradientes animados */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 animate-pulse"></div>
        </div>
        
        {/* Container principal */}
        <div className="relative z-10 min-h-screen flex flex-col">
          {/* Header com navegação */}
          <header className="glass border-b border-white border-opacity-20 px-6 py-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-3xl animate-float">🏆</div>
                <h1 className="text-2xl font-bold text-white">
                  <span className="text-gradient">WordStream</span>
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <Link href="/admin" className="text-gray-300 hover:text-white transition-colors">🛠️ Admin</Link>
                <button className="text-gray-300 hover:text-white transition-colors">Sobre</button>
                <button className="text-gray-300 hover:text-white transition-colors">Recursos</button>
                <button className="text-gray-300 hover:text-white transition-colors">Contato</button>
              </div>
            </div>
          </header>

          {/* Hero Section */}
          <main className="flex-1 flex items-center justify-center px-6 py-20">
            <div className="max-w-6xl mx-auto text-center">
              {/* Logo principal com efeitos */}
              <div className="mb-12 animate-fade-in-scale">
                <div className="relative inline-block">
                  <div className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl mb-8 animate-float">🏆</div>
                  {/* Efeito de brilho ao redor do emoji */}
                  <div className="absolute inset-0 text-6xl sm:text-7xl md:text-8xl lg:text-9xl animate-pulse opacity-30 blur-sm">🏆</div>
                </div>
                
                <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-6 text-shadow">
                  <span className="text-gradient bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                    WordStream
                  </span>
                </h1>
                
                <p className="text-xl sm:text-2xl md:text-3xl text-gray-300 mb-4 leading-relaxed px-4">
                  Contador de palavras em tempo real
                </p>
                <p className="text-sm sm:text-base md:text-lg text-gray-400 mb-12 max-w-3xl mx-auto px-4">
                  Processamento centralizado no servidor com atualizações instantâneas via SSE. 
                  Conecte-se ao chat da Twitch ou Kick e veja as palavras mais mencionadas em tempo real.
                </p>
              </div>

              {/* Botões de ação principais */}
              <div className="mb-20 animate-slide-in-up">
                <div className="flex flex-col gap-4 items-center justify-center max-w-md mx-auto">
                  
                  {/* Seleção de Plataforma */}
                  <div className="w-full">
                    <select
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value as 'twitch' | 'kick')}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                    >
                      <option value="twitch">🎮 Twitch</option>
                      <option value="kick">⚡ Kick</option>
                    </select>
                  </div>
                  
                  {/* Input do Canal */}
                  <div className="w-full">
                    <input
                      type="text"
                      value={channel}
                      onChange={(e) => setChannel(e.target.value)}
                      placeholder={`Nome do canal no ${platform === 'twitch' ? 'Twitch' : 'Kick'}`}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-center"
                      onKeyPress={(e) => e.key === 'Enter' && handleGoToSession()}
                    />
                  </div>
                  
                  {/* Botões de Ação */}
                  <div className="w-full space-y-3">
                    <button
                      onClick={() => setShowModal(true)}
                      className="w-full group relative overflow-hidden px-6 py-3 bg-blue-600 text-white font-semibold rounded-full border-0 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-105 hover:-translate-y-1"
                    >
                      <span className="relative z-10 flex items-center justify-center space-x-2 text-base">
                        <span className="text-lg">🆕</span>
                        <span>Criar Nova Sessão</span>
                      </span>
                    </button>
                    
                    <button
                      onClick={() => setShowRestoreModal(true)}
                      className="w-full group relative overflow-hidden px-6 py-3 bg-green-600 text-white font-semibold rounded-full border-0 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-105 hover:-translate-y-1"
                    >
                      <span className="relative z-10 flex items-center justify-center space-x-2 text-base">
                        <span className="text-lg">🔄</span>
                        <span>Restaurar Sessão</span>
                      </span>
                    </button>
                    
                    <button
                      onClick={handleGoToSession}
                      disabled={!channel.trim()}
                      className="w-full group relative overflow-hidden px-6 py-3 bg-white text-black font-semibold rounded-full border-0 shadow-lg hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-500 transform hover:scale-105 hover:-translate-y-1"
                    >
                      {/* Background animado */}
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      
                      <span className="relative z-10 flex items-center justify-center space-x-2 text-base">
                        <span className="text-lg">🚀</span>
                        <span>Entrar em Sessão</span>
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Features em cards modernos */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-slide-in-up" style={{ animationDelay: '0.5s' }}>
                <div className="glass rounded-3xl p-8 hover-lift group">
                  <div className="text-center">
                    <div className="text-5xl mb-6 animate-bounce">⚡</div>
                    <h3 className="text-2xl font-bold text-white mb-4">Tempo Real</h3>
                    <p className="text-gray-300 text-lg leading-relaxed">
                      Atualizações instantâneas via Server-Sent Events (SSE) para uma experiência fluida e responsiva
                    </p>
                    <div className="mt-6 w-full bg-white bg-opacity-20 rounded-full h-2">
                      <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
                    </div>
                  </div>
                </div>
                
                <div className="glass rounded-3xl p-8 hover-lift group">
                  <div className="text-center">
                    <div className="text-5xl mb-6 animate-bounce" style={{ animationDelay: '0.2s' }}>🎯</div>
                    <h3 className="text-2xl font-bold text-white mb-4">Precisão</h3>
                    <p className="text-gray-300 text-lg leading-relaxed">
                      Processamento centralizado no servidor com filtros anti-spam e validação inteligente
                    </p>
                    <div className="mt-6 w-full bg-white bg-opacity-20 rounded-full h-2">
                      <div className="bg-gradient-to-r from-green-500 to-teal-500 h-2 rounded-full animate-pulse" style={{ width: '95%' }}></div>
                    </div>
                  </div>
                </div>
                
                <div className="glass rounded-3xl p-8 hover-lift group">
                  <div className="text-center">
                    <div className="text-5xl mb-6 animate-bounce" style={{ animationDelay: '0.4s' }}>🏆</div>
                    <h3 className="text-2xl font-bold text-white mb-4">Competitivo</h3>
                    <p className="text-gray-300 text-lg leading-relaxed">
                      Ranking dinâmico com animações suaves e indicadores visuais de mudanças de posição
                    </p>
                    <div className="mt-6 w-full bg-white bg-opacity-20 rounded-full h-2">
                      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 h-2 rounded-full animate-pulse" style={{ width: '90%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>

          {/* Footer */}
          <footer className="glass border-t border-white border-opacity-20 px-6 py-8">
            <div className="max-w-7xl mx-auto text-center">
              <div className="flex items-center justify-center space-x-4 mb-4">
                <div className="text-2xl animate-float">🏆</div>
                <span className="text-xl font-bold text-white">
                  <span className="text-gradient">WordStream</span>
                </span>
              </div>
              <p className="text-gray-400">
                © 2024 WordStream. Feito com ❤️ para streamers e comunidades.
              </p>
            </div>
          </footer>
        </div>

        {/* Modal de Nova Sessão */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Nova Sessão</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Canal</label>
                <input
                  type="text"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  placeholder="Nome do canal"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Plataforma</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as 'twitch' | 'kick')}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="twitch">🎮 Twitch</option>
                  <option value="kick">⚡ Kick</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Senha (Opcional)</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Senha para proteger a sessão"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {result && (
                <div className={`p-3 rounded-lg ${result.error ? 'bg-red-900 text-red-200' : 'bg-green-900 text-green-200'}`}>
                  {result.error ? (
                    <p>❌ {result.error}</p>
                  ) : (
                    <p>✅ {result.message}</p>
                  )}
                </div>
              )}

              <button
                onClick={handleCreateSession}
                disabled={isLoading || !channel.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-semibold transition-colors"
              >
          {isLoading ? (
            <span className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Criando e estabilizando sessão...</span>
            </span>
          ) : (
            '🚀 Criar Sessão'
          )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Restaurar Sessão */}
      {showRestoreModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Restaurar Sessão</h2>
              <button
                onClick={() => setShowRestoreModal(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="mb-4 p-3 bg-blue-900 bg-opacity-50 rounded-lg">
              <p className="text-sm text-blue-200">
                💡 Para restaurar uma sessão, você precisa do <strong>ID público</strong> e da <strong>senha</strong> que foram definidos na criação da sessão.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">ID Público da Sessão</label>
                <input
                  type="text"
                  value={restorePublicId}
                  onChange={(e) => setRestorePublicId(e.target.value)}
                  placeholder="ID público da sessão"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Senha da Sessão</label>
                <input
                  type="password"
                  value={restorePassword}
                  onChange={(e) => setRestorePassword(e.target.value)}
                  placeholder="Senha definida na criação da sessão"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {result && (
                <div className={`p-3 rounded-lg ${result.error ? 'bg-red-900 text-red-200' : 'bg-green-900 text-green-200'}`}>
                  {result.error ? (
                    <p>❌ {result.error}</p>
                  ) : (
                    <p>✅ {result.message}</p>
                  )}
                </div>
              )}

              <button
                onClick={handleRestoreSession}
                disabled={isLoading || !restorePublicId.trim() || !restorePassword.trim()}
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                {isLoading ? 'Restaurando...' : '🔄 Restaurar Sessão'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}