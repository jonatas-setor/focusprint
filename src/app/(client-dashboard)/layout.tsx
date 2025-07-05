import ClientRouteGuard from '@/components/client/auth/client-route-guard';
import { RealtimeProvider } from '@/contexts/realtime-context';
import GlobalShortcutsProvider from '@/components/client/shared/global-shortcuts-provider';

export default function ClientDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Mock profile for testing
  const mockProfile = {
    id: '1',
    user_id: '1',
    client_id: '1',
    role: 'owner' as const,
    first_name: 'João',
    last_name: 'Silva',
    is_active: true,
    client: {
      id: '1',
      name: 'Acme Corporation',
      plan_type: 'pro',
      status: 'active',
      max_users: 15,
      max_projects: 10,
    }
  };

  return (
    <ClientRouteGuard>
      <RealtimeProvider>
        <GlobalShortcutsProvider>
          <div className="min-h-screen bg-background">
        {/* Temporary Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-16 items-center justify-between px-6">
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {mockProfile.client.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                {mockProfile.first_name} {mockProfile.last_name} • {mockProfile.role}
              </p>
            </div>
          </div>
        </header>

        <div className="flex">
          {/* Collapsible Sidebar */}
          <div className="w-16 border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 hover:w-64 transition-all duration-300 group">
            <div className="flex h-16 items-center px-4 border-b">
              <h2 className="text-lg font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300">FocuSprint</h2>
            </div>
            <nav className="p-4 space-y-2">
              <div className="space-y-1">
                <a href="/dashboard" className="flex items-center px-3 py-2 rounded-md text-sm font-medium bg-secondary text-secondary-foreground" title="Dashboard">
                  <span className="w-4 h-4 mr-2">🏠</span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">Dashboard</span>
                </a>
                <a href="/dashboard/teams" className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-secondary" title="Times">
                  <span className="w-4 h-4 mr-2">👥</span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">Times</span>
                </a>
                <a href="/dashboard/projects" className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-secondary" title="Projetos">
                  <span className="w-4 h-4 mr-2">📁</span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">Projetos</span>
                </a>
                <a href="/dashboard/my-week" className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-secondary" title="Minha Semana">
                  <span className="w-4 h-4 mr-2">📅</span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">Minha Semana</span>
                </a>
                <a href="/dashboard/settings" className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-secondary" title="Configurações">
                  <span className="w-4 h-4 mr-2">⚙️</span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">Configurações</span>
                </a>
              </div>
            </nav>
          </div>

          {/* Main Content */}
          <main className="flex-1">
            {children}
          </main>
          </div>
        </div>
        </GlobalShortcutsProvider>
      </RealtimeProvider>
    </ClientRouteGuard>
  );
}
