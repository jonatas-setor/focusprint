'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  UserCheck,
  UserX,
  Shield,
  Crown,
  User,
  Mail,
  Calendar,
  Activity
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

interface ClientUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'owner' | 'admin' | 'member';
  avatar_url?: string;
  job_title?: string;
  department?: string;
  last_seen_at?: string;
  last_sign_in_at?: string;
  created_at: string;
  updated_at: string;
  email_confirmed: boolean;
  status: 'active' | 'suspended' | 'inactive';
}

interface ClientUsersData {
  users: ClientUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  client: {
    id: string;
    name: string;
    status: string;
  };
}

interface ClientUsersManagementProps {
  clientId: string;
}

export function ClientUsersManagement({ clientId }: ClientUsersManagementProps) {
  const [data, setData] = useState<ClientUsersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ClientUser | null>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [clientId]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/clients/${clientId}/users`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const result = await response.json();
      setData(result);
    } catch (error) {
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async (userData: {
    email: string;
    first_name: string;
    last_name: string;
    role: string;
  }) => {
    try {
      const response = await fetch(`/api/admin/clients/${clientId}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...userData,
          send_invitation: true
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to invite user');
      }

      toast.success('Usuário convidado com sucesso!');
      setShowInviteDialog(false);
      fetchUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao convidar usuário');
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/admin/clients/${clientId}/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update_role',
          role: newRole
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update user role');
      }

      toast.success('Função do usuário atualizada com sucesso!');
      fetchUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar função');
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!confirm('Tem certeza que deseja remover este usuário do cliente?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/clients/${clientId}/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: 'Removido pelo administrador'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove user');
      }

      toast.success('Usuário removido com sucesso!');
      fetchUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao remover usuário');
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-yellow-600" />;
      case 'admin':
        return <Shield className="w-4 h-4 text-blue-600" />;
      default:
        return <User className="w-4 h-4 text-gray-600" />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Proprietário</Badge>;
      case 'admin':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Administrador</Badge>;
      default:
        return <Badge variant="outline">Membro</Badge>;
    }
  };

  const getStatusBadge = (status: string, emailConfirmed: boolean) => {
    if (!emailConfirmed) {
      return <Badge variant="secondary">Pendente</Badge>;
    }
    
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">Ativo</Badge>;
      case 'suspended':
        return <Badge variant="destructive">Suspenso</Badge>;
      default:
        return <Badge variant="secondary">Inativo</Badge>;
    }
  };

  const filteredUsers = data?.users.filter(user =>
    user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando usuários...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Usuários do Cliente ({data?.pagination.total || 0})
            </CardTitle>
            <CardDescription>
              Gerencie os usuários associados a este cliente
            </CardDescription>
          </div>
          <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Convidar Usuário
              </Button>
            </DialogTrigger>
            <InviteUserDialog onInvite={handleInviteUser} />
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search */}
        <div className="flex items-center space-x-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar usuários..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Users List */}
        <div className="space-y-4">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum usuário encontrado</p>
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    {getRoleIcon(user.role)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-medium">{user.first_name} {user.last_name}</p>
                      {getRoleBadge(user.role)}
                      {getStatusBadge(user.status, user.email_confirmed)}
                    </div>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Mail className="w-3 h-3 mr-1" />
                        {user.email}
                      </div>
                      {user.job_title && (
                        <span>• {user.job_title}</span>
                      )}
                      {user.last_sign_in_at && (
                        <div className="flex items-center">
                          <Activity className="w-3 h-3 mr-1" />
                          Último acesso: {formatDate(user.last_sign_in_at)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => {
                      setSelectedUser(user);
                      setShowUserDialog(true);
                    }}>
                      <Edit className="mr-2 h-4 w-4" />
                      Ver Detalhes
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleUpdateUserRole(user.id, user.role === 'member' ? 'admin' : 'member')}>
                      <UserCheck className="mr-2 h-4 w-4" />
                      {user.role === 'member' ? 'Promover a Admin' : 'Rebaixar a Membro'}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleRemoveUser(user.id)}
                      className="text-destructive"
                      disabled={user.role === 'owner'}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remover Usuário
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Invite User Dialog Component
function InviteUserDialog({ onInvite }: { onInvite: (userData: any) => void }) {
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    role: 'member'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await onInvite(formData);
      setFormData({ email: '', first_name: '', last_name: '', role: 'member' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Convidar Novo Usuário</DialogTitle>
        <DialogDescription>
          Convide um novo usuário para este cliente. Um email de convite será enviado.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="first_name" className="text-sm font-medium">
                Nome
              </label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
              />
            </div>
            <div>
              <label htmlFor="last_name" className="text-sm font-medium">
                Sobrenome
              </label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
              />
            </div>
          </div>
          <div>
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div>
            <label htmlFor="role" className="text-sm font-medium">
              Função
            </label>
            <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Membro</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="owner">Proprietário</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar Convite'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
