/**
 * Script para testar autenticação admin
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testAdminAuth() {
  try {
    console.log('🔐 Testando autenticação admin...');
    
    // Fazer login
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'jonatas@focusprint.com',
      password: 'FocuSprint2024!',
    });

    if (error) {
      console.log('❌ Erro no login:', error.message);
      return;
    }

    console.log('✅ Login bem-sucedido!');
    console.log('👤 Usuário:', data.user.email);
    console.log('🔑 Token:', data.session.access_token.substring(0, 20) + '...');

    // Verificar perfil admin
    const { data: profile, error: profileError } = await supabase
      .from('admin_profiles')
      .select('*')
      .eq('user_id', data.user.id)
      .single();

    if (profileError) {
      console.log('❌ Erro ao buscar perfil admin:', profileError.message);
      return;
    }

    console.log('✅ Perfil admin encontrado!');
    console.log('📋 Nome:', profile.first_name, profile.last_name);
    console.log('🎭 Role:', profile.role);

    // Fazer logout
    await supabase.auth.signOut();
    console.log('✅ Logout realizado com sucesso!');

    console.log('\n🎉 Teste de autenticação admin PASSOU!');
    console.log('🔗 Agora você pode fazer login em: http://localhost:3001/admin/login');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

// Executar teste
testAdminAuth();
