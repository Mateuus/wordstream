// Teste automatizado do SSE para verificar se os eventos estão chegando
const http = require('http');

function testSSEConnection(sessionId) {
  return new Promise((resolve, reject) => {
    console.log(`🔌 Testando conexão SSE para sessão: ${sessionId}`);
    
    const options = {
      hostname: 'localhost',
      port: 3500,
      path: `/api/sse/${sessionId}?channel=test-channel`,
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache'
      }
    };

    const req = http.request(options, (res) => {
      console.log(`📡 Status SSE: ${res.statusCode}`);
      console.log(`📡 Headers:`, res.headers);
      
      let eventCount = 0;
      let timerEvents = 0;
      
      res.on('data', (chunk) => {
        const data = chunk.toString();
        console.log(`📡 Dados recebidos:`, data);
        
        // Processar eventos SSE
        const lines = data.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            eventCount++;
            try {
              const eventData = JSON.parse(line.substring(6));
              console.log(`📡 Evento #${eventCount}:`, eventData.type, eventData);
              
              if (eventData.type === 'timerUpdate') {
                timerEvents++;
                console.log(`⏰ Evento de timer #${timerEvents}:`, eventData.timer);
              }
            } catch (error) {
              console.log(`❌ Erro ao processar evento:`, error.message);
            }
          }
        }
      });
      
      res.on('end', () => {
        console.log(`📊 Total de eventos recebidos: ${eventCount}`);
        console.log(`⏰ Total de eventos de timer: ${timerEvents}`);
        resolve({ eventCount, timerEvents });
      });
      
      res.on('error', (error) => {
        console.error(`❌ Erro na conexão SSE:`, error);
        reject(error);
      });
    });

    req.on('error', (error) => {
      console.error(`❌ Erro na requisição:`, error);
      reject(error);
    });

    req.end();
  });
}

async function testSSEWithTimer() {
  try {
    console.log('🧪 Teste automatizado do SSE com temporizador...');
    
    // Criar sessão de teste
    const createResponse = await fetch('http://localhost:3500/api/admin/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': 'admin123'
      },
      body: JSON.stringify({
        channel: 'test-channel',
        platform: 'twitch',
        password: 'test123'
      })
    });
    
    if (!createResponse.ok) {
      throw new Error(`Erro ao criar sessão: ${createResponse.status}`);
    }
    
    const sessionData = await createResponse.json();
    console.log('✅ Sessão criada:', sessionData.sessionId);
    
    // Conectar à sessão
    const connectResponse = await fetch('http://localhost:3500/api/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sessionId: sessionData.sessionId,
        channel: 'test-channel',
        platform: 'twitch',
        password: 'test123'
      })
    });
    
    if (!connectResponse.ok) {
      throw new Error(`Erro ao conectar: ${connectResponse.status}`);
    }
    
    console.log('✅ Conectado à sessão');
    
    // Iniciar temporizador
    console.log('🔄 Iniciando temporizador de 5 segundos...');
    const timerResponse = await fetch(`http://localhost:3500/api/sessions/${sessionData.sessionId}/timer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        duration: 5
      })
    });
    
    if (!timerResponse.ok) {
      throw new Error(`Erro ao iniciar temporizador: ${timerResponse.status}`);
    }
    
    console.log('✅ Temporizador iniciado');
    
    // Testar SSE
    const sseResult = await testSSEConnection(sessionData.sessionId);
    
    console.log('🎉 Teste concluído!');
    console.log(`📊 Resultado: ${sseResult.eventCount} eventos, ${sseResult.timerEvents} eventos de timer`);
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testSSEWithTimer();
