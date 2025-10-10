'use client';

import React, { useState, useEffect } from 'react';
import { useSimpleSSE } from '../contexts/SimpleSSEContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, bannedWords, updateSettings } = useSimpleSSE();
  const [activeTab, setActiveTab] = useState<'general' | 'banned'>('general');
  const [wordLimit, setWordLimit] = useState(10);
  const [bannedWordInput, setBannedWordInput] = useState('');
  const [localBannedWords, setLocalBannedWords] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setWordLimit(settings.wordLimit);
      setLocalBannedWords([...bannedWords]);
    }
  }, [isOpen, settings.wordLimit, bannedWords]);

  const handleSaveGeneral = async () => {
    await updateSettings({ wordLimit });
    onClose();
  };

  const handleAddBannedWord = () => {
    const word = bannedWordInput.trim().toLowerCase();
    if (word && !localBannedWords.includes(word)) {
      setLocalBannedWords([...localBannedWords, word]);
      setBannedWordInput('');
    }
  };

  const handleRemoveBannedWord = (word: string) => {
    setLocalBannedWords(localBannedWords.filter(w => w !== word));
  };

  const handleSaveBannedWords = async () => {
    await updateSettings({ bannedWords: localBannedWords });
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddBannedWord();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">⚙️ Configurações</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('general')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'general'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            📊 Configurações Gerais
          </button>
          <button
            onClick={() => setActiveTab('banned')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'banned'
                ? 'bg-white text-red-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            🚫 Palavras Banidas
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantidade de Palavras na Lista
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={wordLimit}
                  onChange={(e) => setWordLimit(parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="text-lg font-semibold text-blue-600 min-w-[3rem] text-center">
                  {wordLimit}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Configure quantas palavras aparecem no ranking (1-50)
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveGeneral}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Salvar
              </button>
            </div>
          </div>
        )}

        {activeTab === 'banned' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adicionar Palavra Banida
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={bannedWordInput}
                  onChange={(e) => setBannedWordInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Digite a palavra para banir"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <button
                  onClick={handleAddBannedWord}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Adicionar
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Palavras Banidas ({localBannedWords.length})
              </h3>
              {localBannedWords.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-3xl mb-2">🚫</div>
                  <p>Nenhuma palavra banida</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {localBannedWords.map((word, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg"
                    >
                      <span className="font-medium text-red-800">{word}</span>
                      <button
                        onClick={() => handleRemoveBannedWord(word)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveBannedWords}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Salvar Palavras Banidas
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
