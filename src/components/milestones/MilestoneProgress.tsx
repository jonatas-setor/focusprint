'use client'

import React from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { 
  Target, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Calendar,
  TrendingUp,
  Users,
  BarChart3
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface Task {
  id: string
  title: string
  column_id: string
  columns?: {
    name: string
  }
}

interface MilestoneProgressData {
  milestone_id: string
  total_tasks: number
  completed_tasks: number
  progress_percentage: number
  updated_at: string
}

interface Milestone {
  id: string
  name: string
  description?: string
  due_date?: string
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold'
  progress_percentage: number
  priority: 'low' | 'medium' | 'high' | 'urgent'
  color: string
  tasks?: Task[]
  progress_data?: MilestoneProgressData
}

interface MilestoneProgressProps {
  milestone: Milestone
  showDetails?: boolean
  compact?: boolean
  className?: string
  onTaskClick?: (task: Task) => void
}

const statusConfig = {
  not_started: {
    label: 'Não Iniciado',
    icon: Clock,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100'
  },
  in_progress: {
    label: 'Em Progresso',
    icon: TrendingUp,
    color: 'text-blue-500',
    bgColor: 'bg-blue-100'
  },
  completed: {
    label: 'Concluído',
    icon: CheckCircle,
    color: 'text-green-500',
    bgColor: 'bg-green-100'
  },
  on_hold: {
    label: 'Em Espera',
    icon: AlertTriangle,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-100'
  }
}

const priorityConfig = {
  low: { label: 'Baixa', color: 'bg-gray-100 text-gray-800' },
  medium: { label: 'Média', color: 'bg-blue-100 text-blue-800' },
  high: { label: 'Alta', color: 'bg-orange-100 text-orange-800' },
  urgent: { label: 'Urgente', color: 'bg-red-100 text-red-800' }
}

export function MilestoneProgress({ 
  milestone, 
  showDetails = true, 
  compact = false,
  className,
  onTaskClick 
}: MilestoneProgressProps) {
  const statusInfo = statusConfig[milestone.status]
  const StatusIcon = statusInfo.icon
  
  const progressData = milestone.progress_data
  const totalTasks = progressData?.total_tasks || milestone.tasks?.length || 0
  const completedTasks = progressData?.completed_tasks || 0
  const progressPercentage = progressData?.progress_percentage || milestone.progress_percentage || 0

  const isOverdue = milestone.due_date && new Date(milestone.due_date) < new Date()
  const isDueSoon = milestone.due_date && 
    new Date(milestone.due_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) &&
    new Date(milestone.due_date) >= new Date()

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn('flex items-center gap-2 p-2 rounded-md border', className)}>
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: milestone.color }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{milestone.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Progress 
                    value={progressPercentage} 
                    className="h-1 flex-1"
                    style={{ 
                      '--progress-background': milestone.color 
                    } as React.CSSProperties}
                  />
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    {progressPercentage}%
                  </span>
                </div>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-medium">{milestone.name}</p>
              <p className="text-sm">{completedTasks} de {totalTasks} tarefas concluídas</p>
              {milestone.due_date && (
                <p className="text-sm">
                  Prazo: {format(new Date(milestone.due_date), 'dd/MM/yyyy', { locale: ptBR })}
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: milestone.color }}
            />
            <div>
              <CardTitle className="text-lg font-semibold">{milestone.name}</CardTitle>
              {milestone.description && (
                <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant="secondary" 
              className={priorityConfig[milestone.priority].color}
            >
              {priorityConfig[milestone.priority].label}
            </Badge>
            <Badge variant="outline" className={cn('gap-1', statusInfo.color)}>
              <StatusIcon className="w-3 h-3" />
              {statusInfo.label}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium">Progresso</span>
            </div>
            <span className="text-lg font-bold" style={{ color: milestone.color }}>
              {progressPercentage}%
            </span>
          </div>
          
          <Progress 
            value={progressPercentage} 
            className="h-3"
            style={{ 
              '--progress-background': milestone.color 
            } as React.CSSProperties}
          />
          
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>{completedTasks} de {totalTasks} tarefas concluídas</span>
            {progressData?.updated_at && (
              <span>
                Atualizado em {format(new Date(progressData.updated_at), 'dd/MM HH:mm', { locale: ptBR })}
              </span>
            )}
          </div>
        </div>

        {/* Due Date Section */}
        {milestone.due_date && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-gray-50">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-sm">
              <span className="text-gray-600">Prazo: </span>
              <span className={cn(
                'font-medium',
                isOverdue && 'text-red-600',
                isDueSoon && 'text-orange-600'
              )}>
                {format(new Date(milestone.due_date), 'dd/MM/yyyy', { locale: ptBR })}
              </span>
              {isOverdue && (
                <Badge variant="destructive" className="ml-2">
                  Atrasado
                </Badge>
              )}
              {isDueSoon && !isOverdue && (
                <Badge variant="outline" className="ml-2 text-orange-600 border-orange-600">
                  Vence em breve
                </Badge>
              )}
            </span>
          </div>
        )}

        {/* Task Details */}
        {showDetails && milestone.tasks && milestone.tasks.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium">Tarefas Vinculadas</span>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {milestone.tasks.map((task) => {
                const isCompleted = task.columns?.name && 
                  ['concluído', 'concluido', 'done', 'completed', 'finalizado'].includes(
                    task.columns.name.toLowerCase()
                  )
                
                return (
                  <div 
                    key={task.id}
                    className={cn(
                      'flex items-center gap-2 p-2 rounded text-sm transition-colors',
                      onTaskClick && 'cursor-pointer hover:bg-gray-100',
                      isCompleted && 'text-green-600 bg-green-50'
                    )}
                    onClick={() => onTaskClick?.(task)}
                  >
                    <div className={cn(
                      'w-2 h-2 rounded-full flex-shrink-0',
                      isCompleted ? 'bg-green-500' : 'bg-gray-300'
                    )} />
                    <span className={cn(
                      'flex-1 truncate',
                      isCompleted && 'line-through'
                    )}>
                      {task.title}
                    </span>
                    {task.columns?.name && (
                      <Badge variant="outline" className="text-xs">
                        {task.columns.name}
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Statistics */}
        {totalTasks > 0 && (
          <div className="grid grid-cols-3 gap-4 pt-3 border-t">
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">{completedTasks}</div>
              <div className="text-xs text-gray-500">Concluídas</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">{totalTasks - completedTasks}</div>
              <div className="text-xs text-gray-500">Pendentes</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold" style={{ color: milestone.color }}>
                {totalTasks}
              </div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
