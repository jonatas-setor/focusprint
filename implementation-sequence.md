# 🚀 Sequência de Implementação - FocuSprint

## 📋 **VISÃO GERAL DA IMPLEMENTAÇÃO**

### **🎯 Estratégia de Desenvolvimento**
**Prioridade 1**: Platform Admin (Semanas 1-2)
**Prioridade 2**: Client Dashboard (Semanas 3-4)
**Prioridade 3**: Integração e Polish (Semanas 5-6)

### **🏗️ Arquitetura de Duas Camadas**
```
Platform Admin (admin.focusprint.com)
├── Gestão de clientes
├── Sistema de licenciamento
├── Integração Stripe
└── Dashboard de métricas

Client Dashboard (app.focusprint.com)
├── Autenticação de clientes
├── CRUD times/projetos
├── Interface Kanban + Chat (70/30)
└── Google Meet integration
```

---

## 🔥 **FASE 1: PLATFORM ADMIN (SEMANAS 1-2)**

### **SEMANA 1: FUNDAÇÃO E SETUP**

#### **Dia 1-2: Setup Inicial do Projeto**
**Tempo estimado**: 16 horas

**Tarefas:**
```bash
# 1. Criar projeto Next.js
npx create-next-app@latest focusprint --typescript --tailwind --eslint --app
cd focusprint

# 2. Instalar dependências essenciais
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
npm install @stripe/stripe-js stripe
npm install @tanstack/react-query
npm install react-hook-form @hookform/resolvers zod
npm install date-fns lucide-react
npm install @radix-ui/react-slot class-variance-authority clsx tailwind-merge

# 3. Setup shadcn/ui
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input card table form dialog toast
```

**Arquivos a criar:**
```
PROJETOS/focusprint/
├── .env.local                    # ⚠️ NUNCA COMMITAR - Chaves de API
├── .env.example                  # Template para outros devs
├── src/
│   ├── app/
│   │   ├── (platform-admin)/
│   │   │   ├── admin/
│   │   │   │   ├── layout.tsx
│   │   │   │   └── page.tsx
│   │   │   └── api/admin/
│   ├── components/
│   │   ├── ui/ (shadcn components)
│   │   └── admin/
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   └── types.ts
│   │   ├── utils.ts
│   │   └── validations.ts
│   └── types/
│       └── database.ts
└── .gitignore                    # Incluir .env.local
```

**Environment Variables Setup:**
```bash
# 1. Criar .env.local na raiz do projeto
touch .env.local

# 2. Adicionar ao .gitignore (se não estiver)
echo ".env.local" >> .gitignore
echo ".env*.local" >> .gitignore
```

**Conteúdo do .env.local:**
```bash
# .env.local (NUNCA COMMITAR ESTE ARQUIVO)

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Stripe (usar test keys inicialmente)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

# Google OAuth (configurar na Semana 5)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback

# Next.js
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=seu-secret-super-seguro-aqui
```

**Conteúdo do .env.example:**
```bash
# .env.example (PODE SER COMMITADO - sem valores reais)

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback

# Next.js
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your_nextauth_secret
```

**Configuração Supabase Cloud:**
```bash
# 1. Criar projeto no Supabase
# - Ir em supabase.com
# - Criar novo projeto
# - Escolher região: South America (São Paulo)
# - Aguardar provisionamento (2-3 minutos)

# 2. Configurar .env.local
# - Ir em Settings > API
# - Copiar Project URL e anon key
# - Adicionar ao .env.local

# 3. Configurar autenticação
# - Ir em Authentication > Settings
# - Habilitar email confirmations
# - Configurar email templates (opcional)
```

**Definition of Done:**
- [ ] Projeto Next.js 14 funcionando
- [ ] Projeto Supabase criado na nuvem
- [ ] Environment variables configuradas
- [ ] Conexão Supabase testada
- [ ] shadcn/ui instalado e funcionando
- [ ] Estrutura de pastas criada
- [ ] Deploy inicial na Vercel funcionando

#### **Dia 3-5: Autenticação Platform Admin**
**Tempo estimado**: 24 horas

**Database Setup (Supabase Cloud):**
```sql
-- ⚠️ EXECUTAR DIRETAMENTE NO SUPABASE SQL EDITOR
-- Ir em: supabase.com > Seu Projeto > SQL Editor

-- 1. Criar schema platform_admin
CREATE SCHEMA IF NOT EXISTS platform_admin;

-- 2. Tabela de perfis admin
CREATE TABLE platform_admin.admin_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin',
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. RLS para admin
ALTER TABLE platform_admin.admin_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all profiles" ON platform_admin.admin_profiles
  FOR SELECT USING (auth.email() LIKE '%@focusprint.com');

CREATE POLICY "Admins can insert profiles" ON platform_admin.admin_profiles
  FOR INSERT WITH CHECK (auth.email() LIKE '%@focusprint.com');
```

**Componentes a criar:**
```typescript
// components/admin/auth/login-form.tsx
// components/admin/auth/auth-guard.tsx
// app/(platform-admin)/admin/login/page.tsx
// app/(platform-admin)/admin/layout.tsx
```

**APIs a criar:**
```typescript
// app/api/admin/auth/profile/route.ts
// app/api/admin/auth/verify/route.ts
```

**Definition of Done:**
- [ ] Login restrito a emails @focusprint.com
- [ ] Middleware de autenticação funcionando
- [ ] Perfis admin criados e gerenciados
- [ ] Redirecionamento automático funcionando
- [ ] Session management implementado

### **SEMANA 2: CRUD CLIENTES E LICENCIAMENTO**

#### **Dia 1-3: CRUD de Clientes**
**Tempo estimado**: 24 horas

**Database Setup (Supabase Cloud):**
```sql
-- ⚠️ EXECUTAR DIRETAMENTE NO SUPABASE SQL EDITOR

-- 1. Criar schema client_data
CREATE SCHEMA IF NOT EXISTS client_data;

-- 2. Tabela de clientes
CREATE TABLE client_data.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  plan_type TEXT NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'pro', 'business')),
  max_users INTEGER NOT NULL DEFAULT 5, -- Free: 5, Pro: 15, Business: 50
  max_projects INTEGER NOT NULL DEFAULT 3, -- Free: 3, Pro: 10, Business: 50
  stripe_customer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Perfis de usuários clientes
CREATE TABLE client_data.client_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES client_data.clients(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  google_account_connected BOOLEAN DEFAULT FALSE,
  google_refresh_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. RLS para clientes
ALTER TABLE client_data.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_data.client_profiles ENABLE ROW LEVEL SECURITY;

-- 5. Políticas para admin
CREATE POLICY "Admins can manage all clients" ON client_data.clients
  FOR ALL USING (auth.email() LIKE '%@focusprint.com');

CREATE POLICY "Admins can manage all client profiles" ON client_data.client_profiles
  FOR ALL USING (auth.email() LIKE '%@focusprint.com');
```

**Componentes a criar:**
```typescript
// components/admin/clients/client-list.tsx
// components/admin/clients/client-form.tsx
// components/admin/clients/client-details.tsx
// app/(platform-admin)/admin/clients/page.tsx
// app/(platform-admin)/admin/clients/[id]/page.tsx
```

**APIs a criar:**
```typescript
// app/api/admin/clients/route.ts (GET, POST)
// app/api/admin/clients/[id]/route.ts (GET, PUT, DELETE)
// app/api/admin/clients/[id]/users/route.ts (GET, POST)
```

**Definition of Done:**
- [ ] Listar todos os clientes com paginação
- [ ] Criar novo cliente com validação
- [ ] Editar informações do cliente
- [ ] Visualizar detalhes e usuários do cliente
- [ ] Filtros por status e plano funcionando

#### **Dia 4-5: Sistema de Licenciamento**
**Tempo estimado**: 16 horas

**Database Setup (Supabase Cloud):**
```sql
-- ⚠️ EXECUTAR DIRETAMENTE NO SUPABASE SQL EDITOR

-- 1. Tabela de licenças
CREATE TABLE platform_admin.licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES client_data.clients(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('free', 'pro', 'business')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  max_users INTEGER NOT NULL, -- Free: 5, Pro: 15, Business: 50
  max_projects INTEGER NOT NULL, -- Free: 3, Pro: 10, Business: 50
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. RLS para licenças
ALTER TABLE platform_admin.licenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all licenses" ON platform_admin.licenses
  FOR ALL USING (auth.email() LIKE '%@focusprint.com');
```

**Componentes a criar:**
```typescript
// components/admin/licenses/license-list.tsx
// components/admin/licenses/license-form.tsx
// components/admin/licenses/upgrade-modal.tsx
// app/(platform-admin)/admin/licenses/page.tsx
```

**APIs a criar:**
```typescript
// app/api/admin/licenses/route.ts (GET, POST)
// app/api/admin/licenses/[id]/route.ts (GET, PUT)
// app/api/admin/licenses/upgrade/route.ts (POST)
```

**Limites por Plano (conforme PRD):**
```typescript
const PLAN_LIMITS = {
  free: {
    users: 5,
    projects: 3,
    price: 0
  },
  pro: {
    users: 15,
    projects: 10,
    price: 97 // R$/mês
  },
  business: {
    users: 50,
    projects: 50,
    price: 399 // R$/mês
  }
}
```

**Definition of Done:**
- [ ] Visualizar todas as licenças ativas
- [ ] Criar licença para novo cliente
- [ ] Upgrade/downgrade de planos
- [ ] Validação de limites por plano (Free: 5 users, Pro: 15 users, Business: 50 users)
- [ ] Status de expiração funcionando

---

## 🔥 **FASE 2: INTEGRAÇÃO STRIPE E MÉTRICAS (SEMANA 2.5)**

#### **Dia 1-2: Integração Stripe**
**Tempo estimado**: 16 horas

**Adicionar ao .env.local:**
```bash
# Adicionar estas linhas ao arquivo .env.local existente

# Stripe (usar test keys inicialmente)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**Componentes a criar:**
```typescript
// components/admin/stripe/payment-setup.tsx
// components/admin/stripe/subscription-status.tsx
// lib/stripe/client.ts
// lib/stripe/server.ts
```

**APIs a criar:**
```typescript
// app/api/admin/stripe/customers/route.ts
// app/api/admin/stripe/subscriptions/route.ts
// app/api/admin/stripe/webhooks/route.ts
```

**Definition of Done:**
- [ ] Criar customer no Stripe para novos clientes
- [ ] Webhook de pagamento funcionando
- [ ] Status de subscription sincronizado
- [ ] Upgrade/downgrade via Stripe funcionando

#### **Dia 3: Dashboard de Métricas**
**Tempo estimado**: 8 horas

**Componentes a criar:**
```typescript
// components/admin/dashboard/metrics-overview.tsx
// components/admin/dashboard/revenue-chart.tsx
// components/admin/dashboard/client-stats.tsx
// app/(platform-admin)/admin/page.tsx (dashboard)
```

**APIs a criar:**
```typescript
// app/api/admin/metrics/overview/route.ts
// app/api/admin/metrics/revenue/route.ts
```

**Definition of Done:**
- [ ] Total de clientes ativos/inativos
- [ ] MRR (Monthly Recurring Revenue)
- [ ] Novos clientes por mês
- [ ] Churn rate básico
- [ ] Gráficos funcionando

---

## 🎯 **FASE 3: CLIENT DASHBOARD (SEMANAS 3-4)**

### **SEMANA 3: AUTENTICAÇÃO E ESTRUTURA BASE**

#### **Dia 1-2: Autenticação de Clientes**
**Tempo estimado**: 16 horas

**Database Setup (Supabase Cloud):**
```sql
-- ⚠️ EXECUTAR DIRETAMENTE NO SUPABASE SQL EDITOR

-- 1. Times
CREATE TABLE client_data.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES client_data.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  leader_id UUID REFERENCES client_data.client_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Membros de times
CREATE TABLE client_data.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES client_data.teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES client_data.client_profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- 3. RLS para client dashboard
ALTER TABLE client_data.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_data.team_members ENABLE ROW LEVEL SECURITY;

-- 4. Políticas para clientes
CREATE POLICY "Users can view their client teams" ON client_data.teams
  FOR SELECT USING (
    client_id IN (
      SELECT client_id FROM client_data.client_profiles
      WHERE user_id = auth.uid()
    )
  );
```

**Componentes a criar:**
```typescript
// components/client/auth/login-form.tsx
// components/client/auth/register-form.tsx
// components/client/auth/client-guard.tsx
// app/(client-dashboard)/dashboard/layout.tsx
// app/(client-dashboard)/auth/login/page.tsx
// app/(client-dashboard)/auth/register/page.tsx
```

**Definition of Done:**
- [ ] Login/registro para clientes funcionando
- [ ] Google OAuth opcional configurado
- [ ] Middleware de autenticação client
- [ ] Redirecionamento baseado em role
- [ ] Session management para clientes

#### **Dia 3-5: CRUD Times e Projetos**
**Tempo estimado**: 24 horas

**Database Setup (Supabase Cloud):**
```sql
-- ⚠️ EXECUTAR DIRETAMENTE NO SUPABASE SQL EDITOR

-- 1. Projetos
CREATE TABLE client_data.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES client_data.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'completed')),
  created_by UUID REFERENCES client_data.client_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Colunas do Kanban (criar colunas padrão automaticamente)
CREATE TABLE client_data.columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES client_data.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL,
  color TEXT DEFAULT '#6B7280',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. RLS
ALTER TABLE client_data.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_data.columns ENABLE ROW LEVEL SECURITY;
```

**Componentes a criar:**
```typescript
// components/client/teams/team-list.tsx
// components/client/teams/team-form.tsx
// components/client/projects/project-list.tsx
// components/client/projects/project-form.tsx
// app/(client-dashboard)/dashboard/teams/page.tsx
// app/(client-dashboard)/dashboard/projects/page.tsx
```

**Definition of Done:**
- [ ] CRUD completo de times
- [ ] CRUD completo de projetos
- [ ] Associação time-projeto funcionando
- [ ] Permissões por role implementadas
- [ ] Validação de limites por plano
- [ ] Colunas padrão criadas automaticamente para novos projetos

### **SEMANA 4: INTERFACE KANBAN + CHAT (70/30)**

#### **Dia 1-3: Kanban Board (70%)**
**Tempo estimado**: 24 horas

**Database Setup (Supabase Cloud):**
```sql
-- ⚠️ EXECUTAR DIRETAMENTE NO SUPABASE SQL EDITOR

-- 1. Tarefas
CREATE TABLE client_data.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES client_data.projects(id) ON DELETE CASCADE,
  column_id UUID REFERENCES client_data.columns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_to UUID REFERENCES client_data.client_profiles(id),
  created_by UUID REFERENCES client_data.client_profiles(id),
  due_date TIMESTAMP WITH TIME ZONE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.1. Checklists de tarefas
CREATE TABLE client_data.task_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES client_data.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.2. Anexos de tarefas
CREATE TABLE client_data.task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES client_data.tasks(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  uploaded_by UUID REFERENCES client_data.client_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. RLS para tarefas e relacionadas
ALTER TABLE client_data.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_data.task_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_data.task_attachments ENABLE ROW LEVEL SECURITY;

-- 3. Políticas para tarefas
CREATE POLICY "Users can manage project tasks" ON client_data.tasks
  FOR ALL USING (
    project_id IN (
      SELECT p.id FROM client_data.projects p
      JOIN client_data.teams t ON p.team_id = t.id
      JOIN client_data.team_members tm ON t.id = tm.team_id
      JOIN client_data.client_profiles cp ON tm.user_id = cp.id
      WHERE cp.user_id = auth.uid()
    )
  );

-- 3.1. Políticas para checklists
CREATE POLICY "Users can manage task checklists" ON client_data.task_checklists
  FOR ALL USING (
    task_id IN (
      SELECT t.id FROM client_data.tasks t
      JOIN client_data.projects p ON t.project_id = p.id
      JOIN client_data.teams tm ON p.team_id = tm.id
      JOIN client_data.team_members tmm ON tm.id = tmm.team_id
      JOIN client_data.client_profiles cp ON tmm.user_id = cp.id
      WHERE cp.user_id = auth.uid()
    )
  );

-- 3.2. Políticas para anexos
CREATE POLICY "Users can manage task attachments" ON client_data.task_attachments
  FOR ALL USING (
    task_id IN (
      SELECT t.id FROM client_data.tasks t
      JOIN client_data.projects p ON t.project_id = p.id
      JOIN client_data.teams tm ON p.team_id = tm.id
      JOIN client_data.team_members tmm ON tm.id = tmm.team_id
      JOIN client_data.client_profiles cp ON tmm.user_id = cp.id
      WHERE cp.user_id = auth.uid()
    )
  );
```

**Dependências:**
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Componentes a criar:**
```typescript
// components/client/kanban/kanban-board.tsx
// components/client/kanban/kanban-column.tsx
// components/client/kanban/task-card.tsx
// components/client/kanban/task-form.tsx
// components/client/kanban/drag-overlay.tsx
```

**APIs a criar:**
```typescript
// app/api/projects/[id]/tasks/route.ts (GET, POST)
// app/api/tasks/[id]/route.ts (GET, PUT, DELETE)
// app/api/tasks/[id]/move/route.ts (PUT)
```

**Definition of Done:**
- [ ] Visualização de colunas e tarefas
- [ ] Drag & drop entre colunas funcionando
- [ ] CRUD de tarefas completo
- [ ] Checklists dentro de tarefas funcionando
- [ ] Upload de anexos (5MB limit, bucket 'focusprint')
- [ ] Filtros por assignee e prioridade
- [ ] Interface responsiva (70% da tela)
- [ ] Sidebar colapsível com ícones

#### **Dia 4-5: Chat em Tempo Real (30%)**
**Tempo estimado**: 16 horas

**Database Setup (Supabase Cloud):**
```sql
-- ⚠️ EXECUTAR DIRETAMENTE NO SUPABASE SQL EDITOR

-- 1. Mensagens do chat
CREATE TABLE client_data.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES client_data.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES client_data.client_profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'meet_link', 'file', 'task_reference')),
  meet_link TEXT,
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  mentioned_users UUID[],
  referenced_task_id UUID REFERENCES client_data.tasks(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. RLS para mensagens
ALTER TABLE client_data.messages ENABLE ROW LEVEL SECURITY;

-- 3. Políticas para mensagens
CREATE POLICY "Users can view project messages" ON client_data.messages
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM client_data.projects p
      JOIN client_data.teams t ON p.team_id = t.id
      JOIN client_data.team_members tm ON t.id = tm.team_id
      JOIN client_data.client_profiles cp ON tm.user_id = cp.id
      WHERE cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert project messages" ON client_data.messages
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT p.id FROM client_data.projects p
      JOIN client_data.teams t ON p.team_id = t.id
      JOIN client_data.team_members tm ON t.id = tm.team_id
      JOIN client_data.client_profiles cp ON tm.user_id = cp.id
      WHERE cp.user_id = auth.uid()
    )
  );
```

**Componentes a criar:**
```typescript
// components/client/chat/chat-container.tsx
// components/client/chat/message-list.tsx
// components/client/chat/message-input.tsx
// components/client/chat/message-item.tsx
// components/client/chat/google-meet-button.tsx
```

**APIs a criar:**
```typescript
// app/api/projects/[id]/messages/route.ts (GET, POST)
// app/api/projects/[id]/meet/route.ts (POST)
// app/api/auth/google/status/route.ts (GET)
```

**Definition of Done:**
- [ ] Chat em tempo real funcionando
- [ ] Envio/recebimento de mensagens
- [ ] Referências a tarefas (#123)
- [ ] Menções de usuários (@user)
- [ ] Upload de arquivos/imagens (5MB limit)
- [ ] Google Meet button (condicional)
- [ ] Interface responsiva (30% da tela)

---

## 🎯 **FASE 4: FUNCIONALIDADES COMPLEMENTARES (SEMANA 4.5)**

### **Dia 1-2: Página "Minha Semana" e RouteGuard**
**Tempo estimado**: 16 horas

**Componentes a criar:**
```typescript
// components/client/auth/route-guard.tsx
// components/client/my-week/week-view.tsx
// components/client/my-week/day-column.tsx
// components/client/my-week/task-summary.tsx
// app/(client-dashboard)/dashboard/my-week/page.tsx
```

**APIs a criar:**
```typescript
// app/api/my-week/tasks/route.ts (GET)
// app/api/tasks/[id]/complete/route.ts (PUT)
```

**Definition of Done:**
- [ ] RouteGuard protegendo rotas autenticadas
- [ ] Página "Minha Semana" com tarefas por dia
- [ ] Filtro por usuário responsável
- [ ] Visualização de tarefas vencendo
- [ ] Indicadores de progresso semanal

### **Dia 3: Indicadores Pro/Business e UI Polish**
**Tempo estimado**: 8 horas

**Componentes a criar:**
```typescript
// components/ui/pro-badge.tsx
// components/ui/business-badge.tsx
// components/client/layout/collapsible-sidebar.tsx
```

**Definition of Done:**
- [ ] Badges Pro/Business em áreas estratégicas
- [ ] Sidebar colapsível funcionando
- [ ] Indicadores visuais de upgrade
- [ ] Tooltips explicativos sobre benefícios

---

## 🚀 **FASE 5: INTEGRAÇÃO E POLISH (SEMANAS 5-6)**

### **SEMANA 5: GOOGLE MEET E TEMPO REAL**

#### **Dia 1-3: Google Meet Integration**
**Tempo estimado**: 24 horas

**Adicionar ao .env.local:**
```bash
# Adicionar estas linhas ao arquivo .env.local existente

# Google OAuth (configurar credenciais no Google Cloud Console)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback
```

**Dependências:**
```bash
npm install googleapis
```

**Componentes a criar:**
```typescript
// lib/google/auth.ts
// lib/google/calendar.ts
// components/client/auth/google-connect.tsx
```

**APIs a criar:**
```typescript
// app/api/auth/google/connect/route.ts
// app/api/auth/google/callback/route.ts
```

**Definition of Done:**
- [ ] OAuth Google funcionando
- [ ] Criação de Meet links automática
- [ ] Links compartilhados no chat
- [ ] Botão condicional baseado em auth
- [ ] Fallback para usuários sem Google

#### **Dia 4-5: Realtime e Sincronização**
**Tempo estimado**: 16 horas

**Configuração Supabase Realtime:**
```typescript
// lib/supabase/realtime.ts
// hooks/use-realtime-messages.ts
// hooks/use-realtime-tasks.ts
```

**Definition of Done:**
- [ ] Mensagens aparecem em tempo real
- [ ] Mudanças no Kanban sincronizam
- [ ] Múltiplos usuários simultâneos
- [ ] Indicadores de typing
- [ ] Presença de usuários online

### **SEMANA 6: TESTES E DEPLOY**

#### **Dia 1-3: Testes e Validação**
**Tempo estimado**: 24 horas

**Testes a implementar:**
```typescript
// __tests__/admin/clients.test.ts
// __tests__/client/kanban.test.ts
// __tests__/client/chat.test.ts
// __tests__/integration/auth.test.ts
```

**Definition of Done:**
- [ ] Testes unitários principais
- [ ] Testes de integração críticos
- [ ] Validação de permissões
- [ ] Performance testing básico
- [ ] Error handling robusto

#### **Dia 4-5: Deploy e Go-Live**
**Tempo estimado**: 16 horas

**Configuração de Produção:**
```bash
# Vercel deployment
vercel --prod

# Copiar environment variables do .env.local para Vercel
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add STRIPE_SECRET_KEY production
vercel env add STRIPE_PUBLISHABLE_KEY production
vercel env add STRIPE_WEBHOOK_SECRET production
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
vercel env add GOOGLE_CLIENT_ID production
vercel env add GOOGLE_CLIENT_SECRET production
vercel env add GOOGLE_REDIRECT_URI production
vercel env add NEXTAUTH_URL production
vercel env add NEXTAUTH_SECRET production
```

**Definition of Done:**
- [ ] Deploy produção funcionando
- [ ] DNS configurado (admin/app.focusprint.com)
- [ ] SSL certificado ativo
- [ ] Monitoring básico configurado
- [ ] Backup automático ativo

---

## 📋 **CHECKLIST FINAL DE VALIDAÇÃO**

### **Platform Admin:**
- [ ] Login restrito @focusprint.com
- [ ] CRUD completo de clientes
- [ ] Sistema de licenciamento
- [ ] Integração Stripe funcionando
- [ ] Dashboard de métricas básicas

### **Client Dashboard:**
- [ ] Autenticação de clientes
- [ ] RouteGuard protegendo rotas autenticadas
- [ ] CRUD times e projetos
- [ ] Interface Kanban (70%) funcionando
- [ ] Checklists dentro de tarefas
- [ ] Upload de anexos (5MB limit, bucket 'focusprint')
- [ ] Chat em tempo real (30%) funcionando
- [ ] Menções de usuários (@user) no chat
- [ ] Referências a tarefas (#123) no chat
- [ ] Upload de arquivos/imagens no chat
- [ ] Página "Minha Semana" com tarefas por dia
- [ ] Sidebar colapsível com ícones
- [ ] Indicadores Pro/Business na UI
- [ ] Google Meet integration opcional
- [ ] Sincronização em tempo real

### **Qualidade:**
- [ ] Responsivo em mobile/tablet/desktop
- [ ] Performance < 3 segundos
- [ ] Error handling adequado
- [ ] Validação de formulários
- [ ] Testes principais passando

### **Deploy:**
- [ ] Produção na Vercel funcionando
- [ ] Domínios configurados
- [ ] SSL ativo
- [ ] Monitoring básico
- [ ] Backup automático

---

## 🎯 **DEPENDÊNCIAS CRÍTICAS**

### **🚨 POR QUE PLATFORM ADMIN DEVE VIR PRIMEIRO: ANÁLISE TÉCNICA**

#### **1. 🔐 Dependências de Autenticação Críticas**
```typescript
// ❌ Client Dashboard FALHA sem Platform Admin porque:

// 1. User-Client Association é obrigatória
async function authenticateClientUser(userId: string) {
  const { data: profile } = await supabase
    .from('client_profiles') // ❌ VAZIA sem Platform Admin
    .select('client_id, role')
    .eq('user_id', userId)
    .single(); // ❌ SEMPRE RETORNA NULL

  if (!profile) {
    throw new Error('User not associated with any client'); // ❌ SEMPRE FALHA
  }
}

// 2. RLS Policies dependem de client_profiles
CREATE POLICY "Users can view their client teams" ON client_data.teams
  FOR SELECT USING (
    client_id IN (
      SELECT client_id FROM client_data.client_profiles -- ❌ TABELA VAZIA
      WHERE user_id = auth.uid()
    )
  ); // ❌ POLICY SEMPRE BLOQUEIA ACESSO

// 3. License Validation é prerequisito
async function validateUserLicense(userId: string) {
  const clientProfile = await getClientProfile(userId); // ❌ FALHA
  const license = await getLicense(clientProfile.client_id); // ❌ FALHA

  if (license.plan_type === 'free' && userCount > 3) {
    throw new Error('Free plan limit exceeded'); // ❌ NUNCA EXECUTADO
  }
}
```

#### **2. 🛡️ RLS Policies Quebram Sem Platform Admin**
```sql
-- ❌ TODAS estas functions FALHAM sem client_profiles
CREATE OR REPLACE FUNCTION current_user_client_id()
RETURNS UUID AS $$
DECLARE
  client_uuid UUID;
BEGIN
  SELECT cp.client_id INTO client_uuid
  FROM client_data.client_profiles cp -- ❌ TABELA VAZIA
  WHERE cp.user_id = auth.uid();

  IF client_uuid IS NULL THEN
    RAISE EXCEPTION 'User does not belong to any active client'; -- ❌ SEMPRE FALHA
  END IF;

  RETURN client_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ❌ Middleware de autorização FALHA
export async function clientDashboardMiddleware(req: NextRequest) {
  const user = await getUser(req); // ✅ Supabase Auth funciona

  const hasLicense = await hasActiveClientLicense(user.id); // ❌ FALHA
  if (!hasLicense) {
    return NextResponse.redirect('/unauthorized'); // ❌ SEMPRE REDIRECIONA
  }

  return NextResponse.next(); // ❌ NUNCA EXECUTADO
}
```

#### **3. 📊 Dependências de Dados Fundamentais**
```sql
-- ❌ Ordem OBRIGATÓRIA de criação:
-- 1. clients (DEVE existir primeiro)
CREATE TABLE client_data.clients (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL
);

-- 2. client_profiles (DEPENDE de clients)
CREATE TABLE client_data.client_profiles (
  user_id UUID REFERENCES auth.users(id),
  client_id UUID REFERENCES client_data.clients(id), -- ❌ FALHA sem clients
  role TEXT NOT NULL
);

-- 3. teams (DEPENDE de clients)
CREATE TABLE client_data.teams (
  client_id UUID REFERENCES client_data.clients(id) -- ❌ FALHA sem clients
);

-- 4. projects (DEPENDE de teams)
CREATE TABLE client_data.projects (
  team_id UUID REFERENCES client_data.teams(id) -- ❌ FALHA sem teams
);
```

### **🚫 PROIBIÇÃO ABSOLUTA DE MOCK DATA**

#### **❌ POR QUE MOCK DATA FALHA COMPLETAMENTE:**

**1. 🔐 Supabase Auth Integration:**
```typescript
// ❌ Mock data NÃO PODE simular isso
const { data: user } = await supabase.auth.getUser();
// user.id é UUID real do Supabase Auth
// Mock data não pode gerar UUIDs compatíveis com auth.users
```

**2. 🛡️ RLS Policy Enforcement:**
```sql
-- ❌ RLS policies NÃO FUNCIONAM com mock data
CREATE POLICY "test" ON client_data.teams
  FOR SELECT USING (auth.uid() = user_id); -- auth.uid() é função Supabase real
```

**3. 🔗 Foreign Key Constraints:**
```sql
-- ❌ Mock data NÃO PODE satisfazer constraints reais
CREATE TABLE client_data.client_profiles (
  user_id UUID REFERENCES auth.users(id), -- ✅ DEVE ser UUID real do Supabase Auth
  client_id UUID REFERENCES client_data.clients(id) -- ✅ DEVE ser UUID real da tabela
);
```

**4. ⚡ Real-time Subscriptions:**
```typescript
// ❌ Mock data NÃO PODE testar real-time
const subscription = supabase
  .channel('projects')
  .on('postgres_changes',
    { event: '*', schema: 'client_data', table: 'projects' },
    (payload) => console.log(payload) // ✅ SÓ funciona com dados reais
  )
  .subscribe();
```

### **✅ ESTRATÉGIA OBRIGATÓRIA: DADOS REAIS DESDE O INÍCIO**

```typescript
// ✅ WORKFLOW CORRETO:
const DEVELOPMENT_STRATEGY = {
  week_1_2: {
    focus: "Platform Admin com dados reais",
    actions: [
      "Criar tabelas reais no Supabase Cloud",
      "Inserir clientes reais via interface admin",
      "Testar autenticação admin com dados reais",
      "Validar RLS policies com usuários reais"
    ]
  },

  week_3_4: {
    focus: "Client Dashboard com dados reais existentes",
    actions: [
      "Registrar usuários reais via Client Dashboard",
      "Associar usuários a clientes reais via Platform Admin",
      "Testar RLS policies com relacionamentos reais",
      "Desenvolver features com dados reais"
    ]
  }
};
```

### **Ordem de Implementação:**
1. **Platform Admin primeiro** (base para tudo)
2. **Client Dashboard** (depende de clientes criados)
3. **Kanban + Chat** (core value proposition)
4. **Google Meet** (diferencial competitivo)
5. **Polish e Deploy** (go-to-market)

### **🚨 CONSEQUÊNCIAS DE NÃO SEGUIR A SEQUÊNCIA:**

#### **❌ Se tentar Client Dashboard primeiro:**
```typescript
// ❌ RESULTADO: Sistema completamente quebrado
const BROKEN_SYSTEM = {
  authentication: "Usuários não conseguem fazer login",
  authorization: "RLS policies bloqueiam todo acesso",
  middleware: "Redirecionamento infinito para /unauthorized",
  features: "Kanban e Chat não funcionam",
  realtime: "Subscriptions falham",
  development: "Impossível testar funcionalidades"
};

// ❌ TEMPO PERDIDO: 2-3 semanas refatorando
const TIME_WASTED = {
  week_1: "Desenvolver Client Dashboard que não funciona",
  week_2: "Debuggar problemas de autenticação sem solução",
  week_3: "Refatorar tudo após criar Platform Admin",
  total_waste: "2-3 semanas de desenvolvimento perdidas"
};
```

#### **❌ Se usar mock data:**
```typescript
// ❌ RESULTADO: Falsa sensação de progresso
const MOCK_DATA_PROBLEMS = {
  week_1_2: "Desenvolvimento aparenta funcionar",
  week_3: "Integração com dados reais falha completamente",
  week_4: "Descoberta de que RLS policies não funcionam",
  week_5: "Refatoração completa necessária",
  total_impact: "Projeto atrasado em 3-4 semanas"
};
```

### **✅ BENEFÍCIOS DE SEGUIR A SEQUÊNCIA CORRETA:**

```typescript
const CORRECT_SEQUENCE_BENEFITS = {
  week_1: "Platform Admin funciona com dados reais",
  week_2: "Base sólida para Client Dashboard",
  week_3: "Client Dashboard funciona imediatamente",
  week_4: "Features desenvolvidas sem problemas",
  week_5: "Integração e polish sem surpresas",
  result: "MVP entregue no prazo com qualidade"
};
```

### **Bloqueadores Potenciais:**
- **Supabase RLS**: Configurar corretamente desde o início
- **Google OAuth**: Configurar credenciais antes da Semana 5
- **Stripe Webhooks**: Testar em ambiente local primeiro
- **Realtime**: Configurar subscriptions Supabase corretamente

### **Critérios de Sucesso:**
- **Semana 2**: Platform Admin 100% funcional
- **Semana 4**: Client Dashboard com Kanban + Chat
- **Semana 4.5**: Funcionalidades complementares (Minha Semana, RouteGuard, UI Polish)
- **Semana 6**: MVP completo em produção
- **Go-live**: Todos os checklists validados

**Total estimado**: 5-7 semanas (200-280 horas de desenvolvimento)

### **📋 VALIDAÇÃO DE CONSISTÊNCIA COM PRD**

**✅ RESOLUÇÕES IMPLEMENTADAS:**

1. **💰 Limites de Usuários Alinhados:**
   - Free: 5 usuários, 3 projetos ✅
   - Pro: 15 usuários, 10 projetos ✅
   - Business: 50 usuários, 50 projetos ✅

2. **🗄️ Estrutura de Database Normalizada:**
   - `task_checklists` tabela separada ✅
   - `task_attachments` tabela separada ✅
   - `mentioned_users UUID[]` para menções ✅
   - `referenced_task_id UUID` para referências ✅

3. **🔐 Google OAuth Opcional:**
   - `google_account_connected BOOLEAN` ✅
   - `google_refresh_token TEXT` ✅
   - Funcionalidade opcional documentada ✅

4. **⏱️ Timeline Conservador:**
   - 5-7 semanas (200-280 horas) ✅
   - Estimativas realistas baseadas em complexidade ✅

5. **📚 Documentação Técnica Detalhada:**
   - Scripts SQL prontos para execução ✅
   - Componentes e APIs especificados ✅
   - Definition of Done para cada fase ✅
   - Environment variables documentadas ✅

---

## 🚨 **REGRAS OBRIGATÓRIAS DE DESENVOLVIMENTO**

### **✅ OBRIGATÓRIO (DEVE FAZER):**

1. **📊 Dados Reais Desde o Início:**
   - ✅ Criar projeto Supabase Cloud real no Dia 1
   - ✅ Executar SQL scripts diretamente no SQL Editor
   - ✅ Inserir dados reais via Platform Admin
   - ✅ Testar com usuários reais do Supabase Auth
   - ✅ Validar RLS policies com relacionamentos reais

2. **🔄 Sequência Platform Admin → Client Dashboard:**
   - ✅ Semana 1-2: Platform Admin completo
   - ✅ Semana 3-4: Client Dashboard usando dados do Platform Admin
   - ✅ Criar tabelas pai antes das filhas
   - ✅ Validar foreign keys antes de prosseguir

3. **🔐 Autenticação e Autorização:**
   - ✅ Configurar RLS policies desde o início
   - ✅ Testar middleware com dados reais
   - ✅ Validar user-client associations
   - ✅ Implementar license validation

### **❌ PROIBIDO (NÃO DEVE FAZER):**

1. **🚫 Mock Data em Qualquer Fase:**
   - ❌ NUNCA usar dados simulados ou placeholder
   - ❌ NUNCA usar objetos mock para clientes/usuários
   - ❌ NUNCA simular respostas de API
   - ❌ NUNCA usar UUIDs fake ou hardcoded

2. **🚫 Sequência Incorreta:**
   - ❌ NUNCA começar pelo Client Dashboard
   - ❌ NUNCA desenvolver features sem Platform Admin
   - ❌ NUNCA criar tabelas filhas antes das pai
   - ❌ NUNCA pular validação de dependências

3. **🚫 Atalhos Perigosos:**
   - ❌ NUNCA desabilitar RLS "temporariamente"
   - ❌ NUNCA usar service key no frontend
   - ❌ NUNCA pular testes de autenticação
   - ❌ NUNCA assumir que "vai funcionar depois"

### **⚠️ AVISOS CRÍTICOS:**

```typescript
// ⚠️ SE VOCÊ ESTÁ PENSANDO EM:
const DANGEROUS_IDEAS = {
  "Vou usar mock data só no início": "❌ NUNCA - RLS não funciona",
  "Vou fazer Client Dashboard primeiro": "❌ NUNCA - Autenticação quebra",
  "Vou desabilitar RLS temporariamente": "❌ NUNCA - Segurança comprometida",
  "Vou usar dados fake para testar": "❌ NUNCA - Supabase Auth não funciona",
  "Vou implementar auth depois": "❌ NUNCA - Refatoração massiva necessária"
};

// ✅ LEMBRE-SE:
const GOLDEN_RULES = {
  rule_1: "Platform Admin SEMPRE primeiro",
  rule_2: "Dados reais SEMPRE desde o início",
  rule_3: "RLS policies SEMPRE ativas",
  rule_4: "Supabase Auth SEMPRE real",
  rule_5: "Foreign keys SEMPRE respeitadas"
};
```

### **📋 CHECKLIST DE VALIDAÇÃO ANTES DE PROSSEGUIR:**

**Antes de iniciar Client Dashboard (Semana 3):**
- [ ] Platform Admin funcionando 100%
- [ ] Tabela `clients` criada e populada
- [ ] Tabela `client_profiles` criada
- [ ] Tabela `licenses` criada e funcionando
- [ ] RLS policies testadas com usuários reais
- [ ] Middleware de autenticação admin funcionando
- [ ] Pelo menos 1 cliente real criado via Platform Admin
- [ ] Pelo menos 1 usuário real associado a cliente

**Antes de cada nova feature:**
- [ ] Dependências de dados satisfeitas
- [ ] RLS policies configuradas
- [ ] Foreign keys validadas
- [ ] Testes com dados reais passando

---

## 🗄️ **WORKFLOW SUPABASE CLOUD**

### **📋 Processo de Database Setup:**

#### **1. 🌐 Sempre na Nuvem:**
```bash
# ❌ NÃO fazemos isso (sem migrações locais)
supabase init
supabase start
supabase db reset

# ✅ Fazemos isso (direto na nuvem)
# 1. Criar projeto em supabase.com
# 2. Executar SQL no SQL Editor
# 3. Testar no Table Editor
# 4. Conectar aplicação via environment variables
```

#### **2. 📝 Executar SQL Scripts:**
```bash
# Workflow para cada nova tabela:
# 1. Ir em supabase.com > Seu Projeto > SQL Editor
# 2. Copiar SQL do documento implementation-sequence.md
# 3. Executar script
# 4. Verificar em Table Editor se tabela foi criada
# 5. Testar RLS policies em Authentication > Users
```

#### **3. 🔍 Validar Criação:**
```bash
# Após executar cada script SQL:
# 1. Ir em Table Editor
# 2. Verificar se tabela aparece
# 3. Verificar se colunas estão corretas
# 4. Verificar se RLS está habilitado (ícone de escudo)
# 5. Testar inserção manual de dados
```

### **📊 Ordem de Criação das Tabelas:**

#### **Semana 1 (Platform Admin):**
```sql
-- 1. Schema platform_admin
CREATE SCHEMA IF NOT EXISTS platform_admin;

-- 2. admin_profiles (depende de auth.users)
CREATE TABLE platform_admin.admin_profiles (...);
```

#### **Semana 2 (Clientes e Licenças):**
```sql
-- 3. Schema client_data
CREATE SCHEMA IF NOT EXISTS client_data;

-- 4. clients (independente)
CREATE TABLE client_data.clients (...);

-- 5. client_profiles (depende de clients)
CREATE TABLE client_data.client_profiles (...);

-- 6. licenses (depende de clients)
CREATE TABLE platform_admin.licenses (...);
```

#### **Semana 3 (Times e Projetos):**
```sql
-- 7. teams (depende de clients)
CREATE TABLE client_data.teams (...);

-- 8. team_members (depende de teams e client_profiles)
CREATE TABLE client_data.team_members (...);

-- 9. projects (depende de teams)
CREATE TABLE client_data.projects (...);

-- 10. columns (depende de projects)
CREATE TABLE client_data.columns (...);
```

#### **Semana 4 (Kanban e Chat):**
```sql
-- 11. tasks (depende de projects, columns, client_profiles)
CREATE TABLE client_data.tasks (...);

-- 12. task_checklists (depende de tasks)
CREATE TABLE client_data.task_checklists (...);

-- 13. task_attachments (depende de tasks, client_profiles)
CREATE TABLE client_data.task_attachments (...);

-- 14. messages (depende de projects, client_profiles)
CREATE TABLE client_data.messages (...);
```

### **⚠️ Pontos de Atenção:**

#### **Dependências de Tabelas:**
- **Sempre criar tabelas pai antes das filhas**
- **Verificar foreign keys antes de executar**
- **Não executar scripts fora de ordem**

#### **RLS Policies:**
- **Testar policies com usuários reais**
- **Verificar se auth.uid() funciona corretamente**
- **Ajustar policies se dados não aparecem**

#### **Backup e Segurança:**
- **Supabase faz backup automático**
- **Não precisamos configurar backup manual**
- **Dados ficam seguros na nuvem**

---

## �️ **WORKFLOW SUPABASE CLOUD**

### **📋 Processo de Database Setup:**

#### **1. 🌐 Sempre na Nuvem:**
```bash
# ❌ NÃO fazemos isso (sem migrações locais)
supabase init
supabase start
supabase db reset

# ✅ Fazemos isso (direto na nuvem)
# 1. Criar projeto em supabase.com
# 2. Executar SQL no SQL Editor
# 3. Testar no Table Editor
# 4. Conectar aplicação via environment variables
```

#### **2. 📝 Executar SQL Scripts:**
```bash
# Workflow para cada nova tabela:
# 1. Ir em supabase.com > Seu Projeto > SQL Editor
# 2. Copiar SQL do documento implementation-sequence.md
# 3. Executar script
# 4. Verificar em Table Editor se tabela foi criada
# 5. Testar RLS policies em Authentication > Users
```

#### **3. 🔍 Validar Criação:**
```bash
# Após executar cada script SQL:
# 1. Ir em Table Editor
# 2. Verificar se tabela aparece
# 3. Verificar se colunas estão corretas
# 4. Verificar se RLS está habilitado (ícone de escudo)
# 5. Testar inserção manual de dados
```

#### **4. 🔐 Configurar RLS:**
```bash
# Para cada tabela:
# 1. Verificar se RLS está habilitado
# 2. Verificar se policies foram criadas
# 3. Testar com usuário real
# 4. Ajustar policies se necessário
```

### **📊 Ordem de Criação das Tabelas:**

#### **Semana 1 (Platform Admin):**
```sql
-- 1. Schema platform_admin
CREATE SCHEMA IF NOT EXISTS platform_admin;

-- 2. admin_profiles (depende de auth.users)
CREATE TABLE platform_admin.admin_profiles (...);
```

#### **Semana 2 (Clientes e Licenças):**
```sql
-- 3. Schema client_data
CREATE SCHEMA IF NOT EXISTS client_data;

-- 4. clients (independente)
CREATE TABLE client_data.clients (...);

-- 5. client_profiles (depende de clients)
CREATE TABLE client_data.client_profiles (...);

-- 6. licenses (depende de clients)
CREATE TABLE platform_admin.licenses (...);
```

#### **Semana 3 (Times e Projetos):**
```sql
-- 7. teams (depende de clients)
CREATE TABLE client_data.teams (...);

-- 8. team_members (depende de teams e client_profiles)
CREATE TABLE client_data.team_members (...);

-- 9. projects (depende de teams)
CREATE TABLE client_data.projects (...);

-- 10. columns (depende de projects)
CREATE TABLE client_data.columns (...);
```

#### **Semana 4 (Kanban e Chat):**
```sql
-- 11. tasks (depende de projects, columns, client_profiles)
CREATE TABLE client_data.tasks (...);

-- 12. messages (depende de projects, client_profiles)
CREATE TABLE client_data.messages (...);
```

### **⚠️ Pontos de Atenção:**

#### **Dependências de Tabelas:**
- **Sempre criar tabelas pai antes das filhas**
- **Verificar foreign keys antes de executar**
- **Não executar scripts fora de ordem**

#### **RLS Policies:**
- **Testar policies com usuários reais**
- **Verificar se auth.uid() funciona corretamente**
- **Ajustar policies se dados não aparecem**

#### **Backup e Segurança:**
- **Supabase faz backup automático**
- **Não precisamos configurar backup manual**
- **Dados ficam seguros na nuvem**

#### **Performance:**
- **Supabase otimiza queries automaticamente**
- **Não precisamos configurar índices inicialmente**
- **Monitorar performance via dashboard Supabase**

---

## �🔐 **SEGURANÇA DAS ENVIRONMENT VARIABLES**

### **⚠️ REGRAS CRÍTICAS DE SEGURANÇA:**

#### **NUNCA COMMITAR:**
```bash
# Arquivos que NUNCA devem ir para o Git
.env.local
.env.development.local
.env.test.local
.env.production.local
```

#### **PODE COMMITAR:**
```bash
# Arquivos seguros para commitar
.env.example          # Template sem valores reais
.env.development      # Apenas configs públicas
```

### **📋 Checklist de Segurança:**

#### **Desenvolvimento Local:**
- [ ] `.env.local` criado na raiz do projeto
- [ ] `.env.local` adicionado ao `.gitignore`
- [ ] `.env.example` criado como template
- [ ] Chaves de teste (não produção) no `.env.local`
- [ ] Verificar que `.env.local` não aparece no `git status`

#### **Deploy Produção:**
- [ ] Environment variables configuradas no Vercel
- [ ] Chaves de produção (não teste) no Vercel
- [ ] URLs de produção configuradas
- [ ] Webhook URLs atualizadas para produção
- [ ] Verificar que nenhuma chave aparece no código

### **🔧 Como Configurar Cada Serviço:**

#### **1. Supabase:**
```bash
# 1. Criar projeto em supabase.com
# 2. Ir em Settings > API
# 3. Copiar URL e chaves para .env.local
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### **2. Stripe:**
```bash
# 1. Criar conta em stripe.com
# 2. Ir em Developers > API keys
# 3. Usar TEST keys inicialmente
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# 4. Configurar webhook em Developers > Webhooks
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### **3. Google OAuth:**
```bash
# 1. Ir em console.cloud.google.com
# 2. Criar projeto ou selecionar existente
# 3. Ativar Google Calendar API
# 4. Criar credenciais OAuth 2.0
# 5. Adicionar redirect URI: http://localhost:3001/api/auth/google/callback
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback
```

#### **4. Next.js:**
```bash
# Gerar secret seguro
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=http://localhost:3001
```

### **🚨 Troubleshooting Comum:**

#### **Erro: "Environment variable not found"**
```bash
# Verificar se .env.local existe
ls -la .env.local

# Verificar se variável está definida
cat .env.local | grep SUPABASE_URL

# Reiniciar servidor Next.js
npm run dev
```

#### **Erro: "Invalid API key"**
```bash
# Verificar se copiou a chave completa
# Verificar se não tem espaços extras
# Verificar se está usando test vs production keys
```

#### **Erro: "CORS error"**
```bash
# Verificar URLs no Supabase/Stripe/Google
# Verificar se localhost:3001 está autorizado
# Verificar se NEXTAUTH_URL está correto
```
