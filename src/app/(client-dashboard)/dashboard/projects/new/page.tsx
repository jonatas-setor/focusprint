'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ProjectForm from '@/components/client/projects/project-form';
import TemplateSelectionModal from '@/components/client/projects/template-selection-modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface ProjectFormData {
  name: string;
  description: string;
  team_id: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  start_date?: Date;
  end_date?: Date;
}

export default function NewProjectPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<{ id: string; name: string } | null>(null);
  const router = useRouter();

  const handleSubmit = async (data: ProjectFormData) => {
    try {
      setIsLoading(true);

      const requestBody = {
        ...data,
        start_date: data.start_date?.toISOString().split('T')[0],
        end_date: data.end_date?.toISOString().split('T')[0],
        ...(selectedTemplate && { template_id: selectedTemplate.id })
      };

      const response = await fetch('/api/client/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar projeto');
      }

      const successMessage = selectedTemplate
        ? `Projeto criado com sucesso usando o template "${selectedTemplate.name}"!`
        : 'Projeto criado com sucesso!';

      toast.success(successMessage);
      router.push('/dashboard/projects');
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao criar projeto');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (showProjectForm) {
      setShowProjectForm(false);
      setSelectedTemplate(null);
    } else {
      router.push('/dashboard/projects');
    }
  };

  const handleTemplateSelect = (templateId: string, templateName: string) => {
    setSelectedTemplate({ id: templateId, name: templateName });
    setShowTemplateModal(false);
    setShowProjectForm(true);
  };

  const handleCreateBlank = () => {
    setSelectedTemplate(null);
    setShowTemplateModal(false);
    setShowProjectForm(true);
  };

  const handleStartFromTemplate = () => {
    setShowTemplateModal(true);
  };

  // Show project creation options if no form is displayed
  if (!showProjectForm) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Criar Novo Projeto</h1>
            <p className="text-muted-foreground">
              Escolha como você gostaria de começar seu novo projeto
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Template Option */}
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Usar Template</CardTitle>
                <CardDescription>
                  Acelere a criação usando templates pré-configurados com colunas e tarefas de exemplo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleStartFromTemplate}
                  className="w-full"
                  size="lg"
                >
                  Escolher Template
                </Button>
              </CardContent>
            </Card>

            {/* Blank Project Option */}
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 bg-muted rounded-full w-fit">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <CardTitle>Projeto em Branco</CardTitle>
                <CardDescription>
                  Comece do zero com um projeto vazio e configure tudo do seu jeito
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleCreateBlank}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  Criar em Branco
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-8">
            <Button variant="ghost" onClick={() => router.push('/dashboard/projects')}>
              Voltar para Projetos
            </Button>
          </div>
        </div>

        {/* Template Selection Modal */}
        <TemplateSelectionModal
          isOpen={showTemplateModal}
          onClose={() => setShowTemplateModal(false)}
          onSelectTemplate={handleTemplateSelect}
          onCreateBlank={handleCreateBlank}
        />
      </div>
    );
  }

  // Show project form
  return (
    <div className="container mx-auto py-8">
      {selectedTemplate && (
        <div className="max-w-2xl mx-auto mb-6">
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                Criando projeto usando o template: <strong>{selectedTemplate.name}</strong>
              </span>
            </div>
          </div>
        </div>
      )}

      <ProjectForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isLoading}
        submitLabel={selectedTemplate ? "Criar Projeto com Template" : "Criar Projeto"}
      />
    </div>
  );
}
