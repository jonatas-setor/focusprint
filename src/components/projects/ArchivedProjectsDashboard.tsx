'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  Filter, 
  Archive, 
  RotateCcw, 
  Trash2, 
  Calendar,
  Users,
  CheckSquare,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ArchivedProject {
  id: string;
  name: string;
  description?: string;
  status: string;
  priority: string;
  start_date?: string;
  end_date?: string;
  color: string;
  created_at: string;
  deleted_at?: string;
  deleted_by?: string;
  archived_at?: string;
  archived_by?: string;
  archive_reason?: string;
  archive_metadata?: {
    original_status?: string;
    archive_category?: string;
    retention_period?: number;
    total_tasks?: number;
    completed_tasks?: number;
    team_members?: number;
  };
  teams: {
    id: string;
    name: string;
  };
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

interface ArchivedProjectsDashboardProps {
  onRestoreProject?: (projectId: string) => Promise<void>;
  onBulkRestore?: (projectIds: string[]) => Promise<void>;
}

export function ArchivedProjectsDashboard({
  onRestoreProject,
  onBulkRestore
}: ArchivedProjectsDashboardProps) {
  const [projects, setProjects] = useState<ArchivedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [archiveCategoryFilter, setArchiveCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('deleted_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
    has_next: false,
    has_prev: false
  });

  const fetchArchivedProjects = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        search: searchTerm,
        category: categoryFilter,
        archive_category: archiveCategoryFilter,
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sort_by: sortBy,
        sort_order: sortOrder
      });

      const response = await fetch(`/api/client/projects/deleted?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch archived projects');
      }

      const data = await response.json();
      setProjects(data.projects || []);
      setPagination(data.pagination || pagination);
      
    } catch (error) {
      console.error('Error fetching archived projects:', error);
      toast.error('Erro ao carregar projetos arquivados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchivedProjects();
  }, [searchTerm, categoryFilter, archiveCategoryFilter, sortBy, sortOrder, pagination.page]);

  const handleSelectProject = (projectId: string, checked: boolean) => {
    if (checked) {
      setSelectedProjects(prev => [...prev, projectId]);
    } else {
      setSelectedProjects(prev => prev.filter(id => id !== projectId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProjects(projects.map(p => p.id));
    } else {
      setSelectedProjects([]);
    }
  };

  const handleRestoreProject = async (projectId: string) => {
    try {
      if (onRestoreProject) {
        await onRestoreProject(projectId);
        toast.success('Projeto restaurado com sucesso');
        fetchArchivedProjects();
        setSelectedProjects(prev => prev.filter(id => id !== projectId));
      }
    } catch (error) {
      console.error('Error restoring project:', error);
      toast.error('Erro ao restaurar projeto');
    }
  };

  const handleBulkRestore = async () => {
    if (selectedProjects.length === 0) {
      toast.error('Selecione pelo menos um projeto para restaurar');
      return;
    }

    try {
      if (onBulkRestore) {
        await onBulkRestore(selectedProjects);
        toast.success(`${selectedProjects.length} projeto(s) restaurado(s) com sucesso`);
        fetchArchivedProjects();
        setSelectedProjects([]);
      }
    } catch (error) {
      console.error('Error bulk restoring projects:', error);
      toast.error('Erro ao restaurar projetos em lote');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };

  const getArchiveTypeLabel = (project: ArchivedProject) => {
    if (project.archived_at) return 'Arquivado';
    if (project.deleted_at) return 'Excluído';
    return 'Desconhecido';
  };

  const getArchiveDate = (project: ArchivedProject) => {
    return project.archived_at || project.deleted_at;
  };

  const getCategoryBadgeColor = (category?: string) => {
    switch (category) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800';
      case 'outdated': return 'bg-gray-100 text-gray-800';
      case 'duplicate': return 'bg-purple-100 text-purple-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Projetos Arquivados</h2>
          <p className="text-gray-600">
            Gerencie projetos arquivados e excluídos
          </p>
        </div>
        <Button onClick={fetchArchivedProjects} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar projetos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="archived">Arquivados</SelectItem>
                <SelectItem value="deleted">Excluídos</SelectItem>
              </SelectContent>
            </Select>

            <Select value={archiveCategoryFilter} onValueChange={setArchiveCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Categorias</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
                <SelectItem value="on_hold">Em Espera</SelectItem>
                <SelectItem value="outdated">Desatualizado</SelectItem>
                <SelectItem value="duplicate">Duplicado</SelectItem>
                <SelectItem value="general">Geral</SelectItem>
              </SelectContent>
            </Select>

            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
              const [field, order] = value.split('-');
              setSortBy(field);
              setSortOrder(order);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deleted_at-desc">Data (Mais Recente)</SelectItem>
                <SelectItem value="deleted_at-asc">Data (Mais Antigo)</SelectItem>
                <SelectItem value="name-asc">Nome (A-Z)</SelectItem>
                <SelectItem value="name-desc">Nome (Z-A)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedProjects.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedProjects.length} projeto(s) selecionado(s)
              </span>
              <div className="flex gap-2">
                <Button onClick={handleBulkRestore} size="sm">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restaurar Selecionados
                </Button>
                <Button 
                  onClick={() => setSelectedProjects([])} 
                  variant="outline" 
                  size="sm"
                >
                  Limpar Seleção
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Projects List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5" />
              Projetos ({pagination.total})
            </CardTitle>
            {projects.length > 0 && (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedProjects.length === projects.length}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-gray-600">Selecionar todos</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Carregando...</span>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Archive className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum projeto arquivado encontrado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {projects.map((project) => (
                <div key={project.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={selectedProjects.includes(project.id)}
                      onCheckedChange={(checked) => handleSelectProject(project.id, checked as boolean)}
                    />
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{project.name}</h3>
                          <Badge variant="outline">
                            {getArchiveTypeLabel(project)}
                          </Badge>
                          {project.archive_metadata?.archive_category && (
                            <Badge className={getCategoryBadgeColor(project.archive_metadata.archive_category)}>
                              {project.archive_metadata.archive_category}
                            </Badge>
                          )}
                        </div>
                        <Button
                          onClick={() => handleRestoreProject(project.id)}
                          size="sm"
                          variant="outline"
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Restaurar
                        </Button>
                      </div>

                      {project.description && (
                        <p className="text-sm text-gray-600">{project.description}</p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(getArchiveDate(project))}
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckSquare className="h-3 w-3" />
                          {project.archive_metadata?.total_tasks || 0} tarefas
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {project.archive_metadata?.team_members || 0} membros
                        </span>
                      </div>

                      {project.archive_reason && (
                        <div className="text-sm">
                          <span className="font-medium">Motivo: </span>
                          <span className="text-gray-600">{project.archive_reason}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Mostrando {((pagination.page - 1) * pagination.limit) + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} projetos
          </p>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={!pagination.has_prev}
              variant="outline"
              size="sm"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <span className="text-sm">
              Página {pagination.page} de {pagination.total_pages}
            </span>
            <Button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={!pagination.has_next}
              variant="outline"
              size="sm"
            >
              Próxima
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
