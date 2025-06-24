# FocuSprint - Vercel Deployment Guide

## Environment Variables Configuration

Para fazer o deploy do FocuSprint no Vercel, você precisa configurar as seguintes variáveis de ambiente no painel do Vercel:

### 🔐 Supabase Configuration
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 🔐 Stripe Configuration
```
STRIPE_SECRET_KEY=sk_live_... (ou sk_test_... para teste)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... (ou pk_test_... para teste)
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 🔐 Google OAuth (Opcional - apenas se usar Google Meet)
```
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 🔐 NextAuth Configuration
```
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=https://your-app.vercel.app
```

### 🔐 Application Settings
```
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

## 📋 Deployment Steps

### 1. Preparar o Repositório
- ✅ Código já está no GitHub: https://github.com/jonatas-setor/focusprint
- ✅ Arquivos sensíveis foram removidos
- ✅ .vercelignore configurado

### 2. Configurar Vercel
1. Acesse [vercel.com](https://vercel.com)
2. Conecte sua conta GitHub
3. Importe o repositório `jonatas-setor/focusprint`
4. Configure as variáveis de ambiente listadas acima

### 3. Configurar Supabase
1. Acesse seu projeto Supabase
2. Vá em Settings > API
3. Copie a URL e as chaves necessárias
4. Configure as políticas RLS (Row Level Security)

### 4. Configurar Stripe
1. Acesse seu dashboard Stripe
2. Vá em Developers > API keys
3. Copie as chaves necessárias
4. Configure webhooks para: `https://your-app.vercel.app/api/webhooks/stripe`

### 5. Configurar Google OAuth (Opcional)
1. Acesse [Google Cloud Console](https://console.cloud.google.com)
2. Crie um projeto ou use existente
3. Ative Google+ API
4. Configure OAuth consent screen
5. Crie credenciais OAuth 2.0
6. Adicione redirect URI: `https://your-app.vercel.app/api/auth/callback/google`

## 🔧 Build Configuration

O projeto está configurado para build automático no Vercel com:
- **Framework**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`
- **Node.js Version**: 18.x

## 🚀 Deploy Process

1. **Automatic Deployment**: Cada push para `main` triggera deploy automático
2. **Preview Deployments**: PRs geram preview deployments
3. **Production Domain**: Configure domínio customizado se necessário

## 📊 Monitoring

Após o deploy, monitore:
- **Vercel Analytics**: Performance e usage
- **Vercel Logs**: Erros e debugging
- **Supabase Dashboard**: Database performance
- **Stripe Dashboard**: Payment processing

## 🔒 Security Checklist

- [ ] Todas as variáveis de ambiente configuradas
- [ ] Supabase RLS policies ativas
- [ ] Stripe webhooks configurados
- [ ] CORS configurado no Supabase
- [ ] Domain restrictions configuradas (se aplicável)
- [ ] SSL/HTTPS ativo (automático no Vercel)

## 🆘 Troubleshooting

### Build Errors
- Verifique se todas as dependências estão no package.json
- Confirme que não há imports de arquivos que foram excluídos

### Runtime Errors
- Verifique logs no Vercel Dashboard
- Confirme que todas as env vars estão configuradas
- Teste conexões com Supabase e Stripe

### Database Issues
- Verifique se as tabelas existem no Supabase
- Confirme que as RLS policies estão corretas
- Teste conexão com service role key

## 📞 Support

Para suporte técnico:
1. Verifique logs no Vercel Dashboard
2. Consulte documentação do Supabase
3. Verifique status do Stripe
4. Entre em contato com o desenvolvedor se necessário

---

**Importante**: Nunca commite valores reais das variáveis de ambiente no código. Use apenas este guia para configurar no painel do Vercel.
