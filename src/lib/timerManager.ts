import { RedisSessionManager } from './redisSessionManager';
import { broadcastToChannel } from './simpleSSEManager';

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
    
    // Configurar timeout para finalizar automaticamente
    const timeout = setTimeout(async () => {
      await this.finishTimer(sessionId);
    }, duration * 1000);
    
    this.timers.set(sessionId, timeout);
    
    console.log(`Timer started for session ${sessionId}: ${duration}s`);
  }

  async stopTimer(sessionId: string): Promise<void> {
    const timeout = this.timers.get(sessionId);
    if (timeout) {
      clearTimeout(timeout);
      this.timers.delete(sessionId);
    }
    
    await this.redisSessionManager.updateSession(sessionId, {
      timer: null
    });
    
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
          timer: null
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

  private async notifyTimerFinished(sessionId: string, winner: WinnerData): Promise<void> {
    const eventData = {
      type: 'timerFinished',
      sessionId,
      winner,
      timestamp: Date.now()
    };
    
    broadcastToChannel(sessionId, eventData);
  }
}
