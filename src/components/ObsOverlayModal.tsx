'use client';

import React, { useState, useEffect } from 'react';

interface ObsOverlayModalProps {
  isOpen: boolean;
  onClose: () => void;
  publicId: string;
  channel?: string;
}

export const ObsOverlayModal: React.FC<ObsOverlayModalProps> = ({ 
  isOpen, 
  onClose, 
  publicId, 
  channel = 'canal' 
}) => {
  const [timerDuration, setTimerDuration] = useState(60);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // URLs dos overlays
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const top5Url = `${baseUrl}/obs/top5/${publicId}?overlay=true`;
  const timerUrl = `${baseUrl}/obs/timer/${publicId}?overlay=true`;

  // Função para copiar URL
  const copyToClipboard = async (url: string, type: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(type);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
  };

  // Reset ao abrir o modal
  useEffect(() => {
    if (isOpen) {
      setCopiedUrl(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="text-3xl">🎬</div>
            <div>
              <h2 className="text-2xl font-bold text-white">Overlays OBS</h2>
              <p className="text-gray-400 text-sm">Configure e copie os links para usar no OBS</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl transition-colors"
          >
            ×
          </button>
        </div>

        {/* Configurações */}
        <div className="bg-gray-800 bg-opacity-50 rounded-xl p-4 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">⚙️ Configurações</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Duração do Timer (segundos):
              </label>
              <input
                type="number"
                value={timerDuration}
                onChange={(e) => setTimerDuration(parseInt(e.target.value) || 60)}
                min="10"
                max="600"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Canal:
              </label>
              <div className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-300">
                {channel}
              </div>
            </div>
          </div>
        </div>

        {/* Overlays */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top 5 Overlay */}
          <div className="bg-gray-800 bg-opacity-50 rounded-xl p-4">
            <div className="flex items-center space-x-2 mb-4">
              <div className="text-2xl">🏆</div>
              <h3 className="text-lg font-semibold text-white">Top 5 Palavras</h3>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  URL do Overlay:
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={top5Url}
                    readOnly
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-green-400 text-sm font-mono"
                  />
                  <button
                    onClick={() => copyToClipboard(top5Url, 'top5')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      copiedUrl === 'top5' 
                        ? 'bg-green-600 text-white' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {copiedUrl === 'top5' ? '✓ Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>

              <div className="bg-gray-700 bg-opacity-50 rounded-lg p-3">
                <h4 className="text-sm font-medium text-gray-300 mb-2">📋 Configurações OBS:</h4>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• Largura: 400px</li>
                  <li>• Altura: 600px</li>
                  <li>• Desabilitar cache: ✓</li>
                  <li>• Atualização: Tempo real</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Timer Overlay */}
          <div className="bg-gray-800 bg-opacity-50 rounded-xl p-4">
            <div className="flex items-center space-x-2 mb-4">
              <div className="text-2xl">⏰</div>
              <h3 className="text-lg font-semibold text-white">Timer com Resultado</h3>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  URL do Overlay:
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={timerUrl}
                    readOnly
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-green-400 text-sm font-mono"
                  />
                  <button
                    onClick={() => copyToClipboard(timerUrl, 'timer')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      copiedUrl === 'timer' 
                        ? 'bg-green-600 text-white' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {copiedUrl === 'timer' ? '✓ Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>

              <div className="bg-gray-700 bg-opacity-50 rounded-lg p-3">
                <h4 className="text-sm font-medium text-gray-300 mb-2">📋 Configurações OBS:</h4>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• Largura: 600px</li>
                  <li>• Altura: 400px</li>
                  <li>• Desabilitar cache: ✓</li>
                  <li>• Duração: {timerDuration}s</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Instruções */}
        <div className="bg-gray-800 bg-opacity-50 rounded-xl p-4 mt-6">
          <h3 className="text-lg font-semibold text-white mb-4">📖 Como usar no OBS</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-3">1. Adicionar Fonte</h4>
              <ol className="text-sm text-gray-400 space-y-2">
                <li>1. Clique em &quot;+&quot; na lista de fontes</li>
                <li>2. Selecione &quot;Navegador&quot;</li>
                <li>3. Dê um nome (ex: &quot;Top 5 Palavras&quot;)</li>
                <li>4. Clique em &quot;OK&quot;</li>
              </ol>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-3">2. Configurar</h4>
              <ol className="text-sm text-gray-400 space-y-2">
                <li>1. Cole a URL copiada</li>
                <li>2. Defina largura e altura</li>
                <li>3. Marque &quot;Desabilitar cache&quot;</li>
                <li>4. Clique em &quot;OK&quot;</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-gray-800 bg-opacity-50 rounded-xl p-4 mt-6">
          <h3 className="text-lg font-semibold text-white mb-4">👁️ Preview dos Overlays</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">Top 5 Palavras</h4>
              <div className="bg-black rounded-lg overflow-hidden" style={{ height: '200px' }}>
                <iframe
                  src={top5Url}
                  className="w-full h-full border-0"
                  title="Top 5 Preview"
                />
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">Timer com Resultado</h4>
              <div className="bg-black rounded-lg overflow-hidden" style={{ height: '200px' }}>
                <iframe
                  src={timerUrl}
                  className="w-full h-full border-0"
                  title="Timer Preview"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
