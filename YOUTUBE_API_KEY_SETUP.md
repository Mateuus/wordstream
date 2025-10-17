# 🔑 Configuração da API Key do YouTube

## 📋 **Como configurar:**

### **1. Criar arquivo `.env.local`:**
```bash
# Copie o arquivo de exemplo
cp env.local.example .env.local
```

### **2. Editar `.env.local`:**
```bash
# YouTube Configuration
YOUTUBE_API_KEY=AIzaSyCfWuMIQPN9s413_GRVUB0I4AbM46mZoU4
```

### **3. Reiniciar o servidor:**
```bash
npm run dev
```

## ✅ **Benefícios:**

- ✅ **Segurança**: API Key não fica exposta no código
- ✅ **Facilidade**: Não precisa digitar toda vez
- ✅ **Flexibilidade**: Pode usar API Key diferente por ambiente
- ✅ **Produção**: Fácil de configurar no servidor

## 🎯 **Como funciona:**

1. **Se API Key estiver no `.env.local`**: Campo fica com placeholder "API Key configurada no servidor"
2. **Se não estiver**: Campo fica normal para você digitar
3. **Validação automática**: Usa a do ambiente se disponível, senão usa a digitada
4. **Feedback visual**: Mostra ✅ quando configurada no servidor

## 🚀 **Para usar:**

1. **Configure** a API Key no `.env.local`
2. **Reinicie** o servidor
3. **Selecione** YouTube no dropdown
4. **Digite** o ID do canal
5. **Clique** "Criar Sessão" (campo da API Key fica opcional)

## 🔒 **Segurança:**

- ✅ **Nunca** commite o arquivo `.env.local`
- ✅ **Use** `.env.local` apenas para desenvolvimento
- ✅ **Configure** variáveis de ambiente no servidor de produção
- ✅ **Monitore** uso da API no Google Cloud Console
