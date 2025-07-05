'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, Clock, Users, CheckCircle, Eye, Sparkles } from 'lucide-react';
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

interface TemplateSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (templateId: string, templateName: string) => void;
  onCreateBlank: () => void;
}

export default function TemplateSelectionModal({
  isOpen,
  onClose,
  onSelectTemplate,
  onCreateBlank
}: TemplateSelectionModalProps) {
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<ProjectTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);

  // Get unique categories from templates
  const categories = ['all', ...Array.from(new Set(templates.map(t => t.category)))];

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  useEffect(() => {
    filterTemplates();
  }, [templates, searchQuery, selectedCategory]);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/client/project-templates?active_only=true');
      
      if (!response.ok) {
        throw new Error('Failed to load templates');
      }

      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterTemplates = () => {
    let filtered = templates;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(template => template.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(query) ||
        template.description?.toLowerCase().includes(query) ||
        template.category.toLowerCase().includes(query)
      );
    }

    setFilteredTemplates(filtered);
  };

  const handleTemplateSelect = (template: ProjectTemplate) => {
    setSelectedTemplate(template);
  };

  const handleConfirmSelection = () => {
    if (selectedTemplate) {
      onSelectTemplate(selectedTemplate.id, selectedTemplate.name);
      onClose();
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'all': 'Todos',
      'software': 'Desenvolvimento',
      'marketing': 'Marketing',
      'onboarding': 'Onboarding',
      'event': 'Eventos',
      'general': 'Geral'
    };
    return labels[category] || category;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      'low': 'bg-green-100 text-green-800',
      'medium': 'bg-yellow-100 text-yellow-800',
      'high': 'bg-orange-100 text-orange-800',
      'urgent': 'bg-red-100 text-red-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Escolher Template de Projeto
          </DialogTitle>
          <DialogDescription>
            Acelere a criação do seu projeto usando um template pré-configurado ou comece do zero.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col h-[70vh]">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-auto">
              <TabsList className="grid grid-cols-3 lg:grid-cols-6">
                {categories.map(category => (
                  <TabsTrigger key={category} value={category} className="text-xs">
                    {getCategoryLabel(category)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* Content */}
          <div className="flex-1 flex gap-4 overflow-hidden">
            {/* Templates List */}
            <div className="flex-1">
              <ScrollArea className="h-full">
                {isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Carregando templates...</span>
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Nenhum template encontrado.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pr-4">
                    {filteredTemplates.map(template => (
                      <Card
                        key={template.id}
                        className={cn(
                          "cursor-pointer transition-all hover:shadow-md",
                          selectedTemplate?.id === template.id && "ring-2 ring-primary"
                        )}
                        onClick={() => handleTemplateSelect(template)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-base">{template.name}</CardTitle>
                              <Badge variant="secondary" className="mt-1">
                                {getCategoryLabel(template.category)}
                              </Badge>
                            </div>
                            {selectedTemplate?.id === template.id && (
                              <CheckCircle className="h-5 w-5 text-primary" />
                            )}
                          </div>
                          {template.description && (
                            <CardDescription className="text-sm">
                              {template.description}
                            </CardDescription>
                          )}
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {template.stats.column_count} colunas
                            </div>
                            <div className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              {template.stats.task_count} tarefas
                            </div>
                            {template.stats.estimated_total_hours > 0 && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {template.stats.estimated_total_hours}h
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Template Preview */}
            {selectedTemplate && (
              <div className="w-80 border-l pl-4">
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="h-4 w-4" />
                  <h3 className="font-medium">Preview do Template</h3>
                </div>
                <ScrollArea className="h-full">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-sm mb-2">Colunas do Kanban</h4>
                      <div className="space-y-2">
                        {selectedTemplate.template_columns
                          .sort((a, b) => a.position - b.position)
                          .map(column => (
                            <div key={column.id} className="flex items-center gap-2 text-sm">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: column.color }}
                              />
                              <span>{column.name}</span>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-sm mb-2">Tarefas de Exemplo</h4>
                      <div className="space-y-2">
                        {selectedTemplate.template_tasks
                          .slice(0, 5)
                          .map(task => (
                            <div key={task.id} className="text-sm p-2 bg-muted rounded">
                              <div className="font-medium">{task.title}</div>
                              {task.description && (
                                <div className="text-muted-foreground text-xs mt-1">
                                  {task.description.substring(0, 60)}...
                                </div>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <Badge
                                  variant="outline"
                                  className={cn("text-xs", getPriorityColor(task.priority))}
                                >
                                  {task.priority}
                                </Badge>
                                {task.estimated_hours && (
                                  <span className="text-xs text-muted-foreground">
                                    {task.estimated_hours}h
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        {selectedTemplate.template_tasks.length > 5 && (
                          <div className="text-xs text-muted-foreground text-center">
                            +{selectedTemplate.template_tasks.length - 5} mais tarefas
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={onCreateBlank}>
              Criar Projeto em Branco
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmSelection}
                disabled={!selectedTemplate}
              >
                Usar Template Selecionado
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
