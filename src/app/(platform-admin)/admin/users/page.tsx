'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Users, 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Shield,
  Calendar,
  Mail
} from 'lucide-react';
import { toast } from 'sonner';
import AdminUserForm from '@/components/admin/users/admin-user-form';
import { AdminRole } from '@/types/admin-permissions';

interface AdminUser {
  id: string;
  first_name: string;
  last_name: string;
  role: AdminRole;
  department: string;
  permissions: string[];
  hire_date: string | null;
  created_at: string;
  updated_at: string;
  auth: {
    email: string;
    created_at: string;
    last_sign_in_at: string | null;
  };
}

interface AdminUsersResponse {
  admins: AdminUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function AdminUsersPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  useEffect(() => {
    fetchAdmins();
  }, [currentPage, roleFilter, departmentFilter, searchTerm]);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10'
      });

      if (roleFilter !== 'all') params.append('role', roleFilter);
      if (departmentFilter !== 'all') params.append('department', departmentFilter);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/admin/users?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch admin users');
      }

      const data: AdminUsersResponse = await response.json();
      setAdmins(data.admins);
      setPagination(data.pagination);

    } catch (error) {
      console.error('Error fetching admins:', error);
      toast.error('Erro ao carregar usuários administrativos');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAdmin = async (admin: AdminUser) => {
    if (!confirm(`Tem certeza que deseja excluir o administrador ${admin.first_name} ${admin.last_name}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${admin.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete admin');
      }

      toast.success('Administrador excluído com sucesso');
      fetchAdmins();

    } catch (error) {
      console.error('Error deleting admin:', error);
      toast.error('Erro ao excluir administrador');
    }
  };

  const getRoleBadge = (role: AdminRole) => {
    const roleConfig = {
      super_admin: { label: 'Super Admin', variant: 'destructive' as const },
      operations_admin: { label: 'Operations', variant: 'default' as const },
      financial_admin: { label: 'Financial', variant: 'secondary' as const },
      technical_admin: { label: 'Technical', variant: 'outline' as const },
      support_admin: { label: 'Support', variant: 'secondary' as const }
    };

    const config = roleConfig[role] || { label: role, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatLastSignIn = (dateString: string | null) => {
    if (!dateString) return 'Nunca';
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Agora mesmo';
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Usuários Administrativos
          </h1>
          <p className="text-muted-foreground">
            Gerencie usuários administrativos da plataforma FocuSprint
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Administrador
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por cargo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os cargos</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="operations_admin">Operations Admin</SelectItem>
                  <SelectItem value="financial_admin">Financial Admin</SelectItem>
                  <SelectItem value="technical_admin">Technical Admin</SelectItem>
                  <SelectItem value="support_admin">Support Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por departamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os departamentos</SelectItem>
                  <SelectItem value="Leadership">Leadership</SelectItem>
                  <SelectItem value="Operations">Operations</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                  <SelectItem value="Engineering">Engineering</SelectItem>
                  <SelectItem value="Customer Support">Customer Support</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Button variant="outline" onClick={fetchAdmins} className="w-full">
                <Search className="mr-2 h-4 w-4" />
                Buscar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Administradores ({pagination.total})
          </CardTitle>
          <CardDescription>
            Lista de todos os usuários administrativos da plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Carregando administradores...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Administrador</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Último Acesso</TableHead>
                  <TableHead>Data de Contratação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {admin.first_name} {admin.last_name}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {admin.auth.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getRoleBadge(admin.role)}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{admin.department || 'N/A'}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {formatLastSignIn(admin.auth.last_sign_in_at)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        {formatDate(admin.hire_date)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Shield className="mr-2 h-4 w-4" />
                            Gerenciar Permissões
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteAdmin(admin)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Mostrando {((currentPage - 1) * pagination.limit) + 1} a {Math.min(currentPage * pagination.limit, pagination.total)} de {pagination.total} administradores
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === pagination.pages}
                >
                  Próximo
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin User Creation Form */}
      {showCreateForm && (
        <AdminUserForm
          isOpen={showCreateForm}
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => {
            setShowCreateForm(false);
            fetchAdmins(); // Reload admin users after creation
          }}
        />
      )}
    </div>
  );
}
