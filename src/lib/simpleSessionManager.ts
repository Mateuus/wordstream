interface WordCount {
  word: string;
  count: number;
  lastSeen: Date;
}

interface SessionData {
  id: string;
  publicId: string; // ID público para compartilhar
  channel: string;
  platform: 'twitch' | 'kick';
  wordCounts: Map<string, WordCount>;
  totalWords: number;
  createdAt: Date;
  lastActivity: Date;
  isActive: boolean;
  createdBy: string; // Quem criou a sessão
}

export class SimpleSessionManager {
  private static instance: SimpleSessionManager;
  private sessions = new Map<string, SessionData>();

  static getInstance(): SimpleSessionManager {
    if (!SimpleSessionManager.instance) {
      SimpleSessionManager.instance = new SimpleSessionManager();
    }
    return SimpleSessionManager.instance;
  }

  createSession(channel: string, platform: 'twitch' | 'kick' = 'twitch', createdBy: string = 'admin'): { sessionId: string; publicId: string } {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const publicId = Math.random().toString(36).substr(2, 8).toUpperCase(); // ID público curto
    
    const sessionData: SessionData = {
      id: sessionId,
      publicId,
      channel,
      platform,
      wordCounts: new Map(),
      totalWords: 0,
      createdAt: new Date(),
      lastActivity: new Date(),
      isActive: true,
      createdBy
    };

    this.sessions.set(sessionId, sessionData);
    console.log(`📝 Sessão criada: ${sessionId} (Público: ${publicId}) para canal ${channel}`);
    
    return { sessionId, publicId };
  }

  getSession(sessionId: string): SessionData | null {
    return this.sessions.get(sessionId) || null;
  }

  getSessionByPublicId(publicId: string): SessionData | null {
    for (const session of this.sessions.values()) {
      if (session.publicId === publicId && session.isActive) {
        return session;
      }
    }
    return null;
  }

  getAllActiveSessions(): SessionData[] {
    return Array.from(this.sessions.values()).filter(session => session.isActive);
  }

  processWord(sessionId: string, word: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const normalizedWord = word.toLowerCase().trim();
    if (normalizedWord.length < 2) return;

    // Atualizar contador
    const existing = session.wordCounts.get(normalizedWord);
    if (existing) {
      existing.count++;
      existing.lastSeen = new Date();
    } else {
      session.wordCounts.set(normalizedWord, {
        word: normalizedWord,
        count: 1,
        lastSeen: new Date()
      });
    }

    session.totalWords++;
    session.lastActivity = new Date();

    console.log(`📊 Palavra processada: "${normalizedWord}" (${session.wordCounts.get(normalizedWord)?.count})`);
  }

  getTopWords(sessionId: string, limit: number = 10): WordCount[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    return Array.from(session.wordCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  getSessionStats(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return {
      sessionId: session.id,
      publicId: session.publicId,
      channel: session.channel,
      platform: session.platform,
      totalWords: session.totalWords,
      uniqueWords: session.wordCounts.size,
      topWords: this.getTopWords(sessionId, 10),
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      isActive: session.isActive,
      createdBy: session.createdBy
    };
  }

  clearSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.wordCounts.clear();
    session.totalWords = 0;
    session.lastActivity = new Date();

    console.log(`🗑️ Sessão limpa: ${sessionId}`);
    return true;
  }

  deleteSession(sessionId: string): boolean {
    const deleted = this.sessions.delete(sessionId);
    if (deleted) {
      console.log(`❌ Sessão deletada: ${sessionId}`);
    }
    return deleted;
  }

  // Limpeza automática de sessões antigas (opcional)
  cleanupOldSessions(maxAgeHours: number = 24): void {
    const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.lastActivity < cutoff) {
        this.sessions.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Limpeza: ${cleaned} sessões antigas removidas`);
    }
  }
}
