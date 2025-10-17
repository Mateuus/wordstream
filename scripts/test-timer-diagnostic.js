// Teste para diagnosticar problemas do temporizador
async function testTimerDiagnostic() {
  const baseUrl = 'http://localhost:3500';
  
  try {
    console.log('🔍 Diagnosticando problemas do temporizador...');
    
    // 1. Criar uma sessão de teste
    console.log('📝 Criando sessão de teste...');
    const createResponse = await fetch(`${baseUrl}/api/admin/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: 'test-timer',
        platform: 'youtube',
        createdBy: 'diagnostic',
        password: 'test123'
      })
    });

    if (!createResponse.ok) {
      const error = await createResponse.json();
      console.log('❌ Erro ao criar sessão:', error);
      return;
    }

    const sessionData = await createResponse.json();
    console.log('✅ Sessão criada:', sessionData.publicId);

    // 2. Testar iniciar temporizador
    console.log('⏱️ Testando início do temporizador...');
    const timerResponse = await fetch(`${baseUrl}/api/sessions/${sessionData.publicId}/timer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration: 10 }) // 10 segundos para teste
    });

    if (!timerResponse.ok) {
      const error = await timerResponse.json();
      console.log('❌ Erro ao iniciar temporizador:', error);
      return;
    }

    const timerData = await timerResponse.json();
    console.log('✅ Temporizador iniciado:', timerData);

    // 3. Verificar status do temporizador
    console.log('🔍 Verificando status do temporizador...');
    const statusResponse = await fetch(`${baseUrl}/api/sessions/${sessionData.publicId}/timer`);
    
    if (!statusResponse.ok) {
      const error = await statusResponse.json();
      console.log('❌ Erro ao verificar status:', error);
      return;
    }

    const statusData = await statusResponse.json();
    console.log('📊 Status do temporizador:', statusData);

    // 4. Aguardar algumas atualizações
    console.log('⏳ Aguardando atualizações do temporizador...');
    for (let i = 0; i < 5; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const checkResponse = await fetch(`${baseUrl}/api/sessions/${sessionData.publicId}/timer`);
      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        console.log(`⏱️ Tempo restante: ${checkData.remainingTime}s (ativo: ${checkData.isActive})`);
      }
    }

    console.log('🎯 Diagnóstico concluído!');

  } catch (error) {
    console.error('❌ Erro no diagnóstico:', error.message);
  }
}

testTimerDiagnostic();
