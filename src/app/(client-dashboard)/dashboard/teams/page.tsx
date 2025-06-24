import { Suspense } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Users, 
  FolderOpen, 
  Search,
  MoreHorizontal,
  Edit,
  Trash2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TeamsList } from '@/components/client/teams/teams-list';

export default function TeamsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Times</h1>
          <p className="text-muted-foreground">
            Gerencie os times da sua organização
          </p>
        </div>
        <Link href="/dashboard/teams/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Time
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Use os filtros abaixo para encontrar times específicos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome..."
                  className="pl-8"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Teams List */}
      <Suspense fallback={<TeamsListSkeleton />}>
        <TeamsList />
      </Suspense>
    </div>
  );
}

// Loading skeleton component
function TeamsListSkeleton() {
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
