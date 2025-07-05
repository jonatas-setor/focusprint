import type { Metadata } from "next";
import AdminHeader from '@/components/admin/dashboard/admin-header';
import AdminRouteGuard from '@/components/admin/auth/admin-route-guard';

export const metadata: Metadata = {
  title: "Platform Admin - FocuSprint",
  description: "Painel administrativo da plataforma FocuSprint",
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AdminRouteGuard>
      <div className="admin-layout min-h-screen bg-gray-50">
        {/* Admin Header */}
        <AdminHeader />

        <div className="flex">
          {/* Admin Sidebar */}
          <aside className="w-64 bg-white shadow-sm min-h-screen">
            <nav className="mt-8 px-4">
              <div className="space-y-2">
                <a
                  href="/admin"
                  className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"
                >
                  Dashboard
                </a>
                <a
                  href="/admin/clients"
                  className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"
                >
                  Clientes
                </a>
                <a
                  href="/admin/licenses"
                  className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"
                >
                  Licenças
                </a>
                <a
                  href="/admin/plans"
                  className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"
                >
                  Planos
                </a>
                <a
                  href="/admin/templates"
                  className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"
                >
                  Templates de Projeto
                </a>
                <a
                  href="/admin/billing/additional-users"
                  className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"
                >
                  Usuários Adicionais
                </a>
                <a
                  href="/admin/metrics"
                  className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"
                >
                  Métricas
                </a>
                <a
                  href="/admin/users"
                  className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"
                >
                  Administradores
                </a>
                <a
                  href="/admin/profile"
                  className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"
                >
                  Meu Perfil
                </a>
                <a
                  href="/admin/audit"
                  className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"
                >
                  Logs de Auditoria
                </a>
              </div>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-8">
            {children}
          </main>
        </div>
      </div>
    </AdminRouteGuard>
  );
}
