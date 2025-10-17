// Teste rápido para verificar processamento de palavras do YouTube
async function testYouTubeWordProcessing() {
  console.log('🧪 Testando processamento de palavras do YouTube...');
  
  // Simular algumas mensagens de teste
  const testMessages = [
    'falei',
    'crlh', 
    'ue',
    'mega sipa',
    'a forra vem',
    'sei kkkkkkkk',
    'EITA PORRA'
  ];
  
  console.log('📝 Mensagens de teste:');
  testMessages.forEach((msg, index) => {
    console.log(`  ${index + 1}. "${msg}"`);
  });
  
  console.log('\n🔍 Análise de primeira palavra:');
  testMessages.forEach((msg, index) => {
    const words = msg.trim().split(/\s+/);
    const firstWord = words[0];
    
    // Aplicar mesmos filtros do sistema
    let isValid = true;
    let reason = '';
    
    if (!firstWord || firstWord.length < 2) {
      isValid = false;
      reason = 'Muito curta';
    } else if (/(.)\1{2,}/.test(firstWord)) {
      isValid = false;
      reason = 'Muitos caracteres repetidos';
    } else if (['kkk', 'kkkk', 'kkkkk', 'haha', 'hahaha', 'rsrs', 'rsrsrs', 'lol', 'wtf', 'omg'].includes(firstWord.toLowerCase())) {
      isValid = false;
      reason = 'Palavra comum';
    }
    
    console.log(`  ${index + 1}. "${firstWord}" - ${isValid ? '✅ VÁLIDA' : '❌ INVÁLIDA'} ${reason ? `(${reason})` : ''}`);
  });
  
  console.log('\n🎯 Resultado esperado:');
  console.log('✅ Palavras que devem ser contadas: falei, crlh, ue, mega, a, sei, EITA');
  console.log('❌ Palavras que devem ser ignoradas: kkkkkkkk (muitos caracteres repetidos)');
}

testYouTubeWordProcessing();
