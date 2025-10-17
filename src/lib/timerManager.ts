import { RedisSessionManager } from './redisSessionManager';
import { publishToSession } from './sessionChannelManager';

export interface TimerData {
  duration: number; // em segundos
  startTime: number; // timestamp
  isActive: boolean;
  endTime: number; // timestamp
}

export interface WinnerData {
  word: string;
  count: number;
  color: string;
}

export class TimerManager {
  private static instance: TimerManager;
  private timers = new Map<string, NodeJS.Timeout>();
  private updateIntervals = new Map<string, NodeJS.Timeout>();
  private redisSessionManager = RedisSessionManager.getInstance();

  static getInstance(): TimerManager {
    if (!TimerManager.instance) {
      TimerManager.instance = new TimerManager();
    }
    return TimerManager.instance;
  }

  async startTimer(sessionId: string, duration: number): Promise<void> {
    const startTime = Date.now();
    
    // Salvar timer no Redis
    await this.redisSessionManager.updateSession(sessionId, {
      timer: {
        duration,
        startTime,
        isActive: true,
        endTime: startTime + (duration * 1000)
      }
    });
    
    // Notificar início do timer
    await this.notifyTimerUpdate(sessionId, {
      isActive: true,
      remainingTime: duration,
      duration
    });
    
    // Configurar timeout para finalizar automaticamente
    const timeout = setTimeout(async () => {
      await this.finishTimer(sessionId);
    }, duration * 1000);
    
    this.timers.set(sessionId, timeout);
    
    // Configurar intervalo para atualizações periódicas
    const updateInterval = setInterval(async () => {
      const remainingTime = await this.getRemainingTime(sessionId);
      if (remainingTime > 0) {
        await this.notifyTimerUpdate(sessionId, {
          isActive: true,
          remainingTime,
          duration
        });
      } else {
        clearInterval(updateInterval);
        this.updateIntervals.delete(sessionId);
      }
    }, 1000); // Atualizar a cada segundo
    
    this.updateIntervals.set(sessionId, updateInterval);
    
    console.log(`Timer started for session ${sessionId}: ${duration}s`);
  }

  async stopTimer(sessionId: string): Promise<void> {
    const timeout = this.timers.get(sessionId);
    if (timeout) {
      clearTimeout(timeout);
      this.timers.delete(sessionId);
    }
    
    const updateInterval = this.updateIntervals.get(sessionId);
    if (updateInterval) {
      clearInterval(updateInterval);
      this.updateIntervals.delete(sessionId);
    }
    
    await this.redisSessionManager.updateSession(sessionId, {
      timer: undefined
    });
    
    // Notificar parada do timer
    await this.notifyTimerUpdate(sessionId, null);
    
    console.log(`Timer stopped for session ${sessionId}`);
  }

  async getTimer(sessionId: string): Promise<TimerData | null> {
    const session = await this.redisSessionManager.getSession(sessionId);
    return session?.timer || null;
  }

  async getRemainingTime(sessionId: string): Promise<number> {
    const timer = await this.getTimer(sessionId);
    if (!timer || !timer.isActive) {
      return 0;
    }
    
    const now = Date.now();
    const remaining = Math.max(0, timer.endTime - now);
    return Math.ceil(remaining / 1000);
  }

  async isTimerActive(sessionId: string): Promise<boolean> {
    const timer = await this.getTimer(sessionId);
    return timer ? timer.isActive && Date.now() < timer.endTime : false;
  }

  private async finishTimer(sessionId: string): Promise<void> {
    try {
      // Obter palavra ganhadora
      const stats = await this.redisSessionManager.getSessionStats(sessionId);
      
      if (stats && stats.topWords.length > 0) {
        const winner = stats.topWords[0];
        
        const winnerData: WinnerData = {
          word: winner.word,
          count: winner.count,
          color: '#FFD700' // Dourado padrão
        };
        
        // Salvar resultado
        await this.redisSessionManager.updateSession(sessionId, {
          winner: winnerData,
          timer: undefined
        });
        
        // Parar timer
        await this.stopTimer(sessionId);
        
        // Notificar clientes
        await this.notifyTimerFinished(sessionId, winnerData);
        
        console.log(`Timer finished for session ${sessionId}. Winner: ${winner.word} (${winner.count})`);
      }
    } catch (error) {
      console.error('Error finishing timer:', error);
    }
  }

  private async notifyTimerUpdate(sessionId: string, timer: { isActive: boolean; remainingTime: number; duration: number } | null): Promise<void> {
    const eventData = {
      type: 'timerUpdate',
      sessionId,
      timer,
      timestamp: Date.now()
    };
    
    publishToSession(sessionId, eventData);
  }

  private async notifyTimerFinished(sessionId: string, winner: WinnerData): Promise<void> {
    const eventData = {
      type: 'timerFinished',
      sessionId,
      winner,
      timestamp: Date.now()
    };
    
    publishToSession(sessionId, eventData);
  }

  async adjustTimer(sessionId: string, newRemainingTime: number): Promise<void> {
    // Obter dados atuais da sessão
    const sessionData = await this.redisSessionManager.getSession(sessionId);
    if (!sessionData?.timer) {
      throw new Error('Timer não encontrado');
    }

    const currentTimer = sessionData.timer;
    const newEndTime = Date.now() + (newRemainingTime * 1000);

    // Limpar timeout anterior
    const oldTimeout = this.timers.get(sessionId);
    if (oldTimeout) {
      clearTimeout(oldTimeout);
      this.timers.delete(sessionId);
    }

    // Atualizar timer no Redis
    await this.redisSessionManager.updateSession(sessionId, {
      timer: {
        ...currentTimer,
        endTime: newEndTime,
        duration: newRemainingTime
      }
    });

    // Se o novo tempo for maior que 0, configurar novo timeout
    if (newRemainingTime > 0) {
      const newTimeout = setTimeout(async () => {
        await this.finishTimer(sessionId);
      }, newRemainingTime * 1000);
      
      this.timers.set(sessionId, newTimeout);
    } else {
      // Se o tempo chegou a 0 ou menos, finalizar imediatamente
      await this.finishTimer(sessionId);
    }

    // Notificar atualização
    await this.notifyTimerUpdate(sessionId, {
      isActive: newRemainingTime > 0,
      remainingTime: Math.max(0, newRemainingTime),
      duration: Math.max(0, newRemainingTime)
    });

    console.log(`Timer adjusted for session ${sessionId}: ${newRemainingTime}s remaining`);
  }
}
