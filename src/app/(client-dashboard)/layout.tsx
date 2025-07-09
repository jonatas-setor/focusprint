import ClientRouteGuard from '@/components/client/auth/client-route-guard';
import { RealtimeProvider } from '@/contexts/realtime-context';
import { ProjectProvider } from '@/contexts/project-context';
import GlobalShortcutsProvider from '@/components/client/shared/global-shortcuts-provider';
import { ClientSidebar } from '@/components/client/shared/client-sidebar';
import { ClientProfile } from '@/lib/auth/types';

export default function ClientDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Mock profile for testing
  const mockProfile: ClientProfile = {
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
        <ProjectProvider>
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
          {/* Sophisticated Sidebar */}
          <ClientSidebar profile={mockProfile} />

          {/* Main Content */}
          <main className="flex-1">
            {children}
          </main>
          </div>
          </div>
          </GlobalShortcutsProvider>
        </ProjectProvider>
      </RealtimeProvider>
    </ClientRouteGuard>
  );
}
