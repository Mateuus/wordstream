'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface TimerControllerProps {
  sessionId: string;
  className?: string;
}

export const TimerController: React.FC<TimerControllerProps> = ({ 
  sessionId, 
  className = '' 
}) => {
  const [duration, setDuration] = useState(60); // 1 minuto padrão
  const [remainingTime, setRemainingTime] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Atualizar tempo restante a cada segundo
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isActive && remainingTime > 0) {
      interval = setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1) {
            setIsActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, remainingTime]);

  const fetchTimerStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/timer?sessionId=${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setDuration(data.duration || 0);
        setRemainingTime(data.remainingTime || 0);
        setIsActive(data.isActive || false);
      }
    } catch (error) {
      console.error('Error fetching timer status:', error);
    }
  }, [sessionId]);

  // Verificar status do timer ao carregar
  useEffect(() => {
    fetchTimerStatus();
  }, [sessionId, fetchTimerStatus]);


  const startTimer = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/timer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, duration })
      });

      if (response.ok) {
        setIsActive(true);
        setRemainingTime(duration);
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao iniciar temporizador');
      }
    } catch (error) {
      console.error('Error starting timer:', error);
      alert('Erro ao iniciar temporizador');
    } finally {
      setIsLoading(false);
    }
  };

  const stopTimer = async () => {
    try {
      const response = await fetch(`/api/timer?sessionId=${sessionId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setIsActive(false);
        setRemainingTime(0);
      }
    } catch (error) {
      console.error('Error stopping timer:', error);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-800 mb-4">
          ⏱️ Temporizador
        </h3>

        {/* Tempo restante */}
        <div className="mb-6">
          <div className={`text-4xl font-mono font-bold ${
            isActive 
              ? remainingTime <= 10 
                ? 'text-red-600 animate-pulse' 
                : 'text-blue-600'
              : 'text-gray-400'
          }`}>
            {formatTime(remainingTime)}
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {isActive ? 'Tempo restante' : 'Temporizador parado'}
          </p>
        </div>

        {/* Controles */}
        {!isActive ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duração (segundos)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  max="3600"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex space-x-1">
                  <button
                    onClick={() => setDuration(30)}
                    className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
                  >
                    30s
                  </button>
                  <button
                    onClick={() => setDuration(60)}
                    className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
                  >
                    1m
                  </button>
                  <button
                    onClick={() => setDuration(300)}
                    className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
                  >
                    5m
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={startTimer}
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
            isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
          }`}></div>
          <span className="text-sm text-gray-600">
            {isActive ? 'Ativo' : 'Inativo'}
          </span>
        </div>
      </div>
    </div>
  );
};
