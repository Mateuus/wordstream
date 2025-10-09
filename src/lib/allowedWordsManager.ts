import { cacheManager } from './redis';
import { AllowedWord } from '../types';

export class AllowedWordsManager {
  private static instance: AllowedWordsManager;

  static getInstance(): AllowedWordsManager {
    if (!AllowedWordsManager.instance) {
      AllowedWordsManager.instance = new AllowedWordsManager();
    }
    return AllowedWordsManager.instance;
  }

  async addAllowedWord(sessionId: string, word: string, color: string): Promise<void> {
    const config = await cacheManager.getSessionConfig(sessionId) || {
      allowedWords: [],
      onlyAllowedWords: false,
      caseSensitive: false
    };

    // Converter para maiúscula
    const upperWord = word.toUpperCase();
    
    // Verificar se palavra já existe
    const existingIndex = config.allowedWords.findIndex(
      (w: AllowedWord) => w.word.toUpperCase() === upperWord
    );

    const allowedWord: AllowedWord = {
      word: upperWord,
      color: color.toUpperCase(),
      createdAt: new Date()
    };

    if (existingIndex >= 0) {
      // Atualizar palavra existente
      config.allowedWords[existingIndex] = allowedWord;
    } else {
      // Adicionar nova palavra
      config.allowedWords.push(allowedWord);
    }

    await cacheManager.setSessionConfig(sessionId, config);
    console.log(`Allowed word added: ${upperWord} with color ${color}`);
  }

  async removeAllowedWord(sessionId: string, word: string): Promise<void> {
    const config = await cacheManager.getSessionConfig(sessionId);
    if (!config) return;

    const upperWord = word.toUpperCase();
    config.allowedWords = config.allowedWords.filter(
      (w: AllowedWord) => w.word.toUpperCase() !== upperWord
    );

    await cacheManager.setSessionConfig(sessionId, config);
    console.log(`Allowed word removed: ${upperWord}`);
  }

  async getAllowedWords(sessionId: string): Promise<AllowedWord[]> {
    const config = await cacheManager.getSessionConfig(sessionId);
    return config?.allowedWords || [];
  }

  async setOnlyAllowedWordsMode(sessionId: string, enabled: boolean): Promise<void> {
    const config = await cacheManager.getSessionConfig(sessionId) || {
      allowedWords: [],
      onlyAllowedWords: false,
      caseSensitive: false
    };

    config.onlyAllowedWords = enabled;
    await cacheManager.setSessionConfig(sessionId, config);
    console.log(`Only allowed words mode: ${enabled ? 'enabled' : 'disabled'}`);
  }

  // Palavras pré-definidas com cores
  getDefaultWords(): AllowedWord[] {
    return [
      { word: 'RED', color: '#FF0000', createdAt: new Date() },
      { word: 'BLUE', color: '#0000FF', createdAt: new Date() },
      { word: 'DRAW', color: '#FFFF00', createdAt: new Date() },
      { word: 'EMPATE', color: '#FFFF00', createdAt: new Date() },
      { word: 'VERMELHO', color: '#FF0000', createdAt: new Date() },
      { word: 'AZUL', color: '#0000FF', createdAt: new Date() }
    ];
  }
}
