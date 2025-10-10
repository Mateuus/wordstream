# 🎬 Overlays OBS - WordStream

Este documento explica como usar os overlays do OBS criados para o sistema WordStream de contador de palavras.

## 📋 Visão Geral

Foram criados 2 overlays principais para integração com OBS:

1. **Top 5 Palavras** - Lista das 5 palavras mais mencionadas no chat
2. **Timer com Resultado** - Contador regressivo que mostra o resultado final com efeito visual

## 🚀 Como Usar

### 1. Acesse uma Sessão

Vá para qualquer sessão do WordStream: `https://wordstream.bdjcoins.com/session/[publicId]` (produção) ou `http://localhost:3000/session/[publicId]` (desenvolvimento)

### 2. Abra o Modal de Overlays

Clique no botão **"🎬 Overlays OBS"** no header da página (disponível tanto no mobile quanto desktop).

### 3. Configure as Opções

- **Duração do Timer**: Defina quantos segundos o timer deve durar (10-600 segundos)
- **Canal**: Automaticamente detectado da sessão atual

### 4. Copie as URLs

Use os botões "Copiar" para copiar as URLs dos overlays:

- **Top 5**: `/obs/top5/[publicId]`
- **Timer**: `/obs/timer/[publicId]?duration=[duracao]`

### 5. Configure no OBS

1. Crie uma nova fonte "Navegador" no OBS
2. Cole a URL copiada
3. Configure as dimensões:
   - **Top 5**: 400x600px
   - **Timer**: 600x400px
4. Marque "Desabilitar cache" para atualizações em tempo real

## 🎯 Funcionalidades

### Overlay Top 5 Palavras

- ✅ Lista em tempo real das 5 palavras mais mencionadas
- ✅ Cores diferenciadas por posição (ouro, prata, bronze, etc.)
- ✅ Fundo transparente para integração com o stream
- ✅ Atualização automática via SSE
- ✅ Filtros anti-spam integrados
- ✅ Integração com sistema de sessões do WordStream
- ✅ **Tela em branco quando não há palavras** (ideal para live)

### Overlay Timer com Resultado

- ✅ Contador regressivo visual
- ✅ Mudança de cor quando restam menos de 10 segundos
- ✅ Efeito visual ao finalizar (animação de resultado)
- ✅ Exibição do vencedor com animações
- ✅ Resultado aparece apenas uma vez (prevenção de duplicação)
- ✅ Auto-hide do resultado após 5 segundos
- ✅ Fundo transparente
- ✅ **Sincronizado com temporizador da sessão principal**
- ✅ **Tela em branco quando timer não está ativo** (ideal para live)

## ⚙️ Configurações Avançadas

### Parâmetros da URL

#### Top 5 Overlay
```
/obs/top5/[publicId]
```

- `publicId`: ID público da sessão WordStream

#### Timer Overlay
```
/obs/timer/[publicId]?duration=[duracao]
```

- `publicId`: ID público da sessão WordStream
- `duration`: Duração em segundos (10-600)

### Exemplos de URLs

```
# Top 5 para sessão específica
/obs/top5/abc123def456

# Timer de 2 minutos para sessão específica
/obs/timer/abc123def456?duration=120
```

## 🎨 Personalização Visual

### Cores do Ranking
- **1º lugar**: Ouro (#FFD700)
- **2º lugar**: Prata (#C0C0C0)
- **3º lugar**: Bronze (#CD7F32)
- **4º lugar**: Verde (#00ff00)
- **5º lugar**: Azul (#00bfff)

### Animações
- **Timer**: Efeito de pulso contínuo
- **Resultado**: Fade-in com slide
- **Palavras**: Slide-in sequencial
- **Coroa**: Bounce para o vencedor

## 🔧 Sistema de Timer

### Estados do Timer
1. **Inativo**: Tela em branco (timer não iniciado)
2. **Ativo**: Contagem regressiva em andamento
3. **Finalizado**: Resultado sendo exibido
4. **Escondido**: Tela em branco (após 5 segundos do resultado)

### Controle Automático
- **Timer controlado pela sessão principal** (não automático)
- Resultado aparece automaticamente ao finalizar
- Resultado some automaticamente após 5 segundos
- Prevenção de exibição múltipla do resultado
- **Tela sempre em branco quando não há conteúdo ativo** (ideal para live)

## 🔗 Integração com WordStream

### Sincronização de Dados
- Os overlays usam o mesmo contexto SSE da sessão principal
- Dados sincronizados em tempo real
- Mesma fonte de dados do contador principal

### Sessões Protegidas
- Overlays funcionam com sessões protegidas por senha
- Mantém autenticação da sessão principal
- URLs são específicas por sessão

## 🐛 Solução de Problemas

### Timer não inicia
- Verifique se o publicId está correto
- Confirme se a sessão está ativa
- Recarregue a página

### Palavras não aparecem
- Verifique se o chat está conectado na sessão principal
- Confirme se há mensagens sendo processadas
- Verifique os filtros anti-spam

### Resultado não aparece
- Aguarde o timer finalizar completamente
- Verifique se não foi exibido anteriormente
- Recarregue a página se necessário

### Overlay não carrega no OBS
- Verifique se a URL está correta
- Confirme se o servidor está rodando
- Teste no navegador primeiro
- Desabilite cache no OBS

### Modal não abre
- Verifique se está em uma sessão válida
- Confirme se o botão "🎬 Overlays OBS" está visível
- Recarregue a página se necessário

## 📱 Responsividade

Os overlays são otimizados para:
- **Desktop**: Resolução padrão de stream
- **Mobile**: Adaptação automática
- **OBS**: Integração nativa com navegador

## 🎬 Uso em Live

### Comportamento Ideal para Stream
- **Tela em branco**: Quando não há conteúdo ativo, a tela fica completamente transparente
- **Sem textos de loading**: Não mostra "Carregando..." ou "Aguardando palavras..."
- **Sem estados finais**: Não mostra "Contador finalizado" ou mensagens similares
- **Apenas conteúdo relevante**: Só exibe quando há dados para mostrar

### Estados dos Overlays

#### Top 5 Palavras
- **Sem palavras**: Tela em branco
- **Com palavras**: Lista das 5 palavras mais mencionadas

#### Timer com Resultado
- **Inativo**: Tela em branco (timer não iniciado)
- **Ativo**: Contador regressivo visível
- **Resultado**: Animação do vencedor por 5 segundos
- **Finalizado**: Tela em branco novamente

## 🔄 Atualizações em Tempo Real

- **SSE**: Server-Sent Events para atualizações instantâneas
- **Sincronização**: Overlays compartilham dados com a sessão principal
- **Performance**: Otimizado para baixo uso de recursos

## 🎬 Modal de Controle

### Funcionalidades do Modal
- **Configuração**: Ajuste da duração do timer
- **URLs**: Geração automática das URLs dos overlays
- **Cópia**: Botões para copiar URLs para área de transferência
- **Preview**: Visualização dos overlays em tempo real
- **Instruções**: Guia passo-a-passo para configuração no OBS

### Interface
- **Design**: Consistente com o tema do WordStream
- **Responsivo**: Funciona em mobile e desktop
- **Acessível**: Fácil de usar e entender

## 📞 Suporte

Para problemas ou dúvidas:
1. Verifique este documento
2. Teste no navegador primeiro
3. Verifique os logs do console
4. Confirme as configurações do OBS
5. Teste a sessão principal do WordStream

## 🔄 Fluxo de Uso

1. **Criar/Acessar Sessão**: Vá para uma sessão do WordStream
2. **Abrir Modal**: Clique em "🎬 Overlays OBS"
3. **Configurar**: Ajuste a duração do timer se necessário
4. **Copiar URLs**: Use os botões para copiar as URLs
5. **Configurar OBS**: Adicione como fonte navegador no OBS
6. **Ajustar Dimensões**: Configure largura e altura conforme especificado
7. **Testar**: Verifique se os overlays estão funcionando corretamente

---

**Nota**: Os overlays funcionam melhor quando o chat está ativo e recebendo mensagens. Certifique-se de que a sessão principal do WordStream está funcionando corretamente antes de usar os overlays.
