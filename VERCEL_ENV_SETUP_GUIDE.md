# 🔧 Guia Passo-a-Passo: Configurar Variáveis de Ambiente na Vercel

## 🚨 **AÇÃO IMEDIATA NECESSÁRIA**

O deployment está falhando porque as variáveis de ambiente não estão configuradas na Vercel. Siga este guia exato:

## 📋 **Passo 1: Acessar o Dashboard da Vercel**

1. **Abra seu navegador** e vá para: https://vercel.com/dashboard
2. **Faça login** com sua conta
3. **Encontre o projeto "focusprint"** na lista de projetos
4. **Clique no nome do projeto** para abrir

## ⚙️ **Passo 2: Navegar para Configurações**

1. **Clique na aba "Settings"** (no topo da página)
2. **No menu lateral esquerdo**, clique em **"Environment Variables"**
3. Você verá uma página com o título "Environment Variables"

## 🔑 **Passo 3: Adicionar Cada Variável**

Para **CADA** variável abaixo, siga estes passos:

### **Variável 1: NEXT_PUBLIC_SUPABASE_URL**
1. Clique no botão **"Add New"**
2. **Name**: `NEXT_PUBLIC_SUPABASE_URL`
3. **Value**: `https://tuyeqoudkeufkxtkupuh.supabase.co`
4. **Environments**: ✅ Production ✅ Preview ✅ Development (marque TODOS)
5. Clique **"Save"**

### **Variável 2: NEXT_PUBLIC_SUPABASE_ANON_KEY**
1. Clique no botão **"Add New"**
2. **Name**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1eWVxb3Vka2V1Zmt4dGt1cHVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5NjU2MzQsImV4cCI6MjA2MzU0MTYzNH0.0I9YIT1iTmE4Zwl-Dtptnn5LzE7I4GBYAKsLNSLjUYQ`
4. **Environments**: ✅ Production ✅ Preview ✅ Development
5. Clique **"Save"**

### **Variável 3: SUPABASE_SERVICE_ROLE_KEY**
1. Clique no botão **"Add New"**
2. **Name**: `SUPABASE_SERVICE_ROLE_KEY`
3. **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1eWVxb3Vka2V1Zmt4dGt1cHVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzk2NTYzNCwiZXhwIjoyMDYzNTQxNjM0fQ.cvFblqqFstFFB88HGJcJfyx2NfSu7F8j6qhlTMtU38o`
4. **Environments**: ✅ Production ✅ Preview ✅ Development
5. Clique **"Save"**

### **Variável 4: NEXTAUTH_SECRET**
1. Clique no botão **"Add New"**
2. **Name**: `NEXTAUTH_SECRET`
3. **Value**: `P4S1SgMcvzhJq+F0NQocX4NV4jLqUKdWSQ8YP6IFvzY=`
4. **Environments**: ✅ Production ✅ Preview ✅ Development
5. Clique **"Save"**

### **Variável 5: NEXTAUTH_URL**
1. Clique no botão **"Add New"**
2. **Name**: `NEXTAUTH_URL`
3. **Value**: `https://focusprint.vercel.app`
4. **Environments**: ✅ Production ✅ Preview ✅ Development
5. Clique **"Save"**

### **Variável 6: NODE_ENV**
1. Clique no botão **"Add New"**
2. **Name**: `NODE_ENV`
3. **Value**: `production`
4. **Environments**: ✅ Production ✅ Preview ✅ Development
5. Clique **"Save"**

### **Variável 7: NEXT_PUBLIC_APP_URL**
1. Clique no botão **"Add New"**
2. **Name**: `NEXT_PUBLIC_APP_URL`
3. **Value**: `https://focusprint.vercel.app`
4. **Environments**: ✅ Production ✅ Preview ✅ Development
5. Clique **"Save"**

## 🚀 **Passo 4: Forçar Redeploy**

Após adicionar TODAS as variáveis:

1. **Vá para a aba "Deployments"** (no topo)
2. **Encontre o deployment mais recente** (primeiro da lista)
3. **Clique nos três pontos "..."** ao lado do deployment
4. **Selecione "Redeploy"**
5. **Confirme clicando "Redeploy"** novamente
6. **Aguarde 3-5 minutos** para o deployment completar

## ✅ **Passo 5: Verificação**

Após o redeploy, teste estes links:

### **APIs devem funcionar:**
- https://focusprint.vercel.app/api/health ← Deve retornar JSON, não 404
- https://focusprint.vercel.app/api/client/projects ← Deve retornar 401 (auth required), não 404

### **Páginas devem funcionar:**
- https://focusprint.vercel.app/dashboard/projects ← Deve mostrar projetos reais, não placeholder

## 🚨 **IMPORTANTE: Checklist de Verificação**

Antes de prosseguir, confirme que:

- [ ] **7 variáveis** foram adicionadas
- [ ] **Todas** têm os 3 environments marcados (Production, Preview, Development)
- [ ] **Valores** foram copiados exatamente (sem espaços extras)
- [ ] **Redeploy** foi executado
- [ ] **Aguardou** 3-5 minutos para completar

## 🎯 **Resultado Esperado**

Após seguir todos os passos:

```bash
# Antes:
❌ https://focusprint.vercel.app/api/health → 404
❌ Projects page → Placeholder text

# Depois:
✅ https://focusprint.vercel.app/api/health → JSON response
✅ Projects page → Real project data
✅ Login/authentication → Working
✅ All features → Functional
```

## 📞 **Se Algo Der Errado**

Se após seguir todos os passos ainda houver problemas:

1. **Verifique** se todas as 7 variáveis estão listadas na página Environment Variables
2. **Confirme** que cada uma tem os 3 environments marcados
3. **Tente** fazer outro redeploy
4. **Aguarde** mais 5 minutos (às vezes demora)

---

**⏰ Tempo estimado**: 10-15 minutos  
**🎯 Resultado**: Deployment 100% funcional  
**🚨 Prioridade**: CRÍTICA - Necessário para produção
