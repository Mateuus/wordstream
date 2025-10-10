#!/bin/bash

# Script de configuração para produção - WordStream PWA
# Este script configura o ambiente de produção com as variáveis corretas

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Configurando WordStream PWA para Produção${NC}"
echo "=============================================="

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Execute este script no diretório raiz do projeto${NC}"
    exit 1
fi

# Criar arquivo .env.production se não existir
if [ ! -f ".env.production" ]; then
    echo -e "${YELLOW}📝 Criando arquivo .env.production...${NC}"
    cp env.production .env.production
    echo -e "${GREEN}✅ Arquivo .env.production criado${NC}"
else
    echo -e "${GREEN}✅ Arquivo .env.production já existe${NC}"
fi

# Verificar se o arquivo .env.production está correto
echo -e "\n${YELLOW}🔍 Verificando configurações de produção...${NC}"

# Verificar se contém o domínio correto
if grep -q "wordstream.bdjcoins.com" .env.production; then
    echo -e "${GREEN}✅ Domínio de produção configurado: wordstream.bdjcoins.com${NC}"
else
    echo -e "${RED}❌ Domínio de produção não encontrado no .env.production${NC}"
fi

# Verificar se contém a porta correta
if grep -q "PORT=3500" .env.production; then
    echo -e "${GREEN}✅ Porta de produção configurada: 3500${NC}"
else
    echo -e "${RED}❌ Porta de produção não encontrada no .env.production${NC}"
fi

# Verificar se contém NODE_ENV=production
if grep -q "NODE_ENV=production" .env.production; then
    echo -e "${GREEN}✅ NODE_ENV configurado para produção${NC}"
else
    echo -e "${RED}❌ NODE_ENV não configurado para produção${NC}"
fi

# Instalar dependências
echo -e "\n${YELLOW}📦 Instalando dependências...${NC}"
npm install

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Dependências instaladas com sucesso!${NC}"
else
    echo -e "${RED}❌ Falha ao instalar dependências${NC}"
    exit 1
fi

# Gerar ícones do PWA
echo -e "\n${YELLOW}🎨 Gerando ícones do PWA...${NC}"
npm run generate-icons

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Ícones gerados com sucesso!${NC}"
else
    echo -e "${YELLOW}⚠️  Aviso: Falha ao gerar ícones (pode não ser crítico)${NC}"
fi

# Build do aplicativo para produção
echo -e "\n${YELLOW}🔨 Fazendo build para produção...${NC}"
NODE_ENV=production npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build de produção concluído com sucesso!${NC}"
else
    echo -e "${RED}❌ Falha no build de produção${NC}"
    exit 1
fi

# Verificar se o PM2 está instalado
if ! command -v pm2 >/dev/null 2>&1; then
    echo -e "${YELLOW}📦 Instalando PM2...${NC}"
    npm install -g pm2
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ PM2 instalado com sucesso!${NC}"
    else
        echo -e "${RED}❌ Falha ao instalar PM2${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ PM2 já está instalado${NC}"
fi

# Criar diretório de logs se não existir
if [ ! -d "logs" ]; then
    mkdir -p logs
    echo -e "${GREEN}✅ Diretório de logs criado${NC}"
else
    echo -e "${GREEN}✅ Diretório de logs já existe${NC}"
fi

# Configurar PM2 para iniciar com o sistema
echo -e "\n${YELLOW}⚙️  Configurando PM2 para iniciar com o sistema...${NC}"
pm2 startup

echo -e "\n${GREEN}🎉 Configuração de produção concluída!${NC}"
echo ""
echo -e "${YELLOW}📋 Próximos passos:${NC}"
echo "  1. Configure as variáveis de ambiente no arquivo .env.production"
echo "  2. Execute: npm run pm2:start:prod"
echo "  3. Execute: npm run pm2:monit (para monitorar)"
echo ""
echo -e "${YELLOW}🔧 Comandos úteis:${NC}"
echo "  npm run pm2:start:prod    - Iniciar em produção"
echo "  npm run pm2:stop          - Parar aplicativo"
echo "  npm run pm2:restart       - Reiniciar aplicativo"
echo "  npm run pm2:logs          - Ver logs"
echo "  npm run pm2:monit         - Monitoramento em tempo real"
echo ""
echo -e "${YELLOW}🌐 Acesse o aplicativo em:${NC}"
echo "  https://wordstream.bdjcoins.com"
echo ""
echo -e "${YELLOW}📊 Para monitorar, execute:${NC}"
echo "  ./scripts/monitor.sh"
