'use client';

import React from 'react';
import { useSimpleSSE } from '../contexts/SimpleSSEContext';

export const WinnerDisplay: React.FC = () => {
  const { winner } = useSimpleSSE();

  if (!winner) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center animate-bounce">
        <div className="text-6xl mb-4">🏆</div>
        
        <h2 className="text-3xl font-bold text-gray-800 mb-2">
          TEMPO ESGOTADO!
        </h2>
        
        <div className="mb-6">
          <p className="text-lg text-gray-600 mb-2">Palavra Ganhadora:</p>
          <div 
            className="text-4xl font-bold py-4 px-6 rounded-lg text-white mb-2"
            style={{ backgroundColor: winner.color }}
          >
            {winner.word}
          </div>
          <p className="text-xl text-gray-700">
            com <span className="font-bold">{winner.count}</span> menções
          </p>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Nova Rodada
        </button>
      </div>
    </div>
  );
};
