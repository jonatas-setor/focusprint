'use client';

import { useState, useEffect } from 'react';
import { Copy, Settings, Users, CheckSquare, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  priority: string;
  team_id?: string;
}

interface CloneOptions {
  new_project_name: string;
  include_tasks: boolean;
  include_members: boolean;
  include_settings: boolean;
}

interface CloneProjectModalProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onClone: (options: CloneOptions) => Promise<void>;
  isLoading?: boolean;
}

export default function CloneProjectModal({
  project,
  isOpen,
  onClose,
  onClone,
  isLoading = false
}: CloneProjectModalProps) {
  const [cloneOptions, setCloneOptions] = useState<CloneOptions>({
    new_project_name: '',
    include_tasks: true,
    include_members: true,
    include_settings: true
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Reset form when modal opens/closes or project changes
  useEffect(() => {
    if (isOpen && project) {
      setCloneOptions({
        new_project_name: `Cópia de ${project.name}`,
        include_tasks: true,
        include_members: true,
        include_settings: true
      });
      setErrors({});
    }
  }, [isOpen, project]);

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!cloneOptions.new_project_name.trim()) {
      newErrors.new_project_name = 'Nome do projeto é obrigatório';
    } else if (cloneOptions.new_project_name.trim().length < 3) {
      newErrors.new_project_name = 'Nome deve ter pelo menos 3 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onClone({
        ...cloneOptions,
        new_project_name: cloneOptions.new_project_name.trim()
      });
    } catch (error) {
      console.error('Error cloning project:', error);
    }
  };

  const updateCloneOption = <K extends keyof CloneOptions>(
    key: K,
    value: CloneOptions[K]
  ) => {
    setCloneOptions(prev => ({ ...prev, [key]: value }));
    // Clear error when user starts typing
    if (key === 'new_project_name' && errors[key]) {
      setErrors(prev => ({ ...prev, [key]: '' }));
    }
  };

  if (!project) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Clonar Projeto
          </DialogTitle>
          <DialogDescription>
            Crie uma cópia do projeto "{project.name}" com as opções selecionadas abaixo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Project Name Input */}
          <div className="space-y-2">
            <Label htmlFor="project-name">Nome do Novo Projeto *</Label>
            <Input
              id="project-name"
              value={cloneOptions.new_project_name}
              onChange={(e) => updateCloneOption('new_project_name', e.target.value)}
              placeholder="Digite o nome do projeto clonado"
              className={errors.new_project_name ? 'border-red-500' : ''}
              disabled={isLoading}
            />
            {errors.new_project_name && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.new_project_name}
              </p>
            )}
          </div>

          {/* Clone Options */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Opções de Clonagem</Label>
            
            <div className="grid gap-4">
              {/* Include Tasks Option */}
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="include-tasks"
                      checked={cloneOptions.include_tasks}
                      onCheckedChange={(checked) => 
                        updateCloneOption('include_tasks', checked as boolean)
                      }
                      disabled={isLoading}
                    />
                    <div className="flex items-center gap-2">
                      <CheckSquare className="h-4 w-4 text-blue-600" />
                      <CardTitle className="text-sm">Incluir Tarefas Modelo</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription className="text-xs">
                    Copia todas as tarefas marcadas como "modelo" ou "exemplo" do projeto original
                  </CardDescription>
                </CardContent>
              </Card>

              {/* Include Members Option */}
              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="include-members"
                      checked={cloneOptions.include_members}
                      onCheckedChange={(checked) => 
                        updateCloneOption('include_members', checked as boolean)
                      }
                      disabled={isLoading}
                    />
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-green-600" />
                      <CardTitle className="text-sm">Incluir Membros da Equipe</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription className="text-xs">
                    Mantém a mesma equipe e atribuições de membros do projeto original
                  </CardDescription>
                </CardContent>
              </Card>

              {/* Include Settings Option */}
              <Card className="border-l-4 border-l-purple-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="include-settings"
                      checked={cloneOptions.include_settings}
                      onCheckedChange={(checked) => 
                        updateCloneOption('include_settings', checked as boolean)
                      }
                      disabled={isLoading}
                    />
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4 text-purple-600" />
                      <CardTitle className="text-sm">Incluir Configurações</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription className="text-xs">
                    Copia colunas do Kanban, cores, prioridades e outras configurações do projeto
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Preview Section */}
          <Card className="bg-gray-50">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Copy className="h-4 w-4" />
                Prévia da Clonagem
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Projeto Original:</span>
                <Badge variant="outline">{project.name}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Novo Projeto:</span>
                <Badge>{cloneOptions.new_project_name || 'Nome não definido'}</Badge>
              </div>
              <div className="pt-2 border-t">
                <div className="text-xs text-gray-500 space-y-1">
                  <div>✓ Colunas do Kanban serão copiadas</div>
                  {cloneOptions.include_tasks && <div>✓ Tarefas modelo serão copiadas</div>}
                  {cloneOptions.include_members && <div>✓ Membros da equipe serão mantidos</div>}
                  {cloneOptions.include_settings && <div>✓ Configurações serão copiadas</div>}
                </div>
              </div>
            </CardContent>
          </Card>

          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !cloneOptions.new_project_name.trim()}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Clonando...
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Clonar Projeto
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
