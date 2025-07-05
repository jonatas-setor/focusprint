'use client'

import React, { useEffect, useState } from 'react'
import { format, isAfter, isBefore, isToday, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { 
  Target, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Bell,
  X
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface Milestone {
  id: string
  name: string
  description?: string
  due_date?: string
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold'
  progress_percentage: number
  priority: 'low' | 'medium' | 'high' | 'urgent'
  color: string
  project_id: string
  project_name?: string
}

interface MilestoneNotificationsProps {
  milestones: Milestone[]
  onMilestoneClick?: (milestone: Milestone) => void
  onDismissNotification?: (milestoneId: string, notificationType: string) => void
}

type NotificationType = 'overdue' | 'due_today' | 'due_soon' | 'completed' | 'at_risk'

interface MilestoneNotification {
  milestone: Milestone
  type: NotificationType
  title: string
  message: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  icon: React.ComponentType<{ className?: string }>
  color: string
}

const notificationConfig = {
  overdue: {
    icon: AlertTriangle,
    color: 'text-red-600 bg-red-50 border-red-200',
    priority: 'urgent' as const
  },
  due_today: {
    icon: Calendar,
    color: 'text-orange-600 bg-orange-50 border-orange-200',
    priority: 'high' as const
  },
  due_soon: {
    icon: Clock,
    color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    priority: 'medium' as const
  },
  completed: {
    icon: CheckCircle,
    color: 'text-green-600 bg-green-50 border-green-200',
    priority: 'low' as const
  },
  at_risk: {
    icon: Target,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    priority: 'medium' as const
  }
}

export function MilestoneNotifications({ 
  milestones, 
  onMilestoneClick,
  onDismissNotification 
}: MilestoneNotificationsProps) {
  const [notifications, setNotifications] = useState<MilestoneNotification[]>([])
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set())

  // Generate notifications based on milestone status and dates
  useEffect(() => {
    const newNotifications: MilestoneNotification[] = []
    const today = new Date()

    milestones.forEach((milestone) => {
      const notificationKey = `${milestone.id}`

      // Skip if notification was dismissed
      if (dismissedNotifications.has(notificationKey)) {
        return
      }

      // Completed milestone notification
      if (milestone.status === 'completed' && milestone.progress_percentage === 100) {
        newNotifications.push({
          milestone,
          type: 'completed',
          title: 'Marco Concluído! 🎉',
          message: `O marco "${milestone.name}" foi concluído com sucesso.`,
          priority: 'low',
          icon: CheckCircle,
          color: notificationConfig.completed.color
        })
        return
      }

      // Date-based notifications
      if (milestone.due_date && milestone.status !== 'completed') {
        const dueDate = new Date(milestone.due_date)
        
        // Overdue
        if (isBefore(dueDate, today)) {
          newNotifications.push({
            milestone,
            type: 'overdue',
            title: 'Marco Atrasado ⚠️',
            message: `O marco "${milestone.name}" está atrasado desde ${format(dueDate, 'dd/MM/yyyy', { locale: ptBR })}.`,
            priority: 'urgent',
            icon: AlertTriangle,
            color: notificationConfig.overdue.color
          })
        }
        // Due today
        else if (isToday(dueDate)) {
          newNotifications.push({
            milestone,
            type: 'due_today',
            title: 'Marco Vence Hoje 📅',
            message: `O marco "${milestone.name}" vence hoje. Progresso atual: ${milestone.progress_percentage}%.`,
            priority: 'high',
            icon: Calendar,
            color: notificationConfig.due_today.color
          })
        }
        // Due soon (within 3 days)
        else if (isBefore(dueDate, addDays(today, 4))) {
          const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          newNotifications.push({
            milestone,
            type: 'due_soon',
            title: 'Marco Vence em Breve ⏰',
            message: `O marco "${milestone.name}" vence em ${daysUntilDue} dia${daysUntilDue > 1 ? 's' : ''}. Progresso: ${milestone.progress_percentage}%.`,
            priority: 'medium',
            icon: Clock,
            color: notificationConfig.due_soon.color
          })
        }
      }

      // Progress-based notifications (at risk milestones)
      if (milestone.due_date && milestone.status === 'in_progress') {
        const dueDate = new Date(milestone.due_date)
        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        
        // If milestone is due soon but progress is low
        if (daysUntilDue <= 7 && milestone.progress_percentage < 50) {
          newNotifications.push({
            milestone,
            type: 'at_risk',
            title: 'Marco em Risco 🎯',
            message: `O marco "${milestone.name}" pode não ser concluído no prazo. Apenas ${milestone.progress_percentage}% concluído.`,
            priority: 'medium',
            icon: Target,
            color: notificationConfig.at_risk.color
          })
        }
      }
    })

    // Sort by priority
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
    newNotifications.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

    setNotifications(newNotifications)
  }, [milestones, dismissedNotifications])

  // Show toast notifications for high priority items
  useEffect(() => {
    notifications.forEach((notification) => {
      if (notification.priority === 'urgent' || notification.priority === 'high') {
        toast(notification.title, {
          description: notification.message,
          action: {
            label: 'Ver Marco',
            onClick: () => onMilestoneClick?.(notification.milestone)
          },
          duration: 10000 // 10 seconds for important notifications
        })
      }
    })
  }, [notifications, onMilestoneClick])

  const handleDismiss = (notification: MilestoneNotification) => {
    const notificationKey = `${notification.milestone.id}`
    setDismissedNotifications(prev => new Set([...prev, notificationKey]))
    onDismissNotification?.(notification.milestone.id, notification.type)
  }

  if (notifications.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Bell className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold">Notificações de Marcos</h3>
        <Badge variant="secondary">{notifications.length}</Badge>
      </div>

      <div className="space-y-2">
        {notifications.map((notification) => {
          const Icon = notification.icon
          
          return (
            <Alert 
              key={`${notification.milestone.id}-${notification.type}`}
              className={cn('relative', notification.color)}
            >
              <Icon className="h-4 w-4" />
              <AlertTitle className="flex items-center justify-between">
                <span>{notification.title}</span>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className="text-xs"
                    style={{ 
                      borderColor: notification.milestone.color,
                      color: notification.milestone.color 
                    }}
                  >
                    {notification.milestone.project_name || 'Projeto'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-black/10"
                    onClick={() => handleDismiss(notification)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </AlertTitle>
              <AlertDescription className="mt-2">
                <div className="flex items-center justify-between">
                  <span>{notification.message}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onMilestoneClick?.(notification.milestone)}
                    className="ml-4"
                  >
                    Ver Marco
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )
        })}
      </div>
    </div>
  )
}

// Hook for milestone notifications
export function useMilestoneNotifications(projectId?: string) {
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!projectId) return

    const fetchMilestones = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/client/projects/${projectId}/milestones`)
        if (response.ok) {
          const data = await response.json()
          setMilestones(data.milestones || [])
        }
      } catch (error) {
        console.error('Error fetching milestones for notifications:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMilestones()
  }, [projectId])

  return { milestones, loading }
}
