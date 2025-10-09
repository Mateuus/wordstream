import { cacheManager } from './redis';
import { ProcessedMessage, AllowedWord, SessionConfig } from '../types';

export class WordProcessor {
  private static instance: WordProcessor;
  private bannedWords = new Set([
    'kkkkkk', 'kkkkkkk', 'kkkkkkkk', 'kkkkkkkkk',
    'hahaha', 'hahahaha', 'hahahahaha',
    'rsrsrs', 'rsrsrsrs', 'rsrsrsrsrs',
    'lol', 'lolol', 'lololol', 'wtf', 'omg', 'lmao', 'rofl'
  ]);

  private minWordLength = 2;
  private maxRepeatedChars = 3;

  static getInstance(): WordProcessor {
    if (!WordProcessor.instance) {
      WordProcessor.instance = new WordProcessor();
    }
    return WordProcessor.instance;
  }

  // Processamento otimizado para alta performance
  async processMessage(message: ProcessedMessage, sessionId: string): Promise<void> {
    try {
      const firstWord = this.extractFirstWord(message.message);
      
      if (!firstWord || !this.isValidWord(firstWord)) {
        return;
      }

      // Converter para maiúscula para evitar diferenciação
      const cleanWord = firstWord.toUpperCase().trim();
      
      // Verificações rápidas
      if (this.isSpam(cleanWord) || this.isBanned(cleanWord)) {
        return;
      }

      // Verificar se está no modo "apenas palavras permitidas"
      const sessionConfig = await this.getSessionConfig(sessionId);
      if (sessionConfig?.onlyAllowedWords) {
        if (!this.isAllowedWord(cleanWord, sessionConfig.allowedWords)) {
          return;
        }
      }

      // Incrementa no Redis de forma atômica
      await cacheManager.incrementWord(sessionId, cleanWord);
      
      // Notifica clientes via SSE
      await this.notifyClients(sessionId, cleanWord);
      
    } catch (error) {
      console.error('Error processing message:', error);
    }
  }

  private extractFirstWord(message: string): string | null {
    // Regex otimizada para performance
    const match = message.match(/[\p{L}\p{N}]+/u);
    return match ? match[0] : null;
  }

  private isValidWord(word: string): boolean {
    return word.length >= this.minWordLength;
  }

  private isSpam(word: string): boolean {
    // Detecção rápida de spam
    const charCounts = new Map<string, number>();
    for (const char of word) {
      charCounts.set(char, (charCounts.get(char) || 0) + 1);
    }
    
    return Array.from(charCounts.values()).some(count => count > this.maxRepeatedChars);
  }

  private isBanned(word: string): boolean {
    return this.bannedWords.has(word);
  }

  private async getSessionConfig(sessionId: string): Promise<SessionConfig | null> {
    try {
      const config = await cacheManager.getSessionConfig(sessionId);
      return config;
    } catch (error) {
      console.error('Error getting session config:', error);
      return null;
    }
  }

  private isAllowedWord(word: string, allowedWords: AllowedWord[]): boolean {
    return allowedWords.some(allowed => 
      allowed.word.toUpperCase() === word.toUpperCase()
    );
  }

  private async notifyClients(sessionId: string, word: string): Promise<void> {
    // Implementação via SSE será feita no próximo arquivo
    const eventData = {
      type: 'wordUpdate',
      sessionId,
      word,
      timestamp: Date.now()
    };
    
    // Enviar para todos os clientes conectados nesta sessão
    await this.broadcastToSession(sessionId, eventData);
  }

  private async broadcastToSession(sessionId: string, data: unknown): Promise<void> {
    // Importar dinamicamente para evitar problemas de circular import
    const { broadcastToSession } = await import('../app/api/sse/[sessionId]/route');
    broadcastToSession(sessionId, data);
  }
}
