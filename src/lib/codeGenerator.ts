import { nanoid } from 'nanoid';
import { cacheManager } from './redis';

export class CodeGenerator {
  private static instance: CodeGenerator;

  static getInstance(): CodeGenerator {
    if (!CodeGenerator.instance) {
      CodeGenerator.instance = new CodeGenerator();
    }
    return CodeGenerator.instance;
  }

  async generateAccessCode(sessionId: string): Promise<string> {
    // Gerar código único de 6 caracteres
    let code: string;
    let attempts = 0;
    
    do {
      code = nanoid(6).toUpperCase();
      attempts++;
      
      // Verificar se código já existe
      const existingSession = await cacheManager.getSessionByCode(code);
      if (!existingSession) {
        break;
      }
      
      // Evitar loop infinito
      if (attempts > 10) {
        throw new Error('Unable to generate unique code');
      }
    } while (true);

    // Salvar código no Redis
    await cacheManager.setAccessCode(code, sessionId);
    
    console.log(`Access code generated: ${code} for session: ${sessionId}`);
    return code;
  }

  async getSessionByCode(code: string): Promise<string | null> {
    return await cacheManager.getSessionByCode(code);
  }

  async revokeAccessCode(code: string): Promise<void> {
    // Implementar revokeAccessCode no cacheManager se necessário
    console.log(`Revoking access code: ${code}`);
  }
}
