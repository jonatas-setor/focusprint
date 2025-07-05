'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Archive, Calendar, Users, CheckSquare, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

interface ProjectSummary {
  id: string;
  name: string;
  status: string;
  task_count?: number;
  member_count?: number;
  message_count?: number;
  created_at?: string;
}

interface ArchiveConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (archiveData: ArchiveData) => Promise<void>;
  projects: ProjectSummary[];
  isLoading?: boolean;
}

interface ArchiveData {
  archive_reason: string;
  archive_category: string;
  retention_period: number;
}

const ARCHIVE_CATEGORIES = [
  { value: 'completed', label: 'Projeto Concluído', description: 'Projeto finalizado com sucesso' },
  { value: 'cancelled', label: 'Projeto Cancelado', description: 'Projeto cancelado ou interrompido' },
  { value: 'on_hold', label: 'Em Espera', description: 'Projeto pausado temporariamente' },
  { value: 'outdated', label: 'Desatualizado', description: 'Projeto não é mais relevante' },
  { value: 'duplicate', label: 'Duplicado', description: 'Projeto duplicado ou redundante' },
  { value: 'general', label: 'Geral', description: 'Arquivamento geral' }
];

const RETENTION_PERIODS = [
  { value: 90, label: '3 meses' },
  { value: 180, label: '6 meses' },
  { value: 365, label: '1 ano (padrão)' },
  { value: 730, label: '2 anos' },
  { value: 1825, label: '5 anos' },
  { value: 2555, label: '7 anos (máximo)' }
];

export function ArchiveConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  projects,
  isLoading = false
}: ArchiveConfirmationModalProps) {
  const [archiveReason, setArchiveReason] = useState('');
  const [archiveCategory, setArchiveCategory] = useState('general');
  const [retentionPeriod, setRetentionPeriod] = useState(365);

  const handleSubmit = async () => {
    if (!archiveReason.trim()) {
      toast.error('Por favor, informe o motivo do arquivamento');
      return;
    }

    if (archiveReason.length > 500) {
      toast.error('O motivo do arquivamento deve ter no máximo 500 caracteres');
      return;
    }

    try {
      await onConfirm({
        archive_reason: archiveReason.trim(),
        archive_category: archiveCategory,
        retention_period: retentionPeriod
      });
      
      // Reset form
      setArchiveReason('');
      setArchiveCategory('general');
      setRetentionPeriod(365);
    } catch (error) {
      console.error('Error archiving projects:', error);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setArchiveReason('');
      setArchiveCategory('general');
      setRetentionPeriod(365);
      onClose();
    }
  };

  const selectedCategory = ARCHIVE_CATEGORIES.find(cat => cat.value === archiveCategory);
  const selectedRetention = RETENTION_PERIODS.find(period => period.value === retentionPeriod);

  const totalTasks = projects.reduce((sum, project) => sum + (project.task_count || 0), 0);
  const totalMembers = projects.reduce((sum, project) => sum + (project.member_count || 0), 0);
  const totalMessages = projects.reduce((sum, project) => sum + (project.message_count || 0), 0);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-orange-500" />
            Arquivar {projects.length === 1 ? 'Projeto' : `${projects.length} Projetos`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Warning */}
          <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-orange-800 mb-1">
                Atenção: Esta ação arquivará {projects.length === 1 ? 'o projeto' : 'os projetos'} selecionado{projects.length === 1 ? '' : 's'}
              </p>
              <p className="text-orange-700">
                {projects.length === 1 ? 'O projeto' : 'Os projetos'} poderá{projects.length === 1 ? '' : 'ão'} ser restaurado{projects.length === 1 ? '' : 's'} 
                durante o período de retenção configurado.
              </p>
            </div>
          </div>

          {/* Projects Summary */}
          <div className="space-y-3">
            <Label className="text-base font-medium">
              {projects.length === 1 ? 'Projeto a ser arquivado:' : 'Projetos a serem arquivados:'}
            </Label>
            <div className="max-h-32 overflow-y-auto space-y-2 border rounded-lg p-3 bg-gray-50">
              {projects.map((project) => (
                <div key={project.id} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">{project.name}</span>
                    <Badge variant="outline" className="ml-2 text-xs">
                      {project.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Impact Preview */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                <CheckSquare className="h-4 w-4" />
                <span className="text-lg font-semibold">{totalTasks}</span>
              </div>
              <p className="text-xs text-gray-600">Tarefas</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                <Users className="h-4 w-4" />
                <span className="text-lg font-semibold">{totalMembers}</span>
              </div>
              <p className="text-xs text-gray-600">Membros</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-purple-600 mb-1">
                <MessageSquare className="h-4 w-4" />
                <span className="text-lg font-semibold">{totalMessages}</span>
              </div>
              <p className="text-xs text-gray-600">Mensagens</p>
            </div>
          </div>

          <Separator />

          {/* Archive Category */}
          <div className="space-y-2">
            <Label htmlFor="archive-category">Categoria do Arquivamento</Label>
            <Select value={archiveCategory} onValueChange={setArchiveCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ARCHIVE_CATEGORIES.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    <div>
                      <div className="font-medium">{category.label}</div>
                      <div className="text-xs text-gray-500">{category.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCategory && (
              <p className="text-xs text-gray-600">{selectedCategory.description}</p>
            )}
          </div>

          {/* Archive Reason */}
          <div className="space-y-2">
            <Label htmlFor="archive-reason">
              Motivo do Arquivamento <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="archive-reason"
              placeholder="Descreva o motivo do arquivamento..."
              value={archiveReason}
              onChange={(e) => setArchiveReason(e.target.value)}
              maxLength={500}
              rows={3}
              className="resize-none"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Campo obrigatório</span>
              <span>{archiveReason.length}/500</span>
            </div>
          </div>

          {/* Retention Period */}
          <div className="space-y-2">
            <Label htmlFor="retention-period" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Período de Retenção
            </Label>
            <Select value={retentionPeriod.toString()} onValueChange={(value) => setRetentionPeriod(parseInt(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RETENTION_PERIODS.map((period) => (
                  <SelectItem key={period.value} value={period.value.toString()}>
                    {period.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-600">
              {projects.length === 1 ? 'O projeto' : 'Os projetos'} será{projects.length === 1 ? '' : 'ão'} automaticamente 
              excluído{projects.length === 1 ? '' : 's'} após {selectedRetention?.label.toLowerCase()} se não for{projects.length === 1 ? '' : 'em'} restaurado{projects.length === 1 ? '' : 's'}.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading || !archiveReason.trim()}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isLoading ? 'Arquivando...' : `Arquivar ${projects.length === 1 ? 'Projeto' : 'Projetos'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
