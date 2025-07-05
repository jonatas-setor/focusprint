'use client'

import React from 'react'
import { Target, Calendar, TrendingUp } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
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
}

interface MilestoneIndicatorProps {
  milestone: Milestone
  size?: 'sm' | 'md' | 'lg'
  showProgress?: boolean
  showDueDate?: boolean
  className?: string
  onClick?: () => void
}

const sizeConfig = {
  sm: {
    dot: 'w-2 h-2',
    text: 'text-xs',
    badge: 'text-xs px-1 py-0.5',
    icon: 'h-3 w-3'
  },
  md: {
    dot: 'w-3 h-3',
    text: 'text-sm',
    badge: 'text-xs px-2 py-1',
    icon: 'h-4 w-4'
  },
  lg: {
    dot: 'w-4 h-4',
    text: 'text-base',
    badge: 'text-sm px-2 py-1',
    icon: 'h-5 w-5'
  }
}

const statusConfig = {
  not_started: {
    label: 'Não Iniciado',
    color: 'text-gray-500',
    bgColor: 'bg-gray-100'
  },
  in_progress: {
    label: 'Em Progresso',
    color: 'text-blue-500',
    bgColor: 'bg-blue-100'
  },
  completed: {
    label: 'Concluído',
    color: 'text-green-500',
    bgColor: 'bg-green-100'
  },
  on_hold: {
    label: 'Em Espera',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-100'
  }
}

export function MilestoneIndicator({ 
  milestone, 
  size = 'sm', 
  showProgress = false,
  showDueDate = false,
  className,
  onClick 
}: MilestoneIndicatorProps) {
  const sizeClasses = sizeConfig[size]
  const statusInfo = statusConfig[milestone.status]
  
  const isOverdue = milestone.due_date && new Date(milestone.due_date) < new Date()
  const isDueSoon = milestone.due_date && 
    new Date(milestone.due_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) &&
    new Date(milestone.due_date) >= new Date()

  const content = (
    <div 
      className={cn(
        'flex items-center gap-1.5 transition-all duration-200',
        onClick && 'cursor-pointer hover:scale-105',
        className
      )}
      onClick={onClick}
    >
      {/* Milestone dot with color */}
      <div 
        className={cn('rounded-full flex-shrink-0', sizeClasses.dot)}
        style={{ backgroundColor: milestone.color }}
      />
      
      {/* Milestone name */}
      <span className={cn('font-medium truncate', sizeClasses.text)}>
        {milestone.name}
      </span>
      
      {/* Progress percentage */}
      {showProgress && (
        <Badge 
          variant="secondary" 
          className={cn(sizeClasses.badge, 'ml-1')}
          style={{ 
            backgroundColor: `${milestone.color}20`,
            color: milestone.color,
            borderColor: `${milestone.color}40`
          }}
        >
          {milestone.progress_percentage}%
        </Badge>
      )}
      
      {/* Due date indicator */}
      {showDueDate && milestone.due_date && (
        <div className={cn(
          'flex items-center gap-1 ml-1',
          isOverdue && 'text-red-500',
          isDueSoon && !isOverdue && 'text-orange-500'
        )}>
          <Calendar className={sizeClasses.icon} />
          <span className={sizeClasses.text}>
            {format(new Date(milestone.due_date), 'dd/MM', { locale: ptBR })}
          </span>
        </div>
      )}
    </div>
  )

  if (size === 'sm') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                <span className="font-medium">{milestone.name}</span>
              </div>
              {milestone.description && (
                <p className="text-sm text-gray-600">{milestone.description}</p>
              )}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  <span>{milestone.progress_percentage}%</span>
                </div>
                <Badge variant="outline" className={statusInfo.color}>
                  {statusInfo.label}
                </Badge>
              </div>
              {milestone.due_date && (
                <div className="flex items-center gap-1 text-sm">
                  <Calendar className="h-3 w-3" />
                  <span>
                    Prazo: {format(new Date(milestone.due_date), 'dd/MM/yyyy', { locale: ptBR })}
                  </span>
                  {isOverdue && (
                    <Badge variant="destructive" className="ml-1">
                      Atrasado
                    </Badge>
                  )}
                  {isDueSoon && !isOverdue && (
                    <Badge variant="outline" className="ml-1 text-orange-600 border-orange-600">
                      Vence em breve
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return content
}

// Compact version for use in task cards
export function TaskMilestoneIndicator({ 
  milestone, 
  onClick 
}: { 
  milestone: Milestone
  onClick?: () => void 
}) {
  return (
    <MilestoneIndicator 
      milestone={milestone}
      size="sm"
      className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full px-2 py-1 shadow-sm"
      onClick={onClick}
    />
  )
}

// Badge version for minimal space
export function MilestoneBadge({ 
  milestone, 
  onClick 
}: { 
  milestone: Milestone
  onClick?: () => void 
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline"
            className={cn(
              'gap-1 cursor-pointer hover:scale-105 transition-all',
              onClick && 'hover:shadow-md'
            )}
            style={{ 
              borderColor: milestone.color,
              color: milestone.color
            }}
            onClick={onClick}
          >
            <div 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: milestone.color }}
            />
            <Target className="h-3 w-3" />
            <span className="truncate max-w-[80px]">{milestone.name}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-medium">{milestone.name}</p>
            <p className="text-sm">Progresso: {milestone.progress_percentage}%</p>
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
