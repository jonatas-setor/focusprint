import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            FocuSprint
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Gestão de Projetos com Kanban + Chat + Videochamadas
          </p>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Plataforma completa que combina quadro Kanban, chat em tempo real e videochamadas
            em uma interface unificada para máxima produtividade da sua equipe.
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-3xl mb-4">🎯</div>
            <h3 className="text-xl font-semibold mb-2">Kanban Inteligente</h3>
            <p className="text-gray-600">Gestão visual de tarefas com drag & drop, marcos e progresso em tempo real.</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-3xl mb-4">💬</div>
            <h3 className="text-xl font-semibold mb-2">Chat Integrado</h3>
            <p className="text-gray-600">Comunicação em tempo real por projeto, sem sair do contexto de trabalho.</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-3xl mb-4">📹</div>
            <h3 className="text-xl font-semibold mb-2">Videochamadas</h3>
            <p className="text-gray-600">Integração com Google Meet para reuniões rápidas e colaboração visual.</p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="text-center space-y-4">
          <div className="space-x-4">
            <Link
              href="/login"
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Fazer Login
            </Link>
            <Link
              href="/register"
              className="inline-block bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold border-2 border-blue-600 hover:bg-blue-50 transition-colors"
            >
              Criar Conta
            </Link>
          </div>

          <div className="mt-8">
            <Link
              href="/admin"
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Acesso Administrativo
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-16 text-gray-500">
          <p>&copy; 2024 FocuSprint. Desenvolvido com Next.js + Supabase.</p>
        </div>
      </div>
    </div>
  )
}
