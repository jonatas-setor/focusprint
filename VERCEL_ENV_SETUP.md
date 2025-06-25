# 🚀 Configuração de Variáveis de Ambiente na Vercel

## ⚠️ PROBLEMA IDENTIFICADO
O build está falhando porque as variáveis de ambiente do Supabase não estão configuradas na Vercel.

## 🔧 SOLUÇÃO IMEDIATA

### 1. Configurar Variáveis na Vercel Dashboard

Acesse: https://vercel.com/dashboard → Seu Projeto → Settings → Environment Variables

**Adicione as seguintes variáveis:**

```bash
# SUPABASE (OBRIGATÓRIAS)
NEXT_PUBLIC_SUPABASE_URL=https://tuyeqoudkeufkxtkupuh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-aqui
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key-aqui

# NEXTAUTH (OBRIGATÓRIAS)
NEXTAUTH_SECRET=sua-secret-key-aqui
NEXTAUTH_URL=https://seu-dominio.vercel.app

# APLICAÇÃO
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://seu-dominio.vercel.app
```

### 2. Como Obter as Chaves do Supabase

1. Acesse: https://supabase.com/dashboard/project/tuyeqoudkeufkxtkupuh
2. Vá em Settings → API
3. Copie:
   - **URL**: https://tuyeqoudkeufkxtkupuh.supabase.co
   - **anon/public key**: eyJ... (chave pública)
   - **service_role key**: eyJ... (chave privada - CUIDADO!)

### 3. Gerar NEXTAUTH_SECRET

Execute no terminal:
```bash
openssl rand -base64 32
```

## 🔄 APÓS CONFIGURAR

1. Faça um novo deploy na Vercel
2. O build deve passar sem erros
3. Teste a aplicação em produção

## ⚡ CONFIGURAÇÃO RÁPIDA VIA CLI

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Configurar variáveis
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add NEXTAUTH_SECRET
vercel env add NEXTAUTH_URL

# Fazer redeploy
vercel --prod
```

## 🛡️ SEGURANÇA

- ✅ NEXT_PUBLIC_* são expostas no cliente (OK para URL e anon key)
- ⚠️ SERVICE_ROLE_KEY deve ser mantida secreta
- ⚠️ NEXTAUTH_SECRET deve ser única e secreta
- ✅ Use diferentes chaves para dev/prod

## 📝 CHECKLIST

- [ ] Variáveis configuradas na Vercel
- [ ] Build passou sem erros
- [ ] Aplicação funciona em produção
- [ ] Autenticação funcionando
- [ ] Database conectado
