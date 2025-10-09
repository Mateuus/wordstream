import { createClient } from 'redis';

const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 1000)
  }
});

redis.on('error', (err) => console.error('Redis Client Error:', err));
redis.on('connect', () => console.log('Redis connected'));

await redis.connect();

export { redis };

// Cache otimizado para alta performance
export const cacheManager = {
  // Cache de sessões com TTL
  async setSession(sessionId: string, data: unknown, ttl = 3600) {
    await redis.setEx(`session:${sessionId}`, ttl, JSON.stringify(data));
  },

  async getSession(sessionId: string) {
    const data = await redis.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  },

  // Cache de palavras globais
  async incrementWord(sessionId: string, word: string) {
    const pipeline = redis.multi();
    pipeline.hIncrBy(`words:${sessionId}`, word, 1);
    pipeline.hSet(`words:${sessionId}`, `${word}:lastSeen`, Date.now());
    pipeline.expire(`words:${sessionId}`, 3600);
    await pipeline.exec();
  },

  async getTopWords(sessionId: string, limit = 20) {
    const words = await redis.hGetAll(`words:${sessionId}`);
    return Object.entries(words)
      .filter(([key]) => !key.includes(':lastSeen'))
      .map(([word, count]) => ({ word, count: parseInt(count) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  },

  // Configurações de sessão
  async setSessionConfig(sessionId: string, config: unknown) {
    await redis.setEx(`config:${sessionId}`, 3600, JSON.stringify(config));
  },

  async getSessionConfig(sessionId: string) {
    const data = await redis.get(`config:${sessionId}`);
    return data ? JSON.parse(data) : null;
  },

  // Códigos de acesso
  async setAccessCode(code: string, sessionId: string) {
    await redis.setEx(`code:${code}`, 86400, sessionId); // 24 horas
  },

  async getSessionByCode(code: string) {
    return await redis.get(`code:${code}`);
  },

  // Temporizador
  async setTimer(sessionId: string, duration: number, startTime: number) {
    const timerData = {
      duration,
      startTime,
      isActive: true,
      endTime: startTime + (duration * 1000)
    };
    await redis.setEx(`timer:${sessionId}`, duration + 60, JSON.stringify(timerData));
  },

  async getTimer(sessionId: string) {
    const data = await redis.get(`timer:${sessionId}`);
    return data ? JSON.parse(data) : null;
  },

  async stopTimer(sessionId: string) {
    await redis.del(`timer:${sessionId}`);
  },

  // Resultado final
  async setWinner(sessionId: string, winner: { word: string; count: number; color: string }) {
    await redis.setEx(`winner:${sessionId}`, 3600, JSON.stringify(winner));
  },

  async getWinner(sessionId: string) {
    const data = await redis.get(`winner:${sessionId}`);
    return data ? JSON.parse(data) : null;
  }
};
