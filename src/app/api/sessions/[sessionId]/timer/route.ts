import { NextRequest, NextResponse } from 'next/server';
import { TimerManager } from '@/src/lib/timerManager';

const timerManager = TimerManager.getInstance();

// POST - Iniciar temporizador
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const { duration } = await request.json();

    if (!duration || duration <= 0) {
      return NextResponse.json({ 
        error: 'Duração válida é obrigatória' 
      }, { status: 400 });
    }

    // Verificar se já existe timer ativo
    const isActive = await timerManager.isTimerActive(sessionId);
    if (isActive) {
      return NextResponse.json({ 
        error: 'Temporizador já está ativo para esta sessão' 
      }, { status: 409 });
    }

    await timerManager.startTimer(sessionId, duration);
    
    return NextResponse.json({ 
      success: true,
      message: 'Temporizador iniciado com sucesso',
      duration,
      startTime: Date.now()
    });

  } catch (error) {
    console.error('Erro ao iniciar temporizador:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// GET - Obter status do temporizador
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    const timer = await timerManager.getTimer(sessionId);
    const remainingTime = await timerManager.getRemainingTime(sessionId);
    const isActive = await timerManager.isTimerActive(sessionId);
    
    return NextResponse.json({
      timer,
      remainingTime,
      isActive
    });

  } catch (error) {
    console.error('Erro ao obter status do temporizador:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Parar temporizador
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    await timerManager.stopTimer(sessionId);
    
    return NextResponse.json({ 
      success: true,
      message: 'Temporizador parado com sucesso' 
    });

  } catch (error) {
    console.error('Erro ao parar temporizador:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
