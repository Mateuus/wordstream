import { NextRequest, NextResponse } from 'next/server';
import { TimerManager } from '@/src/lib/timerManager';
import { RedisSessionManager } from '@/src/lib/redisSessionManager';

const timerManager = TimerManager.getInstance();
const redisSessionManager = RedisSessionManager.getInstance();

// POST - Ajustar temporizador (adicionar ou subtrair tempo)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const { seconds } = await request.json();

    if (typeof seconds !== 'number') {
      return NextResponse.json({ 
        error: 'Valor em segundos é obrigatório' 
      }, { status: 400 });
    }

    // Aguardar Redis estar pronto (com timeout)
    const redisReady = await Promise.race([
      redisSessionManager.ensureRedisReady(),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5000)) // 5s timeout
    ]);

    if (!redisReady) {
      console.warn('⚠️ Redis não está pronto, usando cache local');
    }

    // Verificar se timer está ativo
    const isActive = await timerManager.isTimerActive(sessionId);
    if (!isActive) {
      return NextResponse.json({ 
        error: 'Temporizador não está ativo' 
      }, { status: 409 });
    }

    // Obter tempo restante atual
    const currentRemainingTime = await timerManager.getRemainingTime(sessionId);
    const newRemainingTime = currentRemainingTime + seconds;

    // Ajustar o timer com o novo tempo (incluindo valores negativos)
    await timerManager.adjustTimer(sessionId, newRemainingTime);
    
    // Verificar se o timer foi finalizado
    const isStillActive = await timerManager.isTimerActive(sessionId);
    
    return NextResponse.json({ 
      success: true,
      message: isStillActive ? 'Temporizador ajustado com sucesso' : 'Temporizador ajustado e finalizado',
      remainingTime: Math.max(0, newRemainingTime),
      adjustment: seconds,
      isActive: isStillActive
    });

  } catch (error) {
    console.error('Erro ao ajustar temporizador:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
