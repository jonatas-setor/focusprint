'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Users, CheckCircle, Layers, Target, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TemplateColumn {
  id: string;
  name: string;
  position: number;
  color: string;
  description?: string;
}

interface TemplateTask {
  id: string;
  title: string;
  description?: string;
  position: number;
  priority: string;
  estimated_hours?: number;
  tags?: string[];
  column_id: string;
}

interface ProjectTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  template_config: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  template_columns: TemplateColumn[];
  template_tasks: TemplateTask[];
  stats: {
    column_count: number;
    task_count: number;
    estimated_total_hours: number;
  };
}

interface TemplatePreviewProps {
  template: ProjectTemplate;
  showHeader?: boolean;
  maxTasks?: number;
  className?: string;
}

export default function TemplatePreview({
  template,
  showHeader = true,
  maxTasks = 5,
  className
}: TemplatePreviewProps) {
  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      'low': 'bg-green-100 text-green-800 border-green-200',
      'medium': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'high': 'bg-orange-100 text-orange-800 border-orange-200',
      'urgent': 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      'low': 'Baixa',
      'medium': 'Média',
      'high': 'Alta',
      'urgent': 'Urgente'
    };
    return labels[priority] || priority;
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'software': 'Desenvolvimento',
      'marketing': 'Marketing',
      'onboarding': 'Onboarding',
      'event': 'Eventos',
      'general': 'Geral'
    };
    return labels[category] || category;
  };

  const sortedColumns = template.template_columns.sort((a, b) => a.position - b.position);
  const sortedTasks = template.template_tasks.sort((a, b) => a.position - b.position);
  const displayTasks = sortedTasks.slice(0, maxTasks);
  const remainingTasks = sortedTasks.length - maxTasks;

  // Group tasks by column for workflow visualization
  const tasksByColumn = template.template_tasks.reduce((acc, task) => {
    if (!acc[task.column_id]) {
      acc[task.column_id] = [];
    }
    acc[task.column_id].push(task);
    return acc;
  }, {} as Record<string, TemplateTask[]>);

  return (
    <div className={cn("space-y-4", className)}>
      {showHeader && (
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold">{template.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary">
                  {getCategoryLabel(template.category)}
                </Badge>
              </div>
            </div>
          </div>
          
          {template.description && (
            <p className="text-sm text-muted-foreground">
              {template.description}
            </p>
          )}

          {/* Template Stats */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Layers className="h-4 w-4" />
              <span>{template.stats.column_count} colunas</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4" />
              <span>{template.stats.task_count} tarefas</span>
            </div>
            {template.stats.estimated_total_hours > 0 && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{template.stats.estimated_total_hours}h estimadas</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Workflow Structure */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Estrutura do Workflow
            </CardTitle>
            <CardDescription>
              Colunas do Kanban que serão criadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sortedColumns.map((column, index) => (
                <div key={column.id} className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-medium">
                    {index + 1}
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <div
                      className="w-3 h-3 rounded-full border"
                      style={{ backgroundColor: column.color }}
                    />
                    <span className="font-medium text-sm">{column.name}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {tasksByColumn[column.id]?.length || 0} tarefas
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sample Tasks */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              Tarefas de Exemplo
            </CardTitle>
            <CardDescription>
              Tarefas que serão criadas automaticamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {displayTasks.map((task) => {
                  const column = sortedColumns.find(c => c.id === task.column_id);
                  return (
                    <div key={task.id} className="p-3 bg-muted/50 rounded-lg border">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm leading-tight">
                          {task.title}
                        </h4>
                        {column && (
                          <div
                            className="w-2 h-2 rounded-full ml-2 mt-1 flex-shrink-0"
                            style={{ backgroundColor: column.color }}
                            title={column.name}
                          />
                        )}
                      </div>
                      
                      {task.description && (
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className={cn("text-xs", getPriorityColor(task.priority))}
                        >
                          {getPriorityLabel(task.priority)}
                        </Badge>
                        
                        {task.estimated_hours && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {task.estimated_hours}h
                          </div>
                        )}
                        
                        {task.tags && task.tags.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Tag className="h-3 w-3 text-muted-foreground" />
                            <div className="flex gap-1">
                              {task.tags.slice(0, 2).map((tag, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {task.tags.length > 2 && (
                                <span className="text-xs text-muted-foreground">
                                  +{task.tags.length - 2}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {remainingTasks > 0 && (
                  <div className="text-center py-2">
                    <span className="text-xs text-muted-foreground">
                      +{remainingTasks} tarefas adicionais serão criadas
                    </span>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Template Configuration Summary */}
      {template.template_config && Object.keys(template.template_config).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Configurações do Template</CardTitle>
            <CardDescription>
              Configurações especiais que serão aplicadas ao projeto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {template.template_config.default_priority && (
                <div>
                  <span className="font-medium">Prioridade padrão:</span>
                  <span className="ml-2 capitalize">{template.template_config.default_priority}</span>
                </div>
              )}
              {template.template_config.auto_assign && (
                <div>
                  <span className="font-medium">Atribuição automática:</span>
                  <span className="ml-2">{template.template_config.auto_assign ? 'Sim' : 'Não'}</span>
                </div>
              )}
              {template.template_config.enable_time_tracking && (
                <div>
                  <span className="font-medium">Controle de tempo:</span>
                  <span className="ml-2">{template.template_config.enable_time_tracking ? 'Habilitado' : 'Desabilitado'}</span>
                </div>
              )}
              {template.template_config.default_color && (
                <div className="flex items-center">
                  <span className="font-medium">Cor do projeto:</span>
                  <div
                    className="ml-2 w-4 h-4 rounded border"
                    style={{ backgroundColor: template.template_config.default_color }}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
