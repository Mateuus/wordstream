'use client';

import { useState } from 'react';
import { SimpleSSEProvider } from '@/src/contexts/SimpleSSEContext';

export default function Home() {
  const [channel, setChannel] = useState<string>('');
  const [platform, setPlatform] = useState<'twitch' | 'kick'>('twitch');

  const handleGoToChat = () => {
    if (!channel.trim()) return;
    window.location.href = `/chat/${channel.trim()}`;
  };

  return (
    <SimpleSSEProvider>
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
                  <div className="text-9xl mb-8 animate-float">🏆</div>
                  {/* Efeito de brilho ao redor do emoji */}
                  <div className="absolute inset-0 text-9xl animate-pulse opacity-30 blur-sm">🏆</div>
                </div>
                
                <h1 className="text-7xl md:text-8xl font-bold text-white mb-6 text-shadow">
                  <span className="text-gradient bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                    WordStream
                  </span>
                </h1>
                
                <p className="text-2xl md:text-3xl text-gray-300 mb-4 leading-relaxed">
                  Contador de palavras em tempo real
                </p>
                <p className="text-lg text-gray-400 mb-12 max-w-3xl mx-auto">
                  Processamento centralizado no servidor com atualizações instantâneas via SSE. 
                  Conecte-se ao chat da Twitch ou Kick e veja as palavras mais mencionadas em tempo real.
                </p>
              </div>

              {/* Botões de ação principais */}
              <div className="mb-20 animate-slide-in-up">
                <div className="flex flex-col lg:flex-row gap-6 items-center justify-center">
                  
                  {/* Seleção de Plataforma */}
                  <div className="flex items-center space-x-3">
                    <select
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value as 'twitch' | 'kick')}
                      className="px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="twitch">🎮 Twitch</option>
                      <option value="kick">⚡ Kick</option>
                    </select>
                  </div>
                  
                  {/* Input do Canal */}
                  <div className="flex items-center space-x-3">
                    <input
                      type="text"
                      value={channel}
                      onChange={(e) => setChannel(e.target.value)}
                      placeholder={`Nome do canal no ${platform === 'twitch' ? 'Twitch' : 'Kick'}`}
                      className="px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all min-w-64"
                      onKeyPress={(e) => e.key === 'Enter' && handleGoToChat()}
                    />
                    <button
                      onClick={handleGoToChat}
                      disabled={!channel.trim()}
                      className="group relative overflow-hidden px-6 py-3 bg-white text-black font-semibold rounded-full border-0 shadow-lg hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-500 transform hover:scale-105 hover:-translate-y-1"
                    >
                      {/* Background animado */}
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      
                      <span className="relative z-10 flex items-center space-x-2 text-base">
                        <span className="text-lg">🚀</span>
                        <span>Ir para Chat</span>
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
      </div>
    </SimpleSSEProvider>
  );
}