// Temporary simplified layout for testing
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
        {/* Temporary Sidebar */}
        <div className="w-64 border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-16 items-center px-4 border-b">
            <h2 className="text-lg font-semibold">FocuSprint</h2>
          </div>
          <nav className="p-4 space-y-2">
            <div className="space-y-1">
              <a href="/dashboard" className="block px-3 py-2 rounded-md text-sm font-medium bg-secondary text-secondary-foreground">
                Dashboard
              </a>
              <a href="/dashboard/teams" className="block px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-secondary">
                Times
              </a>
              <a href="/dashboard/projects" className="block px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-secondary">
                Projetos
              </a>
              <a href="/dashboard/my-week" className="block px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-secondary">
                Minha Semana
              </a>
            </div>
          </nav>
        </div>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
