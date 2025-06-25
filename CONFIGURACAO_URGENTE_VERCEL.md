# 🚨 CONFIGURAÇÃO URGENTE - VERCEL ENVIRONMENT VARIABLES

## ⚡ AÇÃO IMEDIATA NECESSÁRIA

### 🔗 **ACESSE A VERCEL DASHBOARD**
1. Vá para: https://vercel.com/dashboard
2. Encontre o projeto "focusprint" ou crie um novo
3. Clique em **Settings** → **Environment Variables**

### 📋 **COPIE E COLE ESTAS VARIÁVEIS EXATAMENTE:**

#### **1. SUPABASE_URL**
```
Nome: NEXT_PUBLIC_SUPABASE_URL
Valor: https://tuyeqoudkeufkxtkupuh.supabase.co
Environments: Production, Preview, Development
```

#### **2. SUPABASE_ANON_KEY**
```
Nome: NEXT_PUBLIC_SUPABASE_ANON_KEY
Valor: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1eWVxb3Vka2V1Zmt4dGt1cHVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5NjU2MzQsImV4cCI6MjA2MzU0MTYzNH0.0I9YIT1iTmE4Zwl-Dtptnn5LzE7I4GBYAKsLNSLjUYQ
Environments: Production, Preview, Development
```

#### **3. SUPABASE_SERVICE_KEY**
```
Nome: SUPABASE_SERVICE_ROLE_KEY
Valor: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1eWVxb3Vka2V1Zmt4dGt1cHVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzk2NTYzNCwiZXhwIjoyMDYzNTQxNjM0fQ.cvFblqqFstFFB88HGJcJfyx2NfSu7F8j6qhlTMtU38o
Environments: Production, Preview, Development
```

#### **4. NEXTAUTH_SECRET** (GERE UMA NOVA)
```
Nome: NEXTAUTH_SECRET
Valor: [EXECUTE: openssl rand -base64 32]
Environments: Production, Preview, Development
```

#### **5. NEXTAUTH_URL**
```
Nome: NEXTAUTH_URL
Valor: https://focusprint.vercel.app
Environments: Production
```

#### **6. NODE_ENV**
```
Nome: NODE_ENV
Valor: production
Environments: Production
```

#### **7. APP_URL**
```
Nome: NEXT_PUBLIC_APP_URL
Valor: https://focusprint.vercel.app
Environments: Production
```

## 🔐 **COMO GERAR NEXTAUTH_SECRET**

### **Opção 1: Terminal/CMD**
```bash
openssl rand -base64 32
```

### **Opção 2: Online (Seguro)**
1. Acesse: https://generate-secret.vercel.app/32
2. Copie o valor gerado

### **Opção 3: Node.js**
```javascript
require('crypto').randomBytes(32).toString('base64')
```

## 🚀 **APÓS CONFIGURAR AS VARIÁVEIS**

### **1. CONECTAR GITHUB (se não estiver conectado)**
- Na Vercel Dashboard → New Project
- Import Git Repository
- Selecione: `jonatas-setor/focusprint`

### **2. FORÇAR REDEPLOY**
- Vá em **Deployments**
- Clique nos "..." do último deploy
- Selecione **Redeploy**

### **3. VERIFICAR STATUS**
- Aguarde 2-3 minutos
- Acesse: https://focusprint.vercel.app
- Verifique se carrega sem erros

## ⚠️ **CHECKLIST DE VERIFICAÇÃO**

- [ ] Todas as 7 variáveis configuradas
- [ ] NEXTAUTH_SECRET gerada (não usar exemplo)
- [ ] Projeto conectado ao GitHub
- [ ] Redeploy executado
- [ ] Site funcionando

## 🆘 **SE AINDA NÃO FUNCIONAR**

### **Verificar Logs:**
1. Vercel Dashboard → Projeto → Functions
2. Procure por erros nos logs
3. Verifique se todas as variáveis estão presentes

### **Domínio Alternativo:**
Se `focusprint.vercel.app` não funcionar, use o domínio automático:
- Vercel gera algo como: `focusprint-git-main-jonatas-setor.vercel.app`
- Atualize `NEXTAUTH_URL` e `NEXT_PUBLIC_APP_URL` com o novo domínio

## 📞 **SUPORTE IMEDIATO**

Se precisar de ajuda:
1. Copie os logs de erro da Vercel
2. Verifique se todas as variáveis estão exatamente como mostrado
3. Confirme que o projeto está conectado ao GitHub

**🎯 PRIORIDADE: Configure as variáveis AGORA e faça redeploy!**
