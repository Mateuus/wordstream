'use client';

import React, { useState } from 'react';
import { useSimpleSSE } from '../contexts/SimpleSSEContext';

export const TimerController: React.FC = () => {
  const { timer, startTimer, stopTimer, clearCounter } = useSimpleSSE();
  const [duration, setDuration] = useState(60); // 1 minuto padrão
  const [isLoading, setIsLoading] = useState(false);

  const handleStartTimer = async () => {
    setIsLoading(true);
    try {
      // Limpar contador antes de iniciar o temporizador
      await clearCounter();
      await startTimer(duration);
    } catch (error) {
      console.error('Erro ao iniciar temporizador:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="glass rounded-2xl p-4 sm:p-6">
      <div className="text-center">
        <h3 className="text-lg font-bold text-white mb-4">
          ⏱️ Temporizador
        </h3>

        {/* Tempo restante */}
        <div className="mb-6">
          <div className={`text-3xl sm:text-4xl font-mono font-bold ${
            timer?.isActive 
              ? timer.remainingTime <= 10 
                ? 'text-red-400 animate-pulse' 
                : 'text-blue-400'
              : 'text-gray-400'
          }`}>
            {timer ? formatTime(timer.remainingTime) : '00:00'}
          </div>
          <p className="text-sm text-gray-300 mt-2">
            {timer?.isActive ? 'Tempo restante' : 'Temporizador parado'}
          </p>
        </div>

        {/* Controles */}
        {!timer?.isActive ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Duração (segundos)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  max="3600"
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex space-x-1">
                  <button
                    onClick={() => setDuration(30)}
                    className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-500 rounded text-white"
                  >
                    30s
                  </button>
                  <button
                    onClick={() => setDuration(60)}
                    className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-500 rounded text-white"
                  >
                    1m
                  </button>
                  <button
                    onClick={() => setDuration(300)}
                    className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-500 rounded text-white"
                  >
                    5m
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={handleStartTimer}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Iniciando...' : '🚀 Iniciar Temporizador'}
            </button>
          </div>
        ) : (
          <button
            onClick={stopTimer}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            ⏹️ Parar Temporizador
          </button>
        )}

        {/* Status */}
        <div className="mt-4 flex items-center justify-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            timer?.isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
          }`}></div>
          <span className="text-sm text-gray-300">
            {timer?.isActive ? 'Ativo' : 'Inativo'}
          </span>
        </div>
      </div>
    </div>
  );
};
