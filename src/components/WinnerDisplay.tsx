'use client';

import React, { useState } from 'react';
import { useSimpleSSE } from '../contexts/SimpleSSEContext';

export const WinnerDisplay: React.FC = () => {
  const { winner } = useSimpleSSE();
  const [isVisible, setIsVisible] = useState(true);

  if (!winner || !isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="glass rounded-2xl p-8 max-w-lg mx-4 text-center animate-bounce border border-white border-opacity-20">
        <div className="text-6xl mb-4">🏆</div>
        
        <h2 className="text-3xl font-bold text-white mb-4">
          TEMPO ESGOTADO!
        </h2>
        
        <div className="mb-6">
          <p className="text-lg text-gray-300 mb-3">Palavra Ganhadora:</p>
          <div 
            className="text-4xl font-bold py-6 px-8 rounded-xl text-white mb-3 shadow-lg"
            style={{ backgroundColor: winner.color }}
          >
            {winner.word}
          </div>
          <p className="text-xl text-gray-200">
            com <span className="font-bold text-yellow-400">{winner.count}</span> menções
          </p>
        </div>

        <div className="flex space-x-3 justify-center">
          <button
            onClick={() => setIsVisible(false)}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Fechar
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Nova Rodada
          </button>
        </div>
      </div>
    </div>
  );
};
