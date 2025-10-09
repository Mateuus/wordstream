import { NextRequest, NextResponse } from 'next/server';
import { TimerManager } from '@/src/lib/timerManager';

const timerManager = TimerManager.getInstance();

// POST - Iniciar temporizador
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, duration } = body;

    if (!sessionId || !duration || duration <= 0) {
      return NextResponse.json({ 
        error: 'Session ID and valid duration required' 
      }, { status: 400 });
    }

    // Verificar se já existe timer ativo
    const isActive = await timerManager.isTimerActive(sessionId);
    if (isActive) {
      return NextResponse.json({ 
        error: 'Timer already active for this session' 
      }, { status: 409 });
    }

    await timerManager.startTimer(sessionId, duration);
    
    return NextResponse.json({ 
      message: 'Timer started successfully',
      duration,
      startTime: Date.now()
    });

  } catch (error) {
    console.error('Error starting timer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - Obter status do temporizador
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const timer = await timerManager.getTimer(sessionId);
    const remainingTime = await timerManager.getRemainingTime(sessionId);
    const isActive = await timerManager.isTimerActive(sessionId);
    
    return NextResponse.json({
      timer,
      remainingTime,
      isActive
    });

  } catch (error) {
    console.error('Error getting timer status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Parar temporizador
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    await timerManager.stopTimer(sessionId);
    
    return NextResponse.json({ 
      message: 'Timer stopped successfully' 
    });

  } catch (error) {
    console.error('Error stopping timer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
