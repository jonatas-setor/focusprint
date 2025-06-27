'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navigationItems = [
  {
    name: 'Dashboard',
    href: '/admin',
    icon: '📊'
  },
  {
    name: 'Clientes',
    href: '/admin/clients',
    icon: '🏢'
  },
  {
    name: 'Licenças',
    href: '/admin/licenses',
    icon: '📄'
  },
  {
    name: 'Planos',
    href: '/admin/plans',
    icon: '💼'
  },
  {
    name: 'Usuários Adicionais',
    href: '/admin/billing/additional-users',
    icon: '👥+'
  },
  {
    name: 'Métricas',
    href: '/admin/metrics',
    icon: '📈'
  },
  {
    name: 'Administradores',
    href: '/admin/users',
    icon: '👥'
  },
  {
    name: 'Meu Perfil',
    href: '/admin/profile',
    icon: '👤'
  },
  {
    name: 'Logs de Auditoria',
    href: '/admin/audit',
    icon: '📋'
  }
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white shadow-sm min-h-screen">
      <nav className="mt-8 px-4">
        <div className="space-y-2">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <span className="mr-3">{item.icon}</span>
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
