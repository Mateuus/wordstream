import { NextRequest, NextResponse } from 'next/server';
import { AllowedWordsManager } from '@/src/lib/allowedWordsManager';

const allowedWordsManager = AllowedWordsManager.getInstance();

// GET - Buscar palavras permitidas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const allowedWords = await allowedWordsManager.getAllowedWords(sessionId);
    
    return NextResponse.json({ allowedWords });

  } catch (error) {
    console.error('Error fetching allowed words:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Adicionar palavra permitida
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, word, color } = body;

    if (!sessionId || !word || !color) {
      return NextResponse.json({ 
        error: 'Session ID, word and color required' 
      }, { status: 400 });
    }

    await allowedWordsManager.addAllowedWord(sessionId, word, color);
    
    return NextResponse.json({ 
      message: 'Allowed word added successfully' 
    });

  } catch (error) {
    console.error('Error adding allowed word:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remover palavra permitida
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const word = searchParams.get('word');

    if (!sessionId || !word) {
      return NextResponse.json({ 
        error: 'Session ID and word required' 
      }, { status: 400 });
    }

    await allowedWordsManager.removeAllowedWord(sessionId, word);
    
    return NextResponse.json({ 
      message: 'Allowed word removed successfully' 
    });

  } catch (error) {
    console.error('Error removing allowed word:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Ativar/desativar modo apenas palavras permitidas
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, onlyAllowedWords } = body;

    if (!sessionId || typeof onlyAllowedWords !== 'boolean') {
      return NextResponse.json({ 
        error: 'Session ID and onlyAllowedWords boolean required' 
      }, { status: 400 });
    }

    await allowedWordsManager.setOnlyAllowedWordsMode(sessionId, onlyAllowedWords);
    
    return NextResponse.json({ 
      message: `Only allowed words mode ${onlyAllowedWords ? 'enabled' : 'disabled'}` 
    });

  } catch (error) {
    console.error('Error updating allowed words mode:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
