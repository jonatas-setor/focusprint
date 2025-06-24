'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Users, FolderOpen, Edit, Save } from 'lucide-react';

const TEAM_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#84CC16', // Lime
  '#EC4899', // Pink
  '#6B7280', // Gray
];

interface Team {
  id: string;
  name: string;
  description?: string;
  color: string;
  member_count: number;
  project_count: number;
  created_at: string;
  created_by: string;
}

export default function TeamDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: TEAM_COLORS[0],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchTeam();
  }, [params.id]);

  const fetchTeam = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/client/teams/${params.id}`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar time');
      }

      const data = await response.json();
      setTeam(data.team);
      setFormData({
        name: data.team.name,
        description: data.team.description || '',
        color: data.team.color,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setErrors({});

    try {
      const response = await fetch(`/api/client/teams/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.details) {
          const validationErrors: Record<string, string> = {};
          data.details.forEach((error: any) => {
            validationErrors[error.path[0]] = error.message;
          });
          setErrors(validationErrors);
        } else {
          setErrors({ general: data.error || 'Erro ao atualizar time' });
        }
        return;
      }

      // Update local state
      setTeam(data.team);
      setEditing(false);
    } catch (error) {
      setErrors({ general: 'Erro de conexão. Tente novamente.' });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/teams">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
          <div>
            <div className="h-8 bg-muted rounded w-48 animate-pulse"></div>
            <div className="h-4 bg-muted rounded w-32 mt-2 animate-pulse"></div>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-full"></div>
              <div className="h-4 bg-muted rounded w-2/3"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/teams">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Erro</h1>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-destructive">{error}</p>
              <Button 
                variant="outline" 
                onClick={fetchTeam}
                className="mt-4"
              >
                Tentar novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/teams">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Time não encontrado</h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/teams">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <div 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: team.color }}
              />
              <h1 className="text-3xl font-bold tracking-tight">{team.name}</h1>
            </div>
            <p className="text-muted-foreground">
              Detalhes e configurações do time
            </p>
          </div>
        </div>
        
        {!editing ? (
          <Button onClick={() => setEditing(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Salvar
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setEditing(false);
                setFormData({
                  name: team.name,
                  description: team.description || '',
                  color: team.color,
                });
                setErrors({});
              }}
            >
              Cancelar
            </Button>
          </div>
        )}
      </div>

      {/* Team Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Membros</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{team.member_count}</div>
            <p className="text-xs text-muted-foreground">
              Membros ativos no time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projetos</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{team.project_count}</div>
            <p className="text-xs text-muted-foreground">
              Projetos associados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Team Details */}
      <Card>
        <CardHeader>
          <CardTitle>Informações do Time</CardTitle>
          <CardDescription>
            {editing ? 'Edite as informações do time' : 'Detalhes e configurações do time'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* General Error */}
          {errors.general && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
              {errors.general}
            </div>
          )}

          {editing ? (
            <>
              {/* Edit Form */}
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Time *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={errors.name ? 'border-destructive' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                  className={errors.description ? 'border-destructive' : ''}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Cor do Time</Label>
                <div className="flex flex-wrap gap-2">
                  {TEAM_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => handleInputChange('color', color)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        formData.color === color 
                          ? 'border-foreground scale-110' 
                          : 'border-muted hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* View Mode */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Nome</Label>
                  <p className="mt-1">{team.name}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Cor</Label>
                  <div className="mt-1 flex items-center space-x-2">
                    <div 
                      className="w-4 h-4 rounded-full border"
                      style={{ backgroundColor: team.color }}
                    />
                    <span className="text-sm">{team.color}</span>
                  </div>
                </div>
              </div>

              {team.description && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Descrição</Label>
                  <p className="mt-1">{team.description}</p>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Criado em</Label>
                <p className="mt-1">{new Date(team.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
