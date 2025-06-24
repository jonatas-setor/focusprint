// Disable static generation for this page
export const dynamic = 'force-dynamic';

export default function ClientProjectsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Meus Projetos
        </h1>
        <p className="text-gray-600">
          Gerencie seus projetos com interface Kanban + Chat
        </p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Lista de Projetos
        </h2>
        <div className="text-center py-8">
          <p className="text-gray-500">
            CRUD de projetos será implementado na Semana 3 - Dia 3-5
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Rota: /dashboard/projects ✅ Funcionando
          </p>
          <p className="text-sm text-blue-600 mt-2">
            Layout com Chat (30%) já implementado →
          </p>
        </div>
      </div>
    </div>
  );
}
