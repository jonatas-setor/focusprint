'use client';

import Link from 'next/link';
import {
  Settings,
  Share2,
  MoreHorizontal,
  Sparkles,
  Copy,
  Edit,
  Trash2,
  Archive,
  Download,
  Eye,
  EyeOff,
  Kanban,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  priority?: string;
  start_date?: string;
  end_date?: string;
  progress?: number;
  team_id?: string;
  created_at: string;
}

interface ProjectHeaderProps {
  project: Project | null;
  loading?: boolean;
  onSaveAsTemplate?: () => void;
  chatCollapsed: boolean;
  onToggleChat: () => void;
  activeView: 'kanban' | 'chat';
  onViewChange: (view: 'kanban' | 'chat') => void;
}

export default function ProjectHeader({
  project,
  loading = false,
  onSaveAsTemplate,
  chatCollapsed,
  onToggleChat,
  activeView,
  onViewChange
}: ProjectHeaderProps) {
  if (loading || !project) {
    return (
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-4 py-3">
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-1/3"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Breadcrumb Navigation */}
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/dashboard" className="hover:text-primary transition-colors">
                    Dashboard
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/dashboard/projects" className="hover:text-primary transition-colors">
                    Projects
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-medium">{project.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Action Controls */}
          <div className="flex items-center gap-2">
            {/* View Toggle - Mobile */}
            <div className="flex md:hidden">
              <Button
                variant={activeView === 'kanban' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewChange('kanban')}
              >
                <Kanban className="h-4 w-4" />
              </Button>
              <Button
                variant={activeView === 'chat' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewChange('chat')}
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            </div>

            {/* Chat Toggle - Desktop */}
            <div className="hidden md:flex">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onToggleChat}
                    >
                      {chatCollapsed ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {chatCollapsed ? 'Show chat' : 'Hide chat'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Quick Actions */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Share project</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {onSaveAsTemplate && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={onSaveAsTemplate}>
                      <Sparkles className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Save as template</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* More Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Project Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Project
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate Project
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Archive className="h-4 w-4 mr-2" />
                  Archive Project
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/dashboard/projects/${project.id}/settings`}>
                      <Settings className="h-4 w-4" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Project settings</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </div>
  );
}
