'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutDashboard, 
  Users, 
  FolderOpen, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus
} from 'lucide-react';
import { ClientProfile, canPerformAction } from '@/lib/auth/server';
import { cn } from '@/lib/utils';

interface ClientSidebarProps {
  profile: ClientProfile;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  requiresPermission?: 'create_team' | 'invite_user' | 'manage_project';
}

export function ClientSidebar({ profile }: ClientSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  const navItems: NavItem[] = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      title: 'Times',
      href: '/dashboard/teams',
      icon: Users,
      requiresPermission: 'create_team',
    },
    {
      title: 'Projetos',
      href: '/dashboard/projects',
      icon: FolderOpen,
      requiresPermission: 'manage_project',
    },
    {
      title: 'Minha Semana',
      href: '/dashboard/my-week',
      icon: Calendar,
    },
  ];

  const quickActions = [
    {
      title: 'Novo Time',
      href: '/dashboard/teams/new',
      icon: Plus,
      requiresPermission: 'create_team' as const,
    },
    {
      title: 'Novo Projeto',
      href: '/dashboard/projects/new',
      icon: Plus,
      requiresPermission: 'manage_project' as const,
    },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const canShowItem = (item: NavItem) => {
    if (!item.requiresPermission) return true;
    return canPerformAction(profile, item.requiresPermission);
  };

  const canShowAction = (action: typeof quickActions[0]) => {
    if (!action.requiresPermission) return true;
    return canPerformAction(profile, action.requiresPermission);
  };

  return (
    <div className={cn(
      "flex flex-col border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Collapse toggle */}
      <div className="flex h-16 items-center justify-between px-4 border-b">
        {!isCollapsed && (
          <h2 className="text-lg font-semibold">FocuSprint</h2>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-8 p-0"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2 p-4">
        {/* Main navigation */}
        <div className="space-y-1">
          {navItems.filter(canShowItem).map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={active ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start",
                    isCollapsed && "px-2"
                  )}
                >
                  <Icon className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
                  {!isCollapsed && (
                    <>
                      <span>{item.title}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="ml-auto">
                          {item.badge}
                        </Badge>
                      )}
                    </>
                  )}
                </Button>
              </Link>
            );
          })}
        </div>

        {/* Quick Actions */}
        {!isCollapsed && (
          <div className="pt-4">
            <h3 className="mb-2 px-2 text-sm font-medium text-muted-foreground">
              Ações Rápidas
            </h3>
            <div className="space-y-1">
              {quickActions.filter(canShowAction).map((action) => {
                const Icon = action.icon;
                
                return (
                  <Link key={action.href} href={action.href}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                    >
                      <Icon className="mr-2 h-3 w-3" />
                      <span className="text-xs">{action.title}</span>
                    </Button>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Plan info */}
        {!isCollapsed && (
          <div className="pt-4 border-t">
            <div className="px-2 py-2">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Plano Atual
              </p>
              <Badge variant="outline" className="text-xs">
                {profile.client.plan_type.toUpperCase()}
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">
                {profile.client.max_users} usuários
              </p>
              <p className="text-xs text-muted-foreground">
                {profile.client.max_projects} projetos
              </p>
            </div>
          </div>
        )}
      </nav>
    </div>
  );
}
