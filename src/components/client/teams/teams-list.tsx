'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  FolderOpen, 
  MoreHorizontal,
  Edit,
  Trash2,
  Calendar
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

interface TeamsResponse {
  teams: Team[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export function TeamsList() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/client/teams');
      
      if (!response.ok) {
        throw new Error('Erro ao carregar times');
      }

      const data: TeamsResponse = await response.json();
      setTeams(data.teams);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('Tem certeza que deseja excluir este time?')) {
      return;
    }

    try {
      const response = await fetch(`/api/client/teams/${teamId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao excluir time');
      }

      // Remove team from list
      setTeams(teams.filter(team => team.id !== teamId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao excluir time');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-lg font-medium">Times (carregando...)</div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="h-4 bg-muted rounded w-24"></div>
                  <div className="h-8 w-8 bg-muted rounded"></div>
                </div>
                <div className="h-3 bg-muted rounded w-32"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded w-full"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-destructive">{error}</p>
            <Button 
              variant="outline" 
              onClick={fetchTeams}
              className="mt-4"
            >
              Tentar novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (teams.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Users className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">Nenhum time encontrado</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Comece criando seu primeiro time para organizar sua equipe.
            </p>
            <Link href="/dashboard/teams/new">
              <Button className="mt-4">
                <Users className="mr-2 h-4 w-4" />
                Criar primeiro time
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">
          Times ({teams.length})
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => (
          <Card key={team.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: team.color }}
                  />
                  <CardTitle className="text-lg">{team.name}</CardTitle>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/teams/${team.id}`}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDeleteTeam(team.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {team.description && (
                <CardDescription>{team.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{team.member_count} membros</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                    <span>{team.project_count} projetos</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      Criado em {new Date(team.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <Link href={`/dashboard/teams/${team.id}`}>
                    <Button variant="outline" size="sm" className="w-full">
                      Ver detalhes
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
