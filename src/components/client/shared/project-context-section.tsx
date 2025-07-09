'use client';

import { useState } from 'react';
import {
  Star,
  Target,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';

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

interface Task {
  id: string;
  title: string;
  column_id: string;
  priority: string;
}

interface ProjectContextSectionProps {
  project: Project | null;
  tasks: Task[];
  loading?: boolean;
  isCollapsed: boolean;
}



const getPriorityColor = (priority: string) => {
  switch (priority?.toLowerCase()) {
    case 'urgent':
      return 'destructive';
    case 'high':
      return 'secondary';
    case 'medium':
      return 'outline';
    case 'low':
      return 'outline';
    default:
      return 'outline';
  }
};

export default function ProjectContextSection({
  project,
  tasks,
  loading = false,
  isCollapsed
}: ProjectContextSectionProps) {
  const [isStarred, setIsStarred] = useState(false);

  if (loading || !project) {
    return null;
  }

  const completedTasks = tasks.filter(task => task.column_id === 'concluido' || task.column_id === 'completed').length;
  const totalTasks = tasks.length;
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  if (isCollapsed) {
    // Collapsed view - just show project icon with tooltip
    return (
      <TooltipProvider>
        <div className="px-3 py-2 border-t">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-10 p-0 justify-center"
              >
                <Target className="h-4 w-4 text-blue-600" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <div className="space-y-2">
                <p className="font-medium">{project.name}</p>
                <p className="text-xs text-muted-foreground">
                  {completedTasks}/{totalTasks} tasks ({progressPercentage}%)
                </p>
                <div className="flex gap-1">
                  <Badge variant="outline" className="text-xs">
                    {project.status}
                  </Badge>
                  {project.priority && (
                    <Badge variant={getPriorityColor(project.priority)} className="text-xs">
                      {project.priority}
                    </Badge>
                  )}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    );
  }

  // Expanded view - sophisticated design matching plan area
  return (
    <div className="border-t p-4">
      <div className="rounded-lg bg-blue-50/50 border border-blue-100/50 p-3 space-y-3 shadow-sm">
        {/* Header with project icon and title */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 border border-blue-200">
              <Target className="h-4 w-4 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">
                Projeto Atual
              </p>
              <p className="text-sm font-semibold text-blue-900 truncate">
                {project.name}
              </p>
            </div>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsStarred(!isStarred)}
                  className="h-7 w-7 shrink-0 hover:bg-blue-100"
                >
                  <Star className={`h-3 w-3 ${isStarred ? 'fill-amber-400 text-amber-400' : 'text-blue-400'}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isStarred ? 'Remove from favorites' : 'Add to favorites'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Status and Priority Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className="text-xs font-medium border-blue-200 bg-blue-50 text-blue-700"
          >
            <Activity className="h-2 w-2 mr-1" />
            {project.status}
          </Badge>

          {project.priority && (
            <Badge
              variant={getPriorityColor(project.priority)}
              className="text-xs font-medium"
            >
              <Target className="h-2 w-2 mr-1" />
              {project.priority}
            </Badge>
          )}
        </div>

        {/* Progress Bar */}
        {totalTasks > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-blue-600 font-medium">Progress</span>
              <span className="font-semibold text-blue-900">{progressPercentage}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2 bg-blue-100" />
          </div>
        )}

        {/* Quick Stats Grid - matching plan area style */}
        <div className="grid grid-cols-2 gap-2 text-xs text-blue-600">
          <div>
            <span className="font-semibold text-blue-900">{totalTasks}</span>
            <p className="text-blue-600">tarefas</p>
          </div>
          <div>
            <span className="font-semibold text-blue-900">{project.team_id ? 'Team' : 'Solo'}</span>
            <p className="text-blue-600">tipo</p>
          </div>
        </div>

        {/* Description (if available and short) */}
        {project.description && project.description.length < 80 && (
          <p className="text-xs text-blue-600 leading-relaxed bg-blue-50 rounded-md p-2 border border-blue-100">
            {project.description}
          </p>
        )}
      </div>
    </div>
  );
}
