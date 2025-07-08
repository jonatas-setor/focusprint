'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Loader2, Sparkles, FileText, CheckCircle, TrendingUp, Code, Users, Calendar, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  is_active: boolean;
  created_at: string;
  stats: {
    column_count: number;
    task_count: number;
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
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');

  // Get unique categories from templates
  const categories = ['all', ...Array.from(new Set(templates.map(t => t.category)))];

  // Filter templates by category
  const filteredTemplates = activeCategory === 'all'
    ? templates
    : templates.filter(t => t.category === activeCategory);

  // Load templates from API
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

  // Load templates when modal opens
  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      setSelectedTemplate(null);
      setActiveCategory('all');
    }
  }, [isOpen]);

  // Handle template selection
  const handleTemplateSelect = (template: ProjectTemplate) => {
    setSelectedTemplate(selectedTemplate?.id === template.id ? null : template);
  };

  // Handle confirm selection
  const handleConfirmSelection = () => {
    if (selectedTemplate) {
      onSelectTemplate(selectedTemplate.id, selectedTemplate.name);
      onClose();
    }
  };

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'marketing':
        return <TrendingUp className="h-4 w-4" />;
      case 'desenvolvimento':
      case 'development':
        return <Code className="h-4 w-4" />;
      case 'atendimento':
      case 'support':
        return <Users className="h-4 w-4" />;
      case 'eventos':
      case 'events':
        return <Calendar className="h-4 w-4" />;
      default:
        return <Folder className="h-4 w-4" />;
    }
  };

  // Get category label
  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'all': 'Todos',
      'marketing': 'Marketing',
      'desenvolvimento': 'Desenvolvimento',
      'atendimento': 'Atendimento',
      'eventos': 'Eventos'
    };
    return labels[category] || category;
  };

  // Get category count
  const getCategoryCount = (category: string) => {
    if (category === 'all') return templates.length;
    return templates.filter(t => t.category === category).length;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* DIV MASTER REAL DO MODAL - DialogContent do Radix UI que gera a div role="dialog" */}
      <DialogContent
        className="w-[95%] lg:w-[80%] max-w-none max-h-[90vh] p-0 gap-0 flex flex-col overflow-hidden"
        aria-labelledby="template-modal-title"
        aria-describedby="template-modal-description"
      >
        {/* DIV MASTER DO MODAL - Container principal que controla todo o layout */}
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex-shrink-0 px-6 py-6 border-b">
            <DialogHeader className="space-y-3">
              <DialogTitle
                id="template-modal-title"
                className="flex items-center gap-3 text-xl font-semibold"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                Escolher Template de Projeto
              </DialogTitle>
              <DialogDescription
                id="template-modal-description"
                className="text-sm text-muted-foreground"
              >
                Acelere a criação do seu projeto usando um template pré-configurado ou comece do zero.
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0 flex flex-col">
            {isLoading ? (
              <div className="flex items-center justify-center flex-1">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Carregando templates...</span>
                </div>
              </div>
            ) : (
              <Tabs value={activeCategory} onValueChange={setActiveCategory} className="flex-1 flex flex-col">
                {/* Category Tabs */}
                <div className="flex-shrink-0 px-6 py-4 border-b">
                  <div className="flex flex-wrap gap-2">
                    {categories.map(category => (
                      <button
                        key={category}
                        onClick={() => setActiveCategory(category)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                          activeCategory === category
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {getCategoryIcon(category)}
                        <span>{getCategoryLabel(category)}</span>
                        <Badge
                          variant={activeCategory === category ? "secondary" : "outline"}
                          className="ml-1 text-xs"
                        >
                          {getCategoryCount(category)}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Template List - Scrollable Container */}
                <div style={{
                  height: '500px',
                  overflow: 'scroll',
                  minHeight: '200px',
                  flex: 'none'
                }}>
                  <div className="px-6 py-4 pb-24">
                    <TabsContent value={activeCategory} className="mt-0">
                    {filteredTemplates.length === 0 ? (
                      <div className="text-center py-12">
                        <Folder className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">Nenhum template encontrado</h3>
                        <p className="text-muted-foreground">
                          Não há templates disponíveis nesta categoria.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-full">
                        {filteredTemplates.map(template => (
                          <Card
                            key={template.id}
                            className={cn(
                              "cursor-pointer transition-all duration-200 hover:shadow-md min-w-0 w-full",
                              selectedTemplate?.id === template.id
                                ? "ring-2 ring-primary bg-primary/5"
                                : "hover:bg-muted/50"
                            )}
                            onClick={() => handleTemplateSelect(template)}
                          >
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <CardTitle className="text-base font-medium line-clamp-2 break-words">
                                    {template.name}
                                  </CardTitle>
                                  <div className="flex items-center gap-2 mt-2">
                                    <Badge variant="outline" className="text-xs shrink-0">
                                      {getCategoryLabel(template.category)}
                                    </Badge>
                                  </div>
                                </div>
                                {selectedTemplate?.id === template.id && (
                                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                                )}
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                              {template.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2 mb-3 break-words">
                                  {template.description}
                                </p>
                              )}
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>{template.stats.column_count} colunas</span>
                                <span>{template.stats.task_count} tarefas</span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                    </TabsContent>
                  </div>
                </div>
              </Tabs>
            )}
          </div>

          {/* Footer - Fixed at bottom */}
          <div className="flex-shrink-0 px-6 py-4 border-t bg-background/95 backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <Button
                variant="outline"
                onClick={onCreateBlank}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Criar Projeto em Branco
              </Button>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirmSelection}
                  disabled={!selectedTemplate}
                  className="flex items-center gap-2"
                >
                  {selectedTemplate ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Usar "{selectedTemplate.name}"
                    </>
                  ) : (
                    'Selecione um Template'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div> {/* FIM DA DIV MASTER DO MODAL */}
      </DialogContent> {/* FIM DA DIV MASTER REAL DO MODAL */}
    </Dialog>
  );
}