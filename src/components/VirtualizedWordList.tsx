'use client';

import React, { useMemo } from 'react';

interface WordCount {
  word: string;
  count: number;
  lastSeen: Date;
}

interface WordItemProps {
  wordCount: WordCount;
  index: number;
  bannedWords: string[];
  onBanWord: (word: string) => void;
  onExcludeWord: (word: string) => void;
  onUnbanWord: (word: string) => void;
  maxCount: number;
}

const WordItem: React.FC<WordItemProps> = React.memo(({ 
  wordCount, 
  index, 
  bannedWords, 
  onBanWord, 
  onExcludeWord, 
  onUnbanWord, 
  maxCount 
}) => {
  const isBanned = bannedWords.includes(wordCount.word);
  
  // Calcular largura da barra de progresso
  const progressWidth = useMemo(() => {
    return Math.min(100, (wordCount.count / maxCount) * 100);
  }, [wordCount.count, maxCount]);

  return (
    <div className="px-2 py-0.5">
      <div
        className={`flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
          isBanned ? 'bg-red-900 bg-opacity-30 border border-red-500' : 
          'bg-white bg-opacity-5 hover:bg-opacity-10'
        }`}
      >
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          <span className="text-xs text-gray-600 font-mono w-6 text-center">
            #{index + 1}
          </span>
          <span className={`font-semibold text-sm truncate ${
            isBanned ? 'text-red-300 line-through' : 'text-gray-800'
          }`}>
            {wordCount.word}
          </span>
          {isBanned && <span className="text-red-400 text-xs">🚫</span>}
        </div>
        
        <div className="flex items-center space-x-2">
          <span className={`font-bold text-sm ${
            isBanned ? 'text-red-400' : 'text-blue-600'
          }`}>
            {wordCount.count}
          </span>
          <div className="w-12 bg-white bg-opacity-20 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                isBanned ? 'bg-red-500' :
                'bg-gradient-to-r from-blue-500 to-purple-500'
              }`}
              style={{ width: `${progressWidth}%` }}
            />
          </div>
          
          {/* Botões de ação */}
          <div className="flex items-center space-x-1">
            {isBanned ? (
              <button
                onClick={() => onUnbanWord(wordCount.word)}
                className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                title="Desbanir palavra (permanente)"
              >
                ✅
              </button>
            ) : (
              <>
                <button
                  onClick={() => onBanWord(wordCount.word)}
                  className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                  title="Banir palavra (permanente)"
                >
                  🚫
                </button>
                <button
                  onClick={() => onExcludeWord(wordCount.word)}
                  className="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded transition-colors"
                  title="Excluir palavra (pode voltar)"
                >
                  ❌
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

WordItem.displayName = 'WordItem';

interface VirtualizedWordListProps {
  words: WordCount[];
  bannedWords: string[];
  onBanWord: (word: string) => void;
  onExcludeWord: (word: string) => void;
  onUnbanWord: (word: string) => void;
  height?: number;
  itemHeight?: number;
}

export const VirtualizedWordList: React.FC<VirtualizedWordListProps> = React.memo(({
  words,
  bannedWords,
  onBanWord,
  onExcludeWord,
  onUnbanWord,
  height = 400,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  itemHeight = 60
}) => {
  // Calcular o máximo de contagem para normalizar as barras de progresso
  const maxCount = useMemo(() => {
    return Math.max(...words.map(w => w.count), 1);
  }, [words]);

  if (words.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-3xl mb-3">📊</div>
        <h4 className="text-sm font-semibold text-white mb-1">
          Aguardando palavras...
        </h4>
        <p className="text-gray-400 text-xs">
          As palavras mencionadas no chat aparecerão aqui
        </p>
      </div>
    );
  }

  return (
    <div 
      className="w-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200"
      style={{ height: `${height}px` }}
    >
      <div className="space-y-0">
        {words.map((wordCount, index) => (
          <WordItem
            key={wordCount.word}
            wordCount={wordCount}
            index={index}
            bannedWords={bannedWords}
            onBanWord={onBanWord}
            onExcludeWord={onExcludeWord}
            onUnbanWord={onUnbanWord}
            maxCount={maxCount}
          />
        ))}
      </div>
    </div>
  );
});

VirtualizedWordList.displayName = 'VirtualizedWordList';
