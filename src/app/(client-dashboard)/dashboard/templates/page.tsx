'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Sparkles, Edit, Trash2, Copy, Eye, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import CreateTeamTemplateModal from '@/components/client/templates/create-team-template-modal';
import { toast } from 'sonner';

interface Template {
  id: string;
  name: string;
  description?: string;
  category: string;
  template_type: 'global' | 'personal' | 'team';
  is_active: boolean;
  created_by?: string;
  client_id?: string;
  team_id?: string;
  created_at: string;
  updated_at: string;
  column_count: number;
  task_count: number;
  stats?: {
    column_count: number;
    task_count: number;
    estimated_total_hours: number;
  };
}

interface UserPermissions {
  templateTypes: Array<{
    type: 'global' | 'personal' | 'team';
    label: string;
    description: string;
    canCreate: boolean;
  }>;
  categories: string[];
  teams: Array<{
    id: string;
    name: string;
    description?: string;
  }>;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'all' | 'personal' | 'team' | 'global'>('all');
  const [teamTemplateModalOpen, setTeamTemplateModalOpen] = useState(false);
  const [selectedTemplateForTeam, setSelectedTemplateForTeam] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    loadTemplates();
    loadPermissions();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/client/project-templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      } else {
        toast.error('Erro ao carregar templates');
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Erro ao carregar templates');
    } finally {
      setLoading(false);
    }
  };

  const loadPermissions = async () => {
    try {
      const response = await fetch('/api/client/templates/permissions');
      if (response.ok) {
        const data = await response.json();
        setPermissions(data.permissions);
      }
    } catch (error) {
      console.error('Error loading permissions:', error);
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesTab = activeTab === 'all' || template.template_type === activeTab;
    
    return matchesSearch && matchesCategory && matchesTab;
  });

  const getTemplateTypeColor = (type: string) => {
    switch (type) {
      case 'global': return 'bg-blue-100 text-blue-800';
      case 'personal': return 'bg-green-100 text-green-800';
      case 'team': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTemplateTypeLabel = (type: string) => {
    switch (type) {
      case 'global': return 'Global';
      case 'personal': return 'Pessoal';
      case 'team': return 'Equipe';
      default: return type;
    }
  };

  const handleDeleteTemplate = async (templateId: string, templateName: string) => {
    if (!confirm(`Tem certeza que deseja excluir o template "${templateName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/client/project-templates/${templateId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Template excluído com sucesso');
        loadTemplates();
      } else {
        toast.error('Erro ao excluir template');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Erro ao excluir template');
    }
  };

  const handleCloneTemplate = async (templateId: string, templateName: string) => {
    try {
      const response = await fetch(`/api/client/project-templates/${templateId}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Cópia de ${templateName}`,
          template_type: 'personal'
        })
      });

      if (response.ok) {
        toast.success('Template clonado com sucesso');
        loadTemplates();
      } else {
        toast.error('Erro ao clonar template');
      }
    } catch (error) {
      console.error('Error cloning template:', error);
      toast.error('Erro ao clonar template');
    }
  };

  const handleCreateTeamTemplate = (templateId: string, templateName: string) => {
    setSelectedTemplateForTeam({ id: templateId, name: templateName });
    setTeamTemplateModalOpen(true);
  };

  const handleTeamTemplateSuccess = () => {
    setTeamTemplateModalOpen(false);
    setSelectedTemplateForTeam(null);
    loadTemplates();
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando templates...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Meus Templates</h1>
          <p className="text-muted-foreground">
            Gerencie seus templates personalizados e explore templates disponíveis
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Criar Template
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {permissions?.categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="personal">Pessoais</TabsTrigger>
          <TabsTrigger value="team">Equipe</TabsTrigger>
          <TabsTrigger value="global">Globais</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum template encontrado</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || selectedCategory !== 'all' 
                  ? 'Tente ajustar os filtros de busca'
                  : 'Comece criando seu primeiro template personalizado'
                }
              </p>
              {!searchTerm && selectedCategory === 'all' && (
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Criar Primeiro Template
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map((template) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-1">{template.name}</CardTitle>
                        <CardDescription className="line-clamp-2">
                          {template.description || 'Sem descrição'}
                        </CardDescription>
                      </div>
                      <Badge className={getTemplateTypeColor(template.template_type)}>
                        {getTemplateTypeLabel(template.template_type)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                      <span>{template.column_count} colunas</span>
                      <span>{template.task_count} tarefas</span>
                      <span className="capitalize">{template.category}</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Visualizar template</p>
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCloneTemplate(template.id, template.name)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Clonar template</p>
                          </TooltipContent>
                        </Tooltip>

                        {permissions?.teams && permissions.teams.length > 0 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCreateTeamTemplate(template.id, template.name)}
                                className="text-purple-600 hover:text-purple-700"
                              >
                                <Users className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Criar template de equipe</p>
                            </TooltipContent>
                          </Tooltip>
                        )}

                        {template.template_type === 'personal' && (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Editar template</p>
                              </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleDeleteTemplate(template.id, template.name)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Excluir template</p>
                              </TooltipContent>
                            </Tooltip>
                          </>
                        )}
                      </TooltipProvider>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Team Template Modal */}
      <CreateTeamTemplateModal
        isOpen={teamTemplateModalOpen}
        onClose={() => setTeamTemplateModalOpen(false)}
        onSuccess={handleTeamTemplateSuccess}
        sourceTemplateId={selectedTemplateForTeam?.id}
        sourceTemplateName={selectedTemplateForTeam?.name}
      />
    </div>
  );
}
