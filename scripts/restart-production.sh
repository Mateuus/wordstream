#!/bin/bash

# Script para reiniciar WordStream PWA em produção
# Este script para processos existentes e inicia novamente

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 Reiniciando WordStream PWA em Produção${NC}"
echo "=============================================="

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Execute este script no diretório raiz do projeto${NC}"
    exit 1
fi

# Parar processos existentes
echo -e "\n${YELLOW}🛑 Parando processos existentes...${NC}"
pm2 stop wordstream-pwa 2>/dev/null || echo -e "${YELLOW}⚠️  Nenhum processo wordstream-pwa encontrado${NC}"
pm2 delete wordstream-pwa 2>/dev/null || echo -e "${YELLOW}⚠️  Nenhum processo wordstream-pwa para deletar${NC}"

# Limpar logs antigos (opcional)
echo -e "\n${YELLOW}🧹 Limpando logs antigos...${NC}"
if [ -d "logs" ]; then
    rm -f logs/*.log
    echo -e "${GREEN}✅ Logs antigos removidos${NC}"
else
    mkdir -p logs
    echo -e "${GREEN}✅ Diretório de logs criado${NC}"
fi

# Verificar se o arquivo ecosystem.config.js existe
if [ ! -f "ecosystem.config.js" ]; then
    echo -e "${RED}❌ Arquivo ecosystem.config.js não encontrado${NC}"
    exit 1
fi

# Verificar se o arquivo .env.production existe
if [ ! -f ".env.production" ]; then
    echo -e "${YELLOW}📝 Criando arquivo .env.production...${NC}"
    cp env.production .env.production
    echo -e "${GREEN}✅ Arquivo .env.production criado${NC}"
fi

# Build para produção
echo -e "\n${YELLOW}🔨 Fazendo build para produção...${NC}"
NODE_ENV=production npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build de produção concluído com sucesso!${NC}"
else
    echo -e "${RED}❌ Falha no build de produção${NC}"
    exit 1
fi

# Iniciar com PM2 em produção
echo -e "\n${YELLOW}🚀 Iniciando com PM2 em produção...${NC}"
pm2 start ecosystem.config.js --env production

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Aplicativo iniciado com sucesso!${NC}"
else
    echo -e "${RED}❌ Falha ao iniciar aplicativo${NC}"
    exit 1
fi

# Aguardar alguns segundos para o aplicativo inicializar
echo -e "\n${YELLOW}⏳ Aguardando inicialização...${NC}"
sleep 5

# Verificar status
echo -e "\n${YELLOW}📊 Status do aplicativo:${NC}"
pm2 status wordstream-pwa

# Verificar se está rodando
if pm2 list | grep -q "wordstream-pwa.*online"; then
    echo -e "\n${GREEN}🎉 WordStream PWA está rodando em produção!${NC}"
    echo -e "${YELLOW}🌐 Acesse: http://contador.bdjcoins.com${NC}"
    echo -e "${YELLOW}📊 Monitor: npm run pm2:monit${NC}"
    echo -e "${YELLOW}📝 Logs: npm run pm2:logs${NC}"
else
    echo -e "\n${RED}❌ Aplicativo não está rodando corretamente${NC}"
    echo -e "${YELLOW}📝 Verifique os logs: npm run pm2:logs${NC}"
    exit 1
fi

echo -e "\n${BLUE}=============================================="
echo -e "✅ Reinicialização concluída${NC}"
