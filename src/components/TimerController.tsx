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
    <div className="glass rounded-2xl p-4" style={{ height: 'fit-content' }}>
      <div className="text-center flex flex-col">
        <h3 className="text-lg font-bold text-white mb-3">
          ⏱️ Temporizador
        </h3>

        {/* Tempo restante */}
        <div className="mb-4 flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className={`text-4xl font-mono font-bold ${
              timer?.isActive 
                ? timer.remainingTime <= 10 
                  ? 'text-red-400 animate-pulse' 
                  : 'text-blue-400'
                : 'text-gray-400'
            }`}>
              {timer ? formatTime(timer.remainingTime) : '00:00'}
            </div>
            <p className="text-xs text-gray-300 mt-1">
              {timer?.isActive ? 'Tempo restante' : 'Temporizador parado'}
            </p>
          </div>
        </div>

        {/* Controles */}
        <div className="space-y-3">
          {!timer?.isActive ? (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Duração (segundos)
                </label>
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 1))}
                    min="1"
                    max="3600"
                    className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <div className="flex space-x-1">
                    <button
                      onClick={() => setDuration(30)}
                      className="px-1 py-1 text-xs bg-gray-600 hover:bg-gray-500 rounded text-white"
                    >
                      30s
                    </button>
                    <button
                      onClick={() => setDuration(60)}
                      className="px-1 py-1 text-xs bg-gray-600 hover:bg-gray-500 rounded text-white"
                    >
                      1m
                    </button>
                    <button
                      onClick={() => setDuration(300)}
                      className="px-1 py-1 text-xs bg-gray-600 hover:bg-gray-500 rounded text-white"
                    >
                      5m
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={handleStartTimer}
                disabled={isLoading}
                className="w-full px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                {isLoading ? 'Iniciando...' : '🚀 Iniciar'}
              </button>
            </>
          ) : (
            <button
              onClick={stopTimer}
              className="w-full px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              ⏹️ Parar
            </button>
          )}

          {/* Status */}
          <div className="flex items-center justify-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              timer?.isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
            }`}></div>
            <span className="text-xs text-gray-300">
              {timer?.isActive ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
