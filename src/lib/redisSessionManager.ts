import { createClient } from 'redis';

interface WordCount {
  word: string;
  count: number;
  lastSeen: Date;
}

interface SessionData {
  id: string;
  publicId: string;
  channel: string;
  platform: 'twitch' | 'kick';
  password?: string;
  wordCounts: Map<string, WordCount>;
  totalWords: number;
  createdAt: Date;
  lastActivity: Date;
  isActive: boolean;
  createdBy: string;
  adminKey: string; // Chave única para administrar a sessão
}

export class RedisSessionManager {
  private static instance: RedisSessionManager;
  private redis: ReturnType<typeof createClient> | null = null;
  private sessions = new Map<string, SessionData>(); // Cache local
  private readonly TTL = 24 * 60 * 60; // 24 horas em segundos
  private redisAvailable = false;

  private constructor() {
    // Verificar se Redis está disponível
    try {
      this.redis = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });
      
      this.redis.on('error', (err: unknown) => {
        console.error('Redis Client Error:', err);
        this.redisAvailable = false;
        console.log('Falling back to in-memory storage');
      });
      
      this.redis.connect().then(() => {
        this.redisAvailable = true;
        console.log('Redis connected successfully');
        
        // Tentar sincronizar sessões do cache local com Redis
        this.syncLocalSessionsToRedis();
      }).catch(() => {
        this.redisAvailable = false;
        console.log('Redis connection failed, using in-memory storage');
      });
    } catch {
      console.log('Redis not available, using in-memory storage');
      this.redisAvailable = false;
    }
  }

  static getInstance(): RedisSessionManager {
    if (!RedisSessionManager.instance) {
      RedisSessionManager.instance = new RedisSessionManager();
    }
    return RedisSessionManager.instance;
  }

  async createSession(
    channel: string, 
    platform: 'twitch' | 'kick' = 'twitch', 
    createdBy: string = 'admin',
    password?: string
  ): Promise<{ sessionId: string; publicId: string; adminKey: string }> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const publicId = Math.random().toString(36).substr(2, 8).toUpperCase();
    const adminKey = Math.random().toString(36).substr(2, 12); // Chave única para admin
    
    const sessionData: SessionData = {
      id: sessionId,
      publicId,
      channel,
      platform,
      password,
      wordCounts: new Map(),
      totalWords: 0,
      createdAt: new Date(),
      lastActivity: new Date(),
      isActive: true,
      createdBy,
      adminKey
    };

    try {
      // Sempre salvar no cache local primeiro
      this.sessions.set(sessionId, sessionData);
      
      // Tentar salvar no Redis se disponível
      if (this.redis && this.redisAvailable) {
        try {
          await this.redis.setEx(
            `session:${sessionId}`, 
            this.TTL, 
            JSON.stringify({
              ...sessionData,
              wordCounts: Array.from(sessionData.wordCounts.entries())
            })
          );

          // Salvar mapeamento publicId -> sessionId
          await this.redis.setEx(`public:${publicId}`, this.TTL, sessionId);
          
          // Salvar mapeamento adminKey -> sessionId
          await this.redis.setEx(`admin:${adminKey}`, this.TTL, sessionId);
          
          console.log(`Session ${sessionId} created successfully in Redis`);
        } catch (redisError) {
          console.error('Redis error during session creation:', redisError);
          // Continuar mesmo se Redis falhar
        }
      } else {
        console.log(`Session ${sessionId} created in local cache only (Redis not available)`);
      }
      
      return { sessionId, publicId, adminKey };
    } catch (error) {
      console.error('Error creating session:', error);
      // Fallback: apenas cache local
      this.sessions.set(sessionId, sessionData);
      return { sessionId, publicId, adminKey };
    }
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      // Tentar buscar no Redis primeiro
      if (this.redis && this.redisAvailable) {
        const data = await this.redis.get(`session:${sessionId}`);
        if (data) {
          const parsed = JSON.parse(data);
          const session: SessionData = {
            ...parsed,
            wordCounts: new Map(parsed.wordCounts),
            createdAt: new Date(parsed.createdAt),
            lastActivity: new Date(parsed.lastActivity)
          };
          
          // Atualizar cache local
          this.sessions.set(sessionId, session);
          return session;
        }
      }
      
      // Fallback para cache local
      return this.sessions.get(sessionId) || null;
    } catch (error) {
      console.error('Error getting session:', error);
      return this.sessions.get(sessionId) || null;
    }
  }

  async getSessionByPublicId(publicId: string): Promise<SessionData | null> {
    try {
      console.log(`🔍 Buscando sessão com publicId: ${publicId}`);
      console.log(`📊 Estado Redis: ${this.redisAvailable ? 'Disponível' : 'Indisponível'}`);
      
      // Tentar buscar no Redis primeiro
      if (this.redis && this.redisAvailable) {
        try {
          const sessionId = await this.redis.get(`public:${publicId}`);
          console.log(`🔑 SessionId encontrado no Redis: ${sessionId}`);
          if (sessionId) {
            const session = await this.getSession(sessionId);
            if (session) {
              console.log(`✅ Sessão encontrada no Redis: ${session.id}`);
              return session;
            }
          }
        } catch (redisError) {
          console.error('❌ Erro Redis durante getSessionByPublicId:', redisError);
          // Continuar para fallback local
        }
      }
      
      // Fallback: buscar no cache local
      console.log(`🔍 Buscando no cache local... Total de sessões: ${this.sessions.size}`);
      for (const session of this.sessions.values()) {
        console.log(`📋 Verificando sessão: ${session.id} (publicId: ${session.publicId})`);
        if (session.publicId === publicId) {
          console.log(`✅ Sessão encontrada no cache local: ${session.id}`);
          
          // Tentar sincronizar com Redis se estiver disponível agora
          if (this.redis && this.redisAvailable) {
            try {
              console.log(`🔄 Sincronizando sessão ${session.id} com Redis...`);
              await this.redis.setEx(
                `session:${session.id}`, 
                this.TTL, 
                JSON.stringify({
                  ...session,
                  wordCounts: Array.from(session.wordCounts.entries())
                })
              );
              await this.redis.setEx(`public:${publicId}`, this.TTL, session.id);
              console.log(`✅ Sessão sincronizada com Redis`);
            } catch (syncError) {
              console.error('❌ Erro ao sincronizar com Redis:', syncError);
            }
          }
          
          return session;
        }
      }
      
      console.log(`❌ Sessão não encontrada para publicId: ${publicId}`);
      return null;
    } catch (error) {
      console.error('❌ Erro ao buscar sessão por public ID:', error);
      return null;
    }
  }

  async getAllActiveSessions(): Promise<SessionData[]> {
    try {
      if (this.redis && this.redisAvailable) {
        const keys = await this.redis.keys('session:*');
        const sessions: SessionData[] = [];

        for (const key of keys) {
          const sessionId = key.replace('session:', '');
          const session = await this.getSession(sessionId);
          if (session && session.isActive) {
            sessions.push(session);
          }
        }

        return sessions;
      }
      
      // Fallback: cache local
      return Array.from(this.sessions.values()).filter(session => session.isActive);
    } catch (error) {
      console.error('Error getting all sessions:', error);
      return Array.from(this.sessions.values()).filter(session => session.isActive);
    }
  }

  async verifyPassword(sessionId: string, password: string): Promise<boolean> {
    const session = await this.getSession(sessionId);
    if (!session) return false;
    
    // Se não tem senha definida, sempre permite
    if (!session.password) return true;
    
    return session.password === password;
  }

  async verifyAdminKey(adminKey: string): Promise<boolean> {
    try {
      if (this.redis && this.redisAvailable) {
        const sessionId = await this.redis.get(`admin:${adminKey}`);
        return !!sessionId;
      }
      
      // Fallback: buscar no cache local
      for (const session of this.sessions.values()) {
        if (session.adminKey === adminKey) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error verifying admin key:', error);
      return false;
    }
  }

  async processWord(sessionId: string, word: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    const normalizedWord = word.toLowerCase().trim();
    if (normalizedWord.length < 2) return;

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

    // Atualizar cache local
    this.sessions.set(sessionId, session);

    // Tentar atualizar Redis se disponível
    try {
      if (this.redis && this.redisAvailable) {
        await this.redis.setEx(
          `session:${sessionId}`, 
          this.TTL, 
          JSON.stringify({
            ...session,
            wordCounts: Array.from(session.wordCounts.entries())
          })
        );
      }
    } catch (error) {
      console.error('Error updating session in Redis:', error);
    }
  }

  async getSessionStats(sessionId: string): Promise<{
    sessionId: string;
    publicId: string;
    channel: string;
    platform: 'twitch' | 'kick';
    totalWords: number;
    uniqueWords: number;
    topWords: WordCount[];
    createdAt: Date;
    lastActivity: Date;
    isActive: boolean;
    createdBy: string;
  } | null> {
    const session = await this.getSession(sessionId);
    
    if (!session) {
      return null;
    }

    const topWords = Array.from(session.wordCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const stats = {
      sessionId: session.id,
      publicId: session.publicId,
      channel: session.channel,
      platform: session.platform,
      totalWords: session.totalWords,
      uniqueWords: session.wordCounts.size,
      topWords,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      isActive: session.isActive,
      createdBy: session.createdBy
    };
    
    return stats;
  }

  async clearSession(sessionId: string): Promise<void> {
    try {
      if (this.redis && this.redisAvailable) {
        await this.redis.del(`session:${sessionId}`);
      }
      this.sessions.delete(sessionId);
    } catch (error) {
      console.error('Error clearing session:', error);
    }
  }

  /**
   * Renova o TTL de uma sessão existente
   */
  async renewSession(sessionId: string): Promise<boolean> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        return false;
      }

      // Renovar TTL no Redis se disponível
      if (this.redis && this.redisAvailable) {
        const exists = await this.redis.exists(`session:${sessionId}`);
        if (exists) {
          await this.redis.expire(`session:${sessionId}`, this.TTL);
          await this.redis.expire(`public:${session.publicId}`, this.TTL);
          await this.redis.expire(`admin:${session.adminKey}`, this.TTL);
        }
      }
      
      // Atualizar lastActivity no cache local
      session.lastActivity = new Date();
      this.sessions.set(sessionId, session);

      return true;
    } catch (error) {
      console.error('Error renewing session:', error);
      return false;
    }
  }

  /**
   * Renova o TTL de uma sessão usando o publicId
   */
  async renewSessionByPublicId(publicId: string): Promise<boolean> {
    try {
      const session = await this.getSessionByPublicId(publicId);
      if (!session) {
        return false;
      }
      return await this.renewSession(session.id);
    } catch (error) {
      console.error('Error renewing session by public ID:', error);
      return false;
    }
  }

  /**
   * Verifica se uma sessão existe e está ativa
   */
  async isSessionActive(sessionId: string): Promise<boolean> {
    try {
      if (this.redis && this.redisAvailable) {
        const exists = await this.redis.exists(`session:${sessionId}`);
        return exists === 1;
      }
      
      // Fallback: cache local
      return this.sessions.has(sessionId);
    } catch (error) {
      console.error('Error checking session status:', error);
      return this.sessions.has(sessionId);
    }
  }

  /**
   * Verifica se uma sessão existe usando o publicId
   */
  async isSessionActiveByPublicId(publicId: string): Promise<boolean> {
    try {
      const session = await this.getSessionByPublicId(publicId);
      return session !== null;
    } catch (error) {
      console.error('Error checking session status by public ID:', error);
      return false;
    }
  }

  /**
   * Sincroniza todas as sessões do cache local com Redis quando Redis fica disponível
   */
  private async syncLocalSessionsToRedis(): Promise<void> {
    if (!this.redis || !this.redisAvailable || this.sessions.size === 0) {
      return;
    }

    console.log(`🔄 Sincronizando ${this.sessions.size} sessões do cache local com Redis...`);
    
    for (const [sessionId, session] of this.sessions.entries()) {
      try {
        // Verificar se a sessão já existe no Redis
        const exists = await this.redis.exists(`session:${sessionId}`);
        if (exists === 0) {
          // Sessão não existe no Redis, sincronizar
          await this.redis.setEx(
            `session:${sessionId}`, 
            this.TTL, 
            JSON.stringify({
              ...session,
              wordCounts: Array.from(session.wordCounts.entries())
            })
          );
          await this.redis.setEx(`public:${session.publicId}`, this.TTL, sessionId);
          await this.redis.setEx(`admin:${session.adminKey}`, this.TTL, sessionId);
          console.log(`✅ Sessão ${sessionId} sincronizada com Redis`);
        }
      } catch (error) {
        console.error(`❌ Erro ao sincronizar sessão ${sessionId}:`, error);
      }
    }
    
    console.log(`✅ Sincronização concluída`);
  }
}