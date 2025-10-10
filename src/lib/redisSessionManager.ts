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
  bannedWords?: string[]; // Lista de palavras banidas
  timer?: {
    duration: number;
    startTime: number;
    isActive: boolean;
    endTime: number;
  };
  winner?: {
    word: string;
    count: number;
    color: string;
  };
  settings?: {
    wordLimit: number; // Quantidade de palavras na lista
  };
}

export class RedisSessionManager {
  private static instance: RedisSessionManager;
  private redis: ReturnType<typeof createClient> | null = null;
  private sessions = new Map<string, SessionData>(); // Cache local (apenas para fallback temporário)
  private readonly TTL = 24 * 60 * 60; // 24 horas em segundos
  private redisAvailable = false;
  private keepAliveInterval: NodeJS.Timeout | null = null;
  private initializationPromise: Promise<void> | null = null;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 segundo

  private constructor() {
    // Constructor vazio - inicialização será feita no getInstance
  }

  static getInstance(): RedisSessionManager {
    if (!RedisSessionManager.instance) {
      RedisSessionManager.instance = new RedisSessionManager();
      // Inicializar Redis e aguardar
      RedisSessionManager.instance.initializationPromise = 
        RedisSessionManager.instance.initializeRedis().catch(console.error).then(() => undefined);
      RedisSessionManager.instance.startKeepAlive();
    }
    return RedisSessionManager.instance;
  }

  /**
   * Aguarda a inicialização do Redis estar completa
   */
  private async ensureRedisReady(retries = this.MAX_RETRIES): Promise<boolean> {
    // Aguardar inicialização em andamento
    if (this.initializationPromise) {
      await this.initializationPromise;
    }

    // Se Redis já está disponível, retornar
    if (this.redis && this.redisAvailable) {
      return true;
    }

    // Tentar reconectar se necessário
    if (retries > 0 && this.redis && !this.redisAvailable) {
      try {
        console.log(`🔄 Tentando reconectar ao Redis (${this.MAX_RETRIES - retries + 1}/${this.MAX_RETRIES})...`);
        if (!this.redis.isOpen) {
          await this.redis.connect();
        }
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
        return this.ensureRedisReady(retries - 1);
      } catch (error) {
        console.error(`❌ Falha ao reconectar (tentativa ${this.MAX_RETRIES - retries + 1}):`, error);
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
        return this.ensureRedisReady(retries - 1);
      }
    }

    return this.redisAvailable;
  }

  /**
   * Inicializa conexão Redis persistente
   */
  public async initializeRedis(): Promise<void> {
    try {
      this.redis = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.log('Redis: Max reconnection attempts reached');
              return false;
            }
            return Math.min(retries * 100, 3000);
          }
        }
      });
      
      this.redis.on('error', (err: unknown) => {
        console.error('❌ Redis Client Error:', err);
        this.redisAvailable = false;
      });

      this.redis.on('connect', () => {
        console.log('✅ Redis conectado com sucesso');
        this.redisAvailable = true;
        // Sincronizar apenas se houver sessões no cache local (fallback do início)
        if (this.sessions.size > 0) {
          console.log(`🔄 Cache local tem ${this.sessions.size} sessões para sincronizar`);
          this.syncLocalSessionsToRedis();
        }
      });

      this.redis.on('disconnect', () => {
        console.log('⚠️ Redis desconectado');
        this.redisAvailable = false;
      });

      // Conectar imediatamente
      await this.redis.connect();
      
    } catch (error) {
      console.error('Error initializing Redis:', error);
      this.redisAvailable = false;
    }
  }

  /**
   * Mantém conexão Redis ativa com keep-alive
   */
  public startKeepAlive(): void {
    this.keepAliveInterval = setInterval(async () => {
      if (this.redis && !this.redisAvailable) {
        try {
          await this.redis.connect();
          console.log('Redis reconnected via keep-alive');
        } catch (error) {
          console.log('Redis keep-alive reconnection failed:', error);
        }
      } else if (this.redis && this.redisAvailable) {
        try {
          // Ping para manter conexão viva
          await this.redis.ping();
        } catch (error) {
          console.log('Redis ping failed:', error);
          this.redisAvailable = false;
        }
      }
    }, 5000); // A cada 5 segundos
  }

  async createSession(
    channel: string,
    platform: 'twitch' | 'kick' = 'twitch',
    createdBy: string = 'admin',
    password?: string
  ): Promise<{ sessionId: string; publicId: string; adminKey: string }> {
    // Usar publicId como ID principal (mais limpo)
    const publicId = Math.random().toString(36).substr(2, 8).toUpperCase();
    const sessionId = publicId; // Usar publicId como sessionId também
    const adminKey = Math.random().toString(36).substr(2, 12); // Chave única para admin

    const sessionData: SessionData = {
      id: sessionId, // Agora sessionId = publicId
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
      // Aguardar Redis estar pronto antes de criar sessão
      console.log(`🔄 Aguardando Redis estar disponível para criar sessão ${sessionId}...`);
      const redisReady = await this.ensureRedisReady();

      if (redisReady && this.redis) {
        // Redis disponível - usar como fonte principal
        try {
          await this.redis.setEx(
            `WordStream:session:${sessionId}`, 
            this.TTL, 
            JSON.stringify({
              ...sessionData,
              wordCounts: Array.from(sessionData.wordCounts.entries())
            })
          );
          
          console.log(`✅ Sessão ${sessionId} criada com sucesso no Redis`);
          
          // Salvar no cache local apenas como backup
          this.sessions.set(sessionId, sessionData);
          
          return { sessionId, publicId, adminKey };
        } catch (redisError) {
          console.error('❌ Erro Redis durante criação da sessão:', redisError);
          // Fallback para cache local
        }
      }

      // Fallback: salvar apenas no cache local
      console.log(`⚠️ Redis não disponível - salvando sessão ${sessionId} apenas no cache local`);
      this.sessions.set(sessionId, sessionData);
      console.log(`💾 Sessão ${sessionId} salva no cache local (fallback)`);
      console.log(`📊 Total de sessões no cache local: ${this.sessions.size}`);

      return { sessionId, publicId, adminKey };
    } catch (error) {
      console.error('❌ Erro ao criar sessão:', error);
      // Fallback final: apenas cache local
      this.sessions.set(sessionId, sessionData);
      return { sessionId, publicId, adminKey };
    }
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      // Tentar buscar no Redis primeiro
      if (this.redis && this.redisAvailable) {
        const data = await this.redis.get(`WordStream:session:${sessionId}`);
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
      
      // Aguardar Redis estar pronto com retry
      console.log(`🔄 Aguardando Redis estar disponível...`);
      const redisReady = await this.ensureRedisReady();
      console.log(`📊 Estado Redis: ${redisReady ? 'Disponível' : 'Indisponível'}`);
      
      // Prioridade 1: Buscar no Redis (fonte de verdade)
      if (redisReady && this.redis) {
        try {
          // Buscar diretamente pela chave WordStream:session:{publicId}
          const sessionData = await this.redis.get(`WordStream:session:${publicId}`);
          if (sessionData) {
            const parsed = JSON.parse(sessionData);
            const session: SessionData = {
              ...parsed,
              wordCounts: new Map(parsed.wordCounts || []),
              createdAt: new Date(parsed.createdAt),
              lastActivity: new Date(parsed.lastActivity)
            };
            
            // Atualizar cache local para leituras futuras
            this.sessions.set(publicId, session);
            console.log(`✅ Sessão encontrada no Redis: ${session.id}`);
            console.log(`📊 Cache local atualizado. Total de sessões: ${this.sessions.size}`);
            return session;
          }
        } catch (redisError) {
          console.error('❌ Erro Redis durante getSessionByPublicId:', redisError);
          // Continuar para fallback
        }
      }
      
      // Fallback: buscar no cache local
      console.log(`🔍 Buscando no cache local (fallback)... Total de sessões: ${this.sessions.size}`);
      console.log(`🔑 Chaves no cache local:`, Array.from(this.sessions.keys()));
      const session = this.sessions.get(publicId);
      
      if (session) {
        console.log(`✅ Sessão encontrada no cache local: ${session.id}`);
        
        // Tentar sincronizar com Redis se estiver disponível agora
        if (this.redis && this.redisAvailable) {
          try {
            console.log(`🔄 Sincronizando sessão ${session.id} com Redis...`);
            await this.redis.setEx(
              `WordStream:session:${session.id}`, 
              this.TTL, 
              JSON.stringify({
                ...session,
                wordCounts: Array.from(session.wordCounts.entries())
              })
            );
            console.log(`✅ Sessão sincronizada com Redis`);
          } catch (syncError) {
            console.error('❌ Erro ao sincronizar com Redis:', syncError);
          }
        }
        
        return session;
      }
      
      console.log(`❌ Sessão não encontrada para publicId: ${publicId}`);
      return null;
    } catch (error) {
      console.error('❌ Erro ao buscar sessão por public ID:', error);
      return null;
    }
  }

  async updateSession(sessionId: string, updates: Partial<SessionData>): Promise<boolean> {
    try {
      // Buscar sessão atual
      const session = await this.getSession(sessionId);
      if (!session) {
        console.error(`❌ Sessão ${sessionId} não encontrada para atualização`);
        return false;
      }

      // Aplicar atualizações
      const updatedSession: SessionData = {
        ...session,
        ...updates,
        lastActivity: new Date()
      };

      // Tentar atualizar no Redis primeiro
      if (this.redis && this.redisAvailable) {
        try {
          await this.redis.setEx(
            `WordStream:session:${sessionId}`, 
            this.TTL, 
            JSON.stringify({
              ...updatedSession,
              wordCounts: Array.from(updatedSession.wordCounts.entries())
            })
          );
          
          console.log(`✅ Sessão ${sessionId} atualizada no Redis`);
          
          // Atualizar cache local
          this.sessions.set(sessionId, updatedSession);
          return true;
        } catch (redisError) {
          console.error('❌ Erro Redis durante atualização da sessão:', redisError);
          // Continuar para fallback
        }
      }

      // Fallback: atualizar apenas no cache local
      console.log(`⚠️ Redis não disponível - atualizando sessão ${sessionId} apenas no cache local`);
      this.sessions.set(sessionId, updatedSession);
      console.log(`💾 Sessão ${sessionId} atualizada no cache local (fallback)`);
      
      return true;
    } catch (error) {
      console.error('❌ Erro ao atualizar sessão:', error);
      return false;
    }
  }

  async getAllActiveSessions(): Promise<SessionData[]> {
    try {
      if (this.redis && this.redisAvailable) {
        const keys = await this.redis.keys('WordStream:session:*');
        const sessions: SessionData[] = [];

        for (const key of keys) {
          const sessionId = key.replace('WordStream:session:', '');
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
    try {
      const session = await this.getSession(sessionId);
      if (!session || !session.password) {
        return false;
      }
      
      // Comparação simples de senha (em produção, usar hash)
      return session.password === password;
    } catch (error) {
      console.error('Erro ao verificar senha:', error);
      return false;
    }
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

    // Verificar se a palavra está banida
    const bannedWords = session.bannedWords || [];
    
    if (bannedWords.includes(normalizedWord)) {
      console.log(`🚫 Palavra "${normalizedWord}" está banida, ignorando...`);
      return;
    }
    
    // Palavras excluídas podem voltar a ser contadas se mencionadas novamente
    // Não verificamos palavras excluídas aqui - elas podem voltar

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
          `WordStream:session:${sessionId}`, 
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

    const bannedWords = session.bannedWords || [];
    
    // Filtrar apenas palavras banidas da lista de top words
    // Palavras excluídas podem voltar a aparecer se mencionadas novamente
    const filteredWordCounts = Array.from(session.wordCounts.values())
      .filter(wordCount => !bannedWords.includes(wordCount.word));
    
    const wordLimit = session.settings?.wordLimit || 10;
    const topWords = filteredWordCounts
      .sort((a, b) => b.count - a.count)
      .slice(0, wordLimit);

    const stats = {
      sessionId: session.publicId, // Usar publicId como sessionId
      publicId: session.publicId,
      channel: session.channel,
      platform: session.platform,
      totalWords: session.totalWords,
      uniqueWords: filteredWordCounts.length, // Contar apenas palavras não banidas
      topWords,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      isActive: session.isActive,
      createdBy: session.createdBy,
      bannedWords: session.bannedWords || []
    };
    
    return stats;
  }

  async clearSession(sessionId: string): Promise<void> {
    try {
      if (this.redis && this.redisAvailable) {
        await this.redis.del(`WordStream:session:${sessionId}`);
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
        const exists = await this.redis.exists(`WordStream:session:${sessionId}`);
        if (exists) {
          await this.redis.expire(`WordStream:session:${sessionId}`, this.TTL);
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
        const exists = await this.redis.exists(`WordStream:session:${sessionId}`);
        if (exists === 0) {
          // Sessão não existe no Redis, sincronizar
          await this.redis.setEx(
            `WordStream:session:${sessionId}`, 
            this.TTL, 
            JSON.stringify({
              ...session,
              wordCounts: Array.from(session.wordCounts.entries())
            })
          );
          console.log(`✅ Sessão ${sessionId} sincronizada com Redis`);
        }
      } catch (error) {
        console.error(`❌ Erro ao sincronizar sessão ${sessionId}:`, error);
      }
    }
    
    console.log(`✅ Sincronização concluída`);
  }

  /**
   * Para o keep-alive e limpa recursos
   */
  public cleanup(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
    
    if (this.redis) {
      this.redis.disconnect();
    }
  }
}