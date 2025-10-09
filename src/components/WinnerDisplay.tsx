'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface WinnerData {
  word: string;
  count: number;
  color: string;
}

interface WinnerDisplayProps {
  sessionId: string;
  className?: string;
}

export const WinnerDisplay: React.FC<WinnerDisplayProps> = ({ 
  sessionId, 
  className = '' 
}) => {
  const [winner, setWinner] = useState<WinnerData | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const fetchWinner = useCallback(async () => {
    try {
      const response = await fetch(`/api/sessions?sessionId=${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.winner) {
          setWinner(data.winner);
          setIsVisible(true);
        }
      }
    } catch (error) {
      console.error('Error fetching winner:', error);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchWinner();
  }, [sessionId, fetchWinner]);

  if (!winner || !isVisible) {
    return null;
  }

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${className}`}>
      <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center animate-bounce">
        <div className="text-6xl mb-4">🏆</div>
        
        <h2 className="text-3xl font-bold text-gray-800 mb-2">
          TEMPO ESGOTADO!
        </h2>
        
        <div className="mb-6">
          <p className="text-lg text-gray-600 mb-2">Palavra Ganhadora:</p>
          <div 
            className="text-4xl font-bold py-4 px-6 rounded-lg text-white"
            style={{ backgroundColor: winner.color }}
          >
            {winner.word}
          </div>
          <p className="text-xl text-gray-700 mt-2">
            com <span className="font-bold">{winner.count}</span> menções
          </p>
        </div>

        <button
          onClick={() => setIsVisible(false)}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Fechar
        </button>
      </div>
    </div>
  );
};
