'use client'

import React from 'react'
import { format, isAfter, isBefore, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar, Clock, CheckCircle, AlertCircle, Circle, Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface Milestone {
  id: string
  name: string
  description?: string
  due_date?: string
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold'
  progress_percentage: number
  priority: 'low' | 'medium' | 'high' | 'urgent'
  color: string
  position: number
  task_count?: number
  created_at: string
  updated_at: string
}

interface MilestoneTimelineProps {
  milestones: Milestone[]
  className?: string
  onMilestoneClick?: (milestone: Milestone) => void
}

const statusConfig = {
  not_started: {
    label: 'Não Iniciado',
    icon: Circle,
    color: 'text-gray-400',
    bgColor: 'bg-gray-100'
  },
  in_progress: {
    label: 'Em Progresso',
    icon: Clock,
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
    icon: AlertCircle,
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

export function MilestoneTimeline({ milestones, className, onMilestoneClick }: MilestoneTimelineProps) {
  // Sort milestones by due date, then by position
  const sortedMilestones = [...milestones].sort((a, b) => {
    if (a.due_date && b.due_date) {
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    }
    if (a.due_date && !b.due_date) return -1
    if (!a.due_date && b.due_date) return 1
    return a.position - b.position
  })

  const getDueDateStatus = (dueDate?: string) => {
    if (!dueDate) return null
    
    const date = new Date(dueDate)
    if (isToday(date)) return 'today'
    if (isBefore(date, new Date())) return 'overdue'
    if (isBefore(date, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))) return 'due_soon'
    return 'future'
  }

  const getDueDateColor = (status: string | null) => {
    switch (status) {
      case 'overdue': return 'text-red-600 bg-red-50'
      case 'today': return 'text-orange-600 bg-orange-50'
      case 'due_soon': return 'text-yellow-600 bg-yellow-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  if (sortedMilestones.length === 0) {
    return (
      <Card className={cn('p-8', className)}>
        <div className="text-center text-gray-500">
          <Target className="mx-auto h-12 w-12 mb-4 text-gray-300" />
          <h3 className="text-lg font-medium mb-2">Nenhum marco definido</h3>
          <p className="text-sm">Crie marcos para acompanhar o progresso do projeto</p>
        </div>
      </Card>
    )
  }

  return (
    <TooltipProvider>
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center gap-2 mb-6">
          <Target className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Timeline de Marcos</h3>
          <Badge variant="secondary">{sortedMilestones.length} marcos</Badge>
        </div>

        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

          {sortedMilestones.map((milestone, index) => {
            const statusInfo = statusConfig[milestone.status]
            const StatusIcon = statusInfo.icon
            const dueDateStatus = getDueDateStatus(milestone.due_date)
            const isClickable = !!onMilestoneClick

            return (
              <div key={milestone.id} className="relative flex items-start gap-4 pb-8">
                {/* Timeline dot */}
                <div className={cn(
                  'relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-4 border-white shadow-sm',
                  statusInfo.bgColor
                )}>
                  <StatusIcon className={cn('h-5 w-5', statusInfo.color)} />
                </div>

                {/* Milestone card */}
                <Card 
                  className={cn(
                    'flex-1 transition-all duration-200',
                    isClickable && 'cursor-pointer hover:shadow-md hover:scale-[1.02]'
                  )}
                  onClick={() => onMilestoneClick?.(milestone)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base font-medium mb-1">
                          {milestone.name}
                        </CardTitle>
                        {milestone.description && (
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {milestone.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Badge 
                          variant="secondary" 
                          className={priorityConfig[milestone.priority].color}
                        >
                          {priorityConfig[milestone.priority].label}
                        </Badge>
                        <Badge variant="outline" className={statusInfo.color}>
                          {statusInfo.label}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {/* Progress bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Progresso</span>
                          <span className="font-medium">{milestone.progress_percentage}%</span>
                        </div>
                        <Progress 
                          value={milestone.progress_percentage} 
                          className="h-2"
                          style={{ 
                            '--progress-background': milestone.color 
                          } as React.CSSProperties}
                        />
                      </div>

                      {/* Due date and task count */}
                      <div className="flex items-center justify-between text-sm">
                        {milestone.due_date ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className={cn(
                                'flex items-center gap-1 px-2 py-1 rounded-md',
                                getDueDateColor(dueDateStatus)
                              )}>
                                <Calendar className="h-3 w-3" />
                                <span>
                                  {format(new Date(milestone.due_date), 'dd/MM/yyyy', { locale: ptBR })}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                {dueDateStatus === 'overdue' && 'Atrasado'}
                                {dueDateStatus === 'today' && 'Vence hoje'}
                                {dueDateStatus === 'due_soon' && 'Vence em breve'}
                                {dueDateStatus === 'future' && 'Prazo futuro'}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-gray-400">Sem prazo definido</span>
                        )}

                        {milestone.task_count !== undefined && (
                          <div className="flex items-center gap-1 text-gray-600">
                            <Target className="h-3 w-3" />
                            <span>{milestone.task_count} tarefas</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )
          })}
        </div>
      </div>
    </TooltipProvider>
  )
}
