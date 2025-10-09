import { nanoid } from 'nanoid';
import { cacheManager } from './redis';
import { Session, AllowedWord } from '../types';
import { CodeGenerator } from './codeGenerator';

export class SessionManager {
  private static instance: SessionManager;

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  async createSession(config?: Partial<Session['config']>): Promise<string> {
    const sessionId = `session_${nanoid(12)}`;
    
    // Palavras padrão com cores
    const defaultAllowedWords: AllowedWord[] = [
      { word: 'RED', color: '#FF0000', createdAt: new Date() },
      { word: 'BLUE', color: '#0000FF', createdAt: new Date() },
      { word: 'DRAW', color: '#FFFF00', createdAt: new Date() },
      { word: 'EMPATE', color: '#FFFF00', createdAt: new Date() },
      { word: 'VERMELHO', color: '#FF0000', createdAt: new Date() },
      { word: 'AZUL', color: '#0000FF', createdAt: new Date() }
    ];
    
    const session: Session = {
      id: sessionId,
      createdAt: new Date(),
      lastActivity: new Date(),
      totalWords: 0,
      isActive: true,
      config: {
        bannedWords: [],
        minWordLength: 2,
        maxRepeatedChars: 3,
        allowedWords: defaultAllowedWords,
        onlyAllowedWords: false,
        ...config
      }
    };

    await cacheManager.setSession(sessionId, session);
    console.log(`Session created: ${sessionId}`);
    
    return sessionId;
  }

  async getSession(sessionId: string): Promise<Session | null> {
    return await cacheManager.getSession(sessionId);
  }

  async updateSessionActivity(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      session.lastActivity = new Date();
      await cacheManager.setSession(sessionId, session);
    }
  }

  async getSessionStats(sessionId: string) {
    const session = await this.getSession(sessionId);
    const topWords = await cacheManager.getTopWords(sessionId);
    const winner = await cacheManager.getWinner(sessionId);
    
    return {
      sessionId,
      totalWords: session?.totalWords || 0,
      uniqueWords: topWords.length,
      topWords: topWords.slice(0, 10),
      isActive: session?.isActive || false,
      lastActivity: session?.lastActivity,
      accessCode: session?.accessCode,
      winner
    };
  }

  async generateAccessCode(sessionId: string): Promise<string> {
    const codeGenerator = CodeGenerator.getInstance();
    const accessCode = await codeGenerator.generateAccessCode(sessionId);
    
    // Atualizar sessão com código
    const session = await this.getSession(sessionId);
    if (session) {
      session.accessCode = accessCode;
      await cacheManager.setSession(sessionId, session);
    }
    
    return accessCode;
  }

  async getSessionByCode(code: string): Promise<Session | null> {
    const codeGenerator = CodeGenerator.getInstance();
    const sessionId = await codeGenerator.getSessionByCode(code);
    
    if (sessionId) {
      return await this.getSession(sessionId);
    }
    
    return null;
  }
}
