'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';

interface Team {
  id: string;
  name: string;
  description?: string;
}

interface CreateTeamTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  sourceTemplateId?: string;
  sourceTemplateName?: string;
}

interface TemplateFormData {
  name: string;
  description: string;
  category: string;
  team_id: string;
}

const TEMPLATE_CATEGORIES = [
  { value: 'desenvolvimento', label: 'Desenvolvimento' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'vendas', label: 'Vendas' },
  { value: 'atendimento', label: 'Atendimento' },
  { value: 'eventos', label: 'Eventos' },
  { value: 'planejamento', label: 'Planejamento' },
  { value: 'outros', label: 'Outros' },
];

export default function CreateTeamTemplateModal({
  isOpen,
  onClose,
  onSuccess,
  sourceTemplateId,
  sourceTemplateName
}: CreateTeamTemplateModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [formData, setFormData] = useState<TemplateFormData>({
    name: sourceTemplateName ? `Template de Equipe: ${sourceTemplateName}` : '',
    description: sourceTemplateName ? `Template de equipe baseado em ${sourceTemplateName}` : '',
    category: 'outros',
    team_id: '',
  });

  // Load user's teams when modal opens
  useEffect(() => {
    if (isOpen) {
      loadTeams();
    }
  }, [isOpen]);

  const loadTeams = async () => {
    try {
      const response = await fetch('/api/client/templates/permissions');
      if (response.ok) {
        const data = await response.json();
        setTeams(data.permissions.teams || []);
      }
    } catch (error) {
      console.error('Error loading teams:', error);
      toast.error('Erro ao carregar equipes');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sourceTemplateId) {
      toast.error('Template de origem não especificado');
      return;
    }

    setIsLoading(true);

    try {
      console.log('👥 [CREATE TEAM TEMPLATE] Creating team template:', {
        sourceTemplateId,
        formData
      });

      const response = await fetch(`/api/client/project-templates/${sourceTemplateId}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          template_type: 'team'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create team template');
      }

      toast.success('Template de equipe criado com sucesso!', {
        description: `O template "${formData.name}" está disponível para toda a equipe.`,
        duration: 5000,
      });

      onSuccess?.();
      onClose();
      
    } catch (error) {
      console.error('Error creating team template:', error);
      toast.error('Erro ao criar template de equipe', {
        description: error instanceof Error ? error.message : 'Ocorreu um erro inesperado.',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof TemplateFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-600" />
            Criar Template de Equipe
          </DialogTitle>
          <DialogDescription>
            Crie um template que poderá ser usado por todos os membros da equipe selecionada.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="team-template-name">Nome do Template *</Label>
              <Input
                id="team-template-name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Ex: Template de Sprint da Equipe"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="team-template-description">Descrição</Label>
              <Textarea
                id="team-template-description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Descreva quando e como a equipe deve usar este template..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="team-template-category">Categoria</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => handleInputChange('category', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_CATEGORIES.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="team-template-team">Equipe *</Label>
                <Select
                  value={formData.team_id}
                  onValueChange={(value) => handleInputChange('team_id', value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a equipe" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Sobre Templates de Equipe:</p>
                <ul className="mt-1 space-y-1 text-xs">
                  <li>• Todos os membros da equipe poderão usar este template</li>
                  <li>• Apenas membros da equipe podem ver e clonar o template</li>
                  <li>• Você poderá editar e gerenciar este template</li>
                </ul>
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
              disabled={isLoading || !formData.name.trim() || !formData.team_id}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Criando Template...
                </>
              ) : (
                <>
                  <Users className="h-4 w-4" />
                  Criar Template de Equipe
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
