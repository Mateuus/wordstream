# 🎮 WordStream Multi-Plataforma - YouTube Live Chat

## 📋 Visão Geral

O WordStream agora suporta captura de chat do **YouTube Live** além do Twitch! Você pode conectar-se a múltiplas plataformas simultaneamente e capturar mensagens de chat em tempo real.

## 🚀 Funcionalidades Implementadas

### ✅ YouTube Live Chat
- **Captura em tempo real** usando a [YouTube Data API v3](https://developers.google.com/youtube/v3/live/docs/liveChatMessages?hl=pt-br)
- **Suporte a diferentes tipos de mensagem**:
  - Mensagens de texto normais
  - Super Chats (com valores monetários)
  - Super Stickers
  - Milestones de membros
  - Novos patrocinadores
  - Fan Funding
  - Enquetes
  - Presentes de assinatura
- **Badges automáticas**: Owner, Moderator, Sponsor, Verified
- **Cores únicas** para cada usuário baseadas no ID do canal

### ✅ Multi-Plataforma
- **Conexão simultânea** ao Twitch e YouTube
- **Interface unificada** para configurar ambas as plataformas
- **Estatísticas combinadas** de todas as plataformas
- **Mensagens identificadas** por plataforma de origem

## 🛠️ Como Usar

### 1. Obter API Key do YouTube

1. Acesse o [Google Cloud Console](https://console.developers.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Ative a **YouTube Data API v3**
4. Crie uma **API Key** nas credenciais
5. Configure as restrições de API se necessário

### 2. Encontrar o ID do Canal YouTube

1. Acesse o canal do YouTube desejado
2. Copie a URL: `https://www.youtube.com/channel/[ID_DO_CANAL]`
3. O ID é a parte após `/channel/`

### 3. Configurar Multi-Plataforma

1. Acesse `/multiplatform` no WordStream
2. Configure as plataformas desejadas:
   - **Twitch**: Digite o nome do canal
   - **YouTube**: Digite o ID do canal e a API Key
3. Clique em "Conectar"

## 📁 Arquivos Criados

### Serviços
- `src/lib/youtubeChatService.ts` - Serviço principal do YouTube
- `src/lib/multiPlatformChatManager.ts` - Gerenciador multi-plataforma

### APIs
- `src/app/api/multiplatform/[channel]/route.ts` - API para gerenciar conexões

### Componentes
- `src/components/MultiPlatformSetup.tsx` - Interface de configuração
- `src/app/multiplatform/page.tsx` - Página de teste

### Contexto Atualizado
- `src/contexts/SimpleSSEContext.tsx` - Adicionado suporte multi-plataforma

## 🔧 Configuração Técnica

### Variáveis de Ambiente

Adicione ao seu `.env.local`:

```bash
# YouTube Data API v3
YOUTUBE_API_KEY=sua_api_key_aqui
```

### Dependências Instaladas

```bash
npm install googleapis
```

## 📊 Tipos de Mensagem Suportados

### YouTube
- `textMessage` - Mensagem de texto normal
- `superChat` - Super Chat com valor monetário
- `superSticker` - Super Sticker
- `memberMilestone` - Milestone de membro
- `newSponsor` - Novo patrocinador
- `fanFunding` - Fan Funding
- `poll` - Enquete
- `membershipGifting` - Presente de assinatura
- `giftMembershipReceived` - Assinatura recebida
- `messageDeleted` - Mensagem deletada
- `userBanned` - Usuário banido
- `chatEnded` - Chat encerrado

### Twitch (existente)
- Mensagens de texto normais
- Emotes do Twitch
- Badges (Subscriber, Moderator, etc.)

## 🎯 Exemplo de Uso

```typescript
// Conectar a múltiplas plataformas
const config = {
  twitch: {
    channel: 'fontinnelerj',
    enabled: true
  },
  youtube: {
    channelId: 'UC1234567890abcdef',
    apiKey: 'sua_api_key',
    enabled: true
  }
};

await connectToMultiPlatform(config);
```

## ⚠️ Limitações e Considerações

### YouTube
- **Funciona apenas durante transmissões ao vivo**
- **Requer API Key válida** com quota suficiente
- **Rate limiting**: Polling a cada 3 segundos (recomendado pela API)
- **Quota**: Cada requisição consome quota da API

### Twitch
- **Funciona sempre** (não precisa de live ativa)
- **Sem limitações de quota**

## 🔍 Monitoramento

### Logs do Console
- `🎬 Iniciando captura do YouTube` - Serviço iniciado
- `📨 [YouTube] Username: mensagem` - Mensagem capturada
- `❌ Erro ao buscar mensagens` - Erro na API
- `🚫 Erro de autenticação` - Problema com API Key

### Status da Conexão
- Verificação automática de plataformas ativas
- Reconexão automática em caso de falha
- Limpeza automática de conexões inativas

## 🚀 Próximos Passos

1. **Testar com live real** do YouTube
2. **Implementar cache** para reduzir chamadas à API
3. **Adicionar mais plataformas** (Kick, etc.)
4. **Melhorar tratamento de erros**
5. **Implementar reconexão automática**

## 📚 Referências

- [YouTube Data API v3 - Live Chat Messages](https://developers.google.com/youtube/v3/live/docs/liveChatMessages?hl=pt-br)
- [Google Cloud Console](https://console.developers.google.com/)
- [YouTube Data API Quotas](https://developers.google.com/youtube/v3/getting-started#quota)

---

**Desenvolvido com ❤️ para a comunidade de streamers!**
