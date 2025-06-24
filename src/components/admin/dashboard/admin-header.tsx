'use client';

import { Button } from '@/components/ui/button';
import { useAdminAuth } from '@/hooks/use-admin-auth';

export default function AdminHeader() {
  const { user, signOut, loading } = useAdminAuth();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      // Silent fail for logout errors
    }
  };

  return (
    <header className="bg-white shadow-sm border-b" suppressHydrationWarning>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-900">
              FocuSprint Admin
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <div className="text-sm">
                  <p className="text-gray-900 font-medium">
                    {user.profile.first_name} {user.profile.last_name}
                  </p>
                  <p className="text-gray-500 text-xs">
                    {user.email} • {user.profile.role}
                  </p>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  disabled={loading}
                >
                  {loading ? 'Saindo...' : 'Sair'}
                </Button>
              </>
            ) : (
              <span className="text-sm text-gray-500">
                Carregando...
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
