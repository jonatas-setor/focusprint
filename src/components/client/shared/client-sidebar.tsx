'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Settings,
  Sparkles,
  ChevronDown,
  Crown,
  Zap
} from 'lucide-react';
import { ClientProfile, canPerformAction } from '@/lib/auth/types';
import { cn } from '@/lib/utils';
import ProjectContextSection from './project-context-section';
import { useOptionalProjectContext } from '@/contexts/project-context';

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
  const pathname = usePathname();
  const projectContext = useOptionalProjectContext();

  // Check if current route is a project page
  const isProjectPage = useMemo(() => {
    // Match project detail pages: /dashboard/projects/[id] and /dashboard/projects/[id]/edit
    return /^\/dashboard\/projects\/[^\/]+(?:\/edit)?$/.test(pathname);
  }, [pathname]);

  // Auto-collapse sidebar on project pages, but allow manual control
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Start collapsed on project pages, expanded on other pages
    return isProjectPage;
  });

  const [quickActionsOpen, setQuickActionsOpen] = useState(true);

  // Auto-collapse when navigating to project pages
  useEffect(() => {
    if (isProjectPage) {
      setIsCollapsed(true);
    }
  }, [isProjectPage]);

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
    {
      title: 'Templates',
      href: '/dashboard/templates',
      icon: Sparkles,
    },
    {
      title: 'Configurações',
      href: '/dashboard/settings',
      icon: Settings,
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
    <TooltipProvider>
      <div className={cn(
        "flex flex-col border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all duration-300 ease-in-out",
        isCollapsed ? "w-16" : "w-64"
      )}>
        {/* Header with Logo and Collapse Toggle */}
        <div className="flex h-16 items-center justify-between px-4 border-b">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Zap className="h-4 w-4" />
              </div>
              <h2 className="text-lg font-semibold tracking-tight">FocuSprint</h2>
            </div>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="h-8 w-8 p-0 hover:bg-accent"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {isCollapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3">
          <nav className="space-y-2 py-4">
            {/* Main navigation */}
            <div className="space-y-1">
              {navItems.filter(canShowItem).map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                const navButton = (
                  <Button
                    variant={active ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start transition-colors",
                      isCollapsed ? "h-10 w-10 p-0" : "h-10 px-3",
                      active && "bg-secondary text-secondary-foreground shadow-sm"
                    )}
                    asChild
                  >
                    <Link href={item.href}>
                      <Icon className={cn("h-4 w-4", !isCollapsed && "mr-3")} />
                      {!isCollapsed && (
                        <>
                          <span className="flex-1 text-left">{item.title}</span>
                          {item.badge && (
                            <Badge variant="secondary" className="ml-auto text-xs">
                              {item.badge}
                            </Badge>
                          )}
                        </>
                      )}
                    </Link>
                  </Button>
                );

                return isCollapsed ? (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                      {navButton}
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      {item.title}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <div key={item.href}>
                    {navButton}
                  </div>
                );
              })}
            </div>

            {/* Quick Actions Section */}
            {!isCollapsed && (
              <div className="pt-4">
                <Collapsible open={quickActionsOpen} onOpenChange={setQuickActionsOpen}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between h-8 px-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                    >
                      Ações Rápidas
                      <ChevronDown className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        quickActionsOpen && "rotate-180"
                      )} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1 pt-2">
                    {quickActions.filter(canShowAction).map((action) => {
                      const Icon = action.icon;

                      return (
                        <Button
                          key={action.href}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start h-8 text-xs border-dashed hover:border-solid hover:bg-accent"
                          asChild
                        >
                          <Link href={action.href}>
                            <Icon className="mr-2 h-3 w-3" />
                            {action.title}
                          </Link>
                        </Button>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

          </nav>
        </ScrollArea>

        {/* Project Context Section */}
        {projectContext && projectContext.project && (
          <ProjectContextSection
            project={projectContext.project}
            tasks={projectContext.tasks}
            loading={projectContext.loading}
            isCollapsed={isCollapsed}
          />
        )}

        {/* Plan Information Footer */}
        {!isCollapsed && (
          <div className="border-t p-4">
            <div className="rounded-lg bg-accent/50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">
                  Plano Atual
                </p>
                <Crown className="h-3 w-3 text-amber-500" />
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs font-medium",
                  profile.client.plan_type === 'pro' && "border-amber-200 bg-amber-50 text-amber-700",
                  profile.client.plan_type === 'basic' && "border-blue-200 bg-blue-50 text-blue-700"
                )}
              >
                {profile.client.plan_type.toUpperCase()}
              </Badge>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>
                  <span className="font-medium">{profile.client.max_users}</span>
                  <p>usuários</p>
                </div>
                <div>
                  <span className="font-medium">{profile.client.max_projects}</span>
                  <p>projetos</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
