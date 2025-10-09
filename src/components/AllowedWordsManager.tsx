'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface AllowedWord {
  word: string;
  color: string;
  createdAt: Date;
}

interface AllowedWordsManagerProps {
  sessionId: string;
  className?: string;
}

export const AllowedWordsManager: React.FC<AllowedWordsManagerProps> = ({ 
  sessionId, 
  className = '' 
}) => {
  const [allowedWords, setAllowedWords] = useState<AllowedWord[]>([]);
  const [newWord, setNewWord] = useState('');
  const [newColor, setNewColor] = useState('#FF0000');
  const [onlyAllowedWords, setOnlyAllowedWords] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAllowedWords = useCallback(async () => {
    try {
      const response = await fetch(`/api/allowed-words?sessionId=${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setAllowedWords(data.allowedWords || []);
      }
    } catch (error) {
      console.error('Error fetching allowed words:', error);
    }
  }, [sessionId]);

  // Buscar palavras permitidas ao carregar
  useEffect(() => {
    fetchAllowedWords();
  }, [sessionId, fetchAllowedWords]);

  const addWord = async () => {
    if (!newWord.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/allowed-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, word: newWord, color: newColor })
      });

      if (response.ok) {
        setNewWord('');
        setNewColor('#FF0000');
        await fetchAllowedWords();
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao adicionar palavra');
      }
    } catch (error) {
      console.error('Error adding word:', error);
      alert('Erro ao adicionar palavra');
    } finally {
      setIsLoading(false);
    }
  };

  const removeWord = async (word: string) => {
    try {
      const response = await fetch(`/api/allowed-words?sessionId=${sessionId}&word=${encodeURIComponent(word)}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchAllowedWords();
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao remover palavra');
      }
    } catch (error) {
      console.error('Error removing word:', error);
      alert('Erro ao remover palavra');
    }
  };

  const toggleOnlyAllowedWords = async () => {
    try {
      const response = await fetch('/api/allowed-words', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, onlyAllowedWords: !onlyAllowedWords })
      });

      if (response.ok) {
        setOnlyAllowedWords(!onlyAllowedWords);
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao alterar modo');
      }
    } catch (error) {
      console.error('Error toggling mode:', error);
      alert('Erro ao alterar modo');
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-800 mb-4">
          🎨 Palavras Permitidas
        </h3>

        {/* Modo apenas palavras permitidas */}
        <div className="mb-6">
          <label className="flex items-center justify-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyAllowedWords}
              onChange={toggleOnlyAllowedWords}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              Contar apenas palavras permitidas
            </span>
          </label>
        </div>

        {/* Adicionar nova palavra */}
        <div className="space-y-3 mb-6">
          <div className="flex space-x-2">
            <input
              type="text"
              value={newWord}
              onChange={(e) => setNewWord(e.target.value.toUpperCase())}
              placeholder="Digite a palavra"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="w-12 h-10 border border-gray-300 rounded-md cursor-pointer"
            />
          </div>
          <button
            onClick={addWord}
            disabled={isLoading || !newWord.trim()}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Adicionando...' : '➕ Adicionar Palavra'}
          </button>
        </div>

        {/* Lista de palavras */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {allowedWords.length === 0 ? (
            <p className="text-gray-500 text-sm">Nenhuma palavra adicionada</p>
          ) : (
            allowedWords.map((word, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded border"
                    style={{ backgroundColor: word.color }}
                  ></div>
                  <span className="font-semibold text-gray-800">{word.word}</span>
                </div>
                <button
                  onClick={() => removeWord(word.word)}
                  className="px-2 py-1 text-sm bg-red-100 text-red-600 hover:bg-red-200 rounded transition-colors"
                >
                  🗑️
                </button>
              </div>
            ))
          )}
        </div>

        {/* Palavras pré-definidas */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-600 mb-2">Palavras Pré-definidas:</p>
          <div className="flex flex-wrap gap-2">
            {['RED', 'BLUE', 'DRAW', 'EMPATE', 'VERMELHO', 'AZUL'].map((word) => (
              <button
                key={word}
                onClick={() => {
                  setNewWord(word);
                  setNewColor(word === 'RED' || word === 'VERMELHO' ? '#FF0000' : 
                             word === 'BLUE' || word === 'AZUL' ? '#0000FF' : '#FFFF00');
                }}
                className="px-2 py-1 text-xs bg-blue-200 text-blue-800 hover:bg-blue-300 rounded transition-colors"
              >
                {word}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
