import { cacheManager } from './redis';
import { TimerData, WinnerData } from '../types';

export class TimerManager {
  private static instance: TimerManager;
  private timers = new Map<string, NodeJS.Timeout>();

  static getInstance(): TimerManager {
    if (!TimerManager.instance) {
      TimerManager.instance = new TimerManager();
    }
    return TimerManager.instance;
  }

  async startTimer(sessionId: string, duration: number): Promise<void> {
    const startTime = Date.now();
    
    // Salvar timer no Redis
    await cacheManager.setTimer(sessionId, duration, startTime);
    
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
    
    await cacheManager.stopTimer(sessionId);
    console.log(`Timer stopped for session ${sessionId}`);
  }

  async getTimer(sessionId: string): Promise<TimerData | null> {
    return await cacheManager.getTimer(sessionId);
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
      const topWords = await cacheManager.getTopWords(sessionId, 1);
      
      if (topWords.length > 0) {
        const winner = topWords[0];
        
        // Obter cor da palavra (se estiver nas palavras permitidas)
        const config = await cacheManager.getSessionConfig(sessionId);
        const allowedWord = config?.allowedWords?.find(
          (w: { word: string; color: string }) => w.word.toUpperCase() === winner.word.toUpperCase()
        );
        
        const winnerData: WinnerData = {
          word: winner.word,
          count: winner.count,
          color: allowedWord?.color || '#FFD700' // Dourado padrão
        };
        
        // Salvar resultado
        await cacheManager.setWinner(sessionId, winnerData);
        
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
    // Implementação via SSE será feita no próximo arquivo
    const eventData = {
      type: 'timerFinished',
      sessionId,
      winner,
      timestamp: Date.now()
    };
    
    await this.broadcastToSession(sessionId, eventData);
  }

  private async broadcastToSession(sessionId: string, data: unknown): Promise<void> {
    // Importar dinamicamente para evitar problemas de circular import
    const { broadcastToSession } = await import('../app/api/sse/[sessionId]/route');
    broadcastToSession(sessionId, data);
  }
}
