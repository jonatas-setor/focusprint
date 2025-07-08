'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Sparkles, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';

interface Project {
  id: string;
  name: string;
  description?: string;
  status?: string;
  priority?: string;
  team_id?: string;
}

interface SaveAsTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  onSuccess?: () => void;
}

interface TemplateFormData {
  name: string;
  description: string;
  category: string;
  template_type: 'personal' | 'team';
  include_tasks: boolean;
  include_task_assignments: boolean;
  include_due_dates: boolean;
  include_attachments: boolean;
}

const DEFAULT_TEMPLATE_CATEGORIES = [
  { value: 'desenvolvimento', label: 'Desenvolvimento' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'vendas', label: 'Vendas' },
  { value: 'atendimento', label: 'Atendimento' },
  { value: 'eventos', label: 'Eventos' },
  { value: 'planejamento', label: 'Planejamento' },
  { value: 'outros', label: 'Outros' },
];

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

export default function SaveAsTemplateModal({
  isOpen,
  onClose,
  project,
  onSuccess
}: SaveAsTemplateModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>({
    name: project ? `Template: ${project.name}` : '',
    description: project ? `Template criado a partir do projeto ${project.name}` : '',
    category: 'outros',
    template_type: 'personal',
    include_tasks: true,
    include_task_assignments: false,
    include_due_dates: false,
    include_attachments: true,
  });

  // Load user permissions when modal opens
  useEffect(() => {
    if (isOpen) {
      loadPermissions();
    }
  }, [isOpen]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!project) return;

    setIsLoading(true);

    try {
      console.log('🎨 [SAVE AS TEMPLATE] Creating template from project:', {
        projectId: project.id,
        templateData: formData
      });

      const response = await fetch(`/api/client/projects/${project.id}/save-as-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create template');
      }

      toast.success('Template criado com sucesso!', {
        description: `O template "${formData.name}" foi criado e está disponível para uso.`,
        duration: 5000,
      });

      onSuccess?.();
      onClose();
      
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Erro ao criar template', {
        description: 'Ocorreu um erro ao tentar criar o template. Tente novamente.',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof TemplateFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!project) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Salvar como Template
          </DialogTitle>
          <DialogDescription>
            Crie um template personalizado baseado no projeto "{project.name}" para reutilizar em futuros projetos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Informações Básicas</h3>
            
            <div className="space-y-2">
              <Label htmlFor="template-name">Nome do Template *</Label>
              <Input
                id="template-name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Ex: Template de Desenvolvimento Web"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-description">Descrição</Label>
              <Textarea
                id="template-description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Descreva quando e como usar este template..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="template-category">Categoria</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => handleInputChange('category', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {(permissions?.categories || DEFAULT_TEMPLATE_CATEGORIES.map(c => c.value)).map((category) => (
                      <SelectItem key={category} value={category}>
                        {DEFAULT_TEMPLATE_CATEGORIES.find(c => c.value === category)?.label || category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="template-type">Tipo de Template</Label>
                <Select
                  value={formData.template_type}
                  onValueChange={(value: 'personal' | 'team') => handleInputChange('template_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {permissions?.templateTypes
                      .filter(type => type.canCreate)
                      .map((type) => (
                        <SelectItem key={type.type} value={type.type}>
                          {type.label}
                        </SelectItem>
                      )) || (
                        <>
                          <SelectItem value="personal">Pessoal (só você)</SelectItem>
                          {project.team_id && (
                            <SelectItem value="team">Equipe (toda a equipe)</SelectItem>
                          )}
                        </>
                      )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Include Options */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">O que incluir no template?</h3>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-tasks"
                  checked={formData.include_tasks}
                  onCheckedChange={(checked) => handleInputChange('include_tasks', checked)}
                />
                <Label htmlFor="include-tasks" className="text-sm font-normal">
                  Incluir tarefas como exemplos
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-assignments"
                  checked={formData.include_task_assignments}
                  onCheckedChange={(checked) => handleInputChange('include_task_assignments', checked)}
                />
                <Label htmlFor="include-assignments" className="text-sm font-normal">
                  Manter responsáveis das tarefas
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-dates"
                  checked={formData.include_due_dates}
                  onCheckedChange={(checked) => handleInputChange('include_due_dates', checked)}
                />
                <Label htmlFor="include-dates" className="text-sm font-normal">
                  Manter datas de vencimento (relativas)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-attachments"
                  checked={formData.include_attachments}
                  onCheckedChange={(checked) => handleInputChange('include_attachments', checked)}
                />
                <Label htmlFor="include-attachments" className="text-sm font-normal">
                  Incluir anexos das tarefas
                </Label>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Dica:</p>
                  <p>Templates pessoais ficam disponíveis apenas para você. Templates de equipe podem ser usados por todos os membros da equipe.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
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
              disabled={isLoading || !formData.name.trim()}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Criando Template...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Criar Template
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
