'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface TimerState {
  isActive: boolean;
  remainingTime: number;
  duration: number;
}

interface WinnerState {
  word: string;
  count: number;
  color: string;
}

interface SettingsState {
  wordLimit: number;
}

interface TimerContextType {
  timer: TimerState | null;
  winner: WinnerState | null;
  settings: SettingsState;
  startTimer: (duration: number) => Promise<void>;
  stopTimer: () => Promise<void>;
  clearCounter: () => Promise<void>;
  updateSettings: (settings: Partial<SettingsState>) => Promise<void>;
  updateTimer: (timer: TimerState | null) => void;
  updateWinner: (winner: WinnerState | null) => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

interface TimerProviderProps {
  children: React.ReactNode;
  onStartTimer: (duration: number) => Promise<void>;
  onStopTimer: () => Promise<void>;
  onClearCounter: () => Promise<void>;
  onUpdateSettings: (settings: Partial<SettingsState>) => Promise<void>;
}

export function TimerProvider({ 
  children, 
  onStartTimer, 
  onStopTimer, 
  onClearCounter, 
  onUpdateSettings 
}: TimerProviderProps) {
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [winner, setWinner] = useState<WinnerState | null>(null);
  const [settings, setSettings] = useState<SettingsState>({ wordLimit: 10 });

  const updateTimer = useCallback((newTimer: TimerState | null) => {
    setTimer(newTimer);
  }, []);

  const updateWinner = useCallback((newWinner: WinnerState | null) => {
    setWinner(newWinner);
  }, []);

  const startTimer = useCallback(async (duration: number) => {
    await onStartTimer(duration);
    setTimer({
      isActive: true,
      remainingTime: duration,
      duration
    });
  }, [onStartTimer]);

  const stopTimer = useCallback(async () => {
    await onStopTimer();
    setTimer(null);
  }, [onStopTimer]);

  const clearCounter = useCallback(async () => {
    await onClearCounter();
    setWinner(null);
  }, [onClearCounter]);

  const updateSettings = useCallback(async (newSettings: Partial<SettingsState>) => {
    await onUpdateSettings(newSettings);
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, [onUpdateSettings]);

  const value: TimerContextType = {
    timer,
    winner,
    settings,
    startTimer,
    stopTimer,
    clearCounter,
    updateSettings,
    updateTimer,
    updateWinner,
  };

  return (
    <TimerContext.Provider value={value}>
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const context = useContext(TimerContext);
  if (context === undefined) {
    throw new Error('useTimer deve ser usado dentro de um TimerProvider');
  }
  return context;
}
