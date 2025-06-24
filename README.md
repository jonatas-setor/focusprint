# 🚀 FocuSprint

**FocuSprint** é uma plataforma completa de gestão de projetos que combina Kanban board, chat em tempo real e videochamadas em uma interface unificada. Desenvolvida com Next.js, Supabase e shadcn/ui.

## ✨ Características Principais

- **🎯 Kanban Board Inteligente**: Gestão visual de tarefas com drag & drop
- **💬 Chat em Tempo Real**: Comunicação integrada por projeto
- **📹 Videochamadas**: Integração com Google Meet (opcional)
- **👥 Gestão de Equipes**: Controle de usuários e permissões
- **📊 Dashboard Admin**: Métricas, auditoria e gestão completa
- **💳 Sistema de Licenças**: Integração com Stripe para pagamentos
- **🔐 Autenticação Robusta**: Supabase Auth com 2FA para admins

## 🏗️ Arquitetura

### Stack Tecnológico
- **Frontend**: Next.js 15 + React + TypeScript
- **UI/Styling**: shadcn/ui + Tailwind CSS
- **Backend**: Next.js API Routes + Supabase
- **Database**: PostgreSQL (Supabase)
- **Autenticação**: Supabase Auth
- **Pagamentos**: Stripe
- **Deploy**: Vercel

### Estrutura do Projeto
```
src/
├── app/                          # App Router (Next.js 15)
│   ├── (platform-admin)/         # Admin dashboard
│   ├── (client-dashboard)/       # Client dashboard
│   ├── api/                      # API routes
│   └── admin-login/              # Admin login page
├── components/                   # Componentes reutilizáveis
│   ├── admin/                    # Componentes admin
│   ├── client/                   # Componentes cliente
│   └── shared/                   # Componentes compartilhados
├── lib/                          # Utilitários e serviços
│   ├── auth/                     # Autenticação e RBAC
│   ├── supabase/                 # Cliente Supabase
│   └── utils/                    # Funções utilitárias
└── types/                        # Definições TypeScript
```

## 🚀 Início Rápido

### 1. Pré-requisitos
- Node.js 18+
- npm ou yarn
- Conta Supabase
- Conta Stripe (opcional)

### 2. Configuração Local

```bash
# Clone o repositório
git clone https://github.com/jonatas-setor/focusprint.git
cd focusprint

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.template .env.local
# Edite .env.local com suas credenciais reais
```

### 3. Configurar Supabase
1. Crie um projeto no [Supabase](https://supabase.com)
2. Execute os scripts SQL em `database/` (se disponível localmente)
3. Configure as políticas RLS
4. Copie as chaves para `.env.local`

### 4. Executar Localmente

```bash
# Inicie o servidor de desenvolvimento
npm run dev

# Acesse a aplicação
# Cliente: http://localhost:3001
# Admin: http://localhost:3001/admin-login
```

## 📦 Deploy na Vercel

### Preparação Automática ✅
Este repositório está **pronto para deploy** na Vercel:

- ✅ Build de produção configurado
- ✅ Arquivos sensíveis excluídos
- ✅ .vercelignore otimizado
- ✅ Renderização dinâmica configurada
- ✅ Documentação completa

### Deploy Rápido

1. **Conecte o Repositório**
   - Acesse [vercel.com](https://vercel.com)
   - Importe: `jonatas-setor/focusprint`

2. **Configure Variáveis de Ambiente**
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
   SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
   STRIPE_SECRET_KEY=sk_live_sua-stripe-key
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_sua-stripe-key
   NEXTAUTH_SECRET=seu-nextauth-secret
   NEXTAUTH_URL=https://seu-app.vercel.app
   NODE_ENV=production
   ```

3. **Deploy**
   - Clique em "Deploy"
   - Aguarde o build (2-3 minutos)
   - ✅ Aplicação online!

### 📋 Guias Detalhados
- **[VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)** - Guia completo de deploy
- **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** - Configuração do Supabase
- **[SHADCN_SETUP.md](./SHADCN_SETUP.md)** - Configuração do shadcn/ui

## 🔧 Desenvolvimento

### Scripts Disponíveis
```bash
npm run dev          # Servidor de desenvolvimento (porta 3001)
npm run build        # Build de produção
npm run start        # Servidor de produção
npm run lint         # Verificação de código
```

### Estrutura de Autenticação
- **Cliente**: Dashboard padrão (`/dashboard`)
- **Admin**: Login restrito (`/admin-login`) + 2FA
- **RBAC**: Sistema de permissões baseado em roles

### Banco de Dados
- **Supabase**: PostgreSQL com Row Level Security (RLS)
- **Migrações**: Gerenciadas via Supabase Dashboard
- **Backup**: Automático via Supabase

## 🎯 Funcionalidades

### Para Clientes
- ✅ Dashboard de projetos
- ✅ Kanban board com drag & drop
- ✅ Chat em tempo real
- ✅ Gestão de equipes
- ✅ Convites para colaboradores

### Para Administradores
- ✅ Dashboard completo com métricas
- ✅ Gestão de clientes e licenças
- ✅ Sistema de auditoria
- ✅ Integração Stripe
- ✅ Autenticação 2FA
- ✅ Logs de sistema

## 🔒 Segurança

- **Autenticação**: Supabase Auth + JWT
- **Autorização**: RBAC com políticas RLS
- **2FA**: TOTP para administradores
- **Auditoria**: Log completo de ações
- **Criptografia**: Dados sensíveis criptografados
- **HTTPS**: SSL/TLS obrigatório

## 📊 Monitoramento

### Métricas Disponíveis
- Performance da aplicação
- Uso de recursos
- Atividade de usuários
- Transações Stripe
- Logs de erro

### Ferramentas
- **Vercel Analytics**: Performance e usage
- **Supabase Dashboard**: Database metrics
- **Stripe Dashboard**: Payment analytics

## 🆘 Suporte

### Troubleshooting
1. **Build Errors**: Verifique variáveis de ambiente
2. **Database Issues**: Confirme políticas RLS
3. **Auth Problems**: Valide configuração Supabase
4. **Payment Issues**: Verifique webhooks Stripe

### Logs
- **Vercel**: Dashboard > Functions > Logs
- **Supabase**: Dashboard > Logs
- **Local**: Console do navegador

## 📝 Licença

Este projeto é propriedade privada. Todos os direitos reservados.

## 🤝 Contribuição

Para contribuir com o projeto:
1. Faça fork do repositório
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Abra um Pull Request

---

**FocuSprint** - Transformando a gestão de projetos com tecnologia moderna 🚀
