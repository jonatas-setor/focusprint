'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface AdminUserFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user?: any; // For editing existing users
}

interface AdminUserFormData {
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  department: string;
  hire_date: string;
}

export default function AdminUserForm({ isOpen, onClose, onSuccess, user }: AdminUserFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<AdminUserFormData>({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    role: user?.role || 'admin',
    department: user?.department || 'Technology',
    hire_date: user?.hire_date || new Date().toISOString().split('T')[0]
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Ensure email has @focusprint.com domain
      let email = formData.email;
      if (!email.includes('@')) {
        email = `${email}@focusprint.com`;
      } else if (!email.endsWith('@focusprint.com')) {
        toast.error('Email deve ser do domínio @focusprint.com');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          email
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create admin user');
      }

      const result = await response.json();
      toast.success('Administrador criado com sucesso!');
      onSuccess();
    } catch (error) {
      console.error('Error creating admin user:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao criar administrador');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{user ? 'Editar Administrador' : 'Novo Administrador'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Informações Pessoais</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">Nome *</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  placeholder="Nome"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name">Sobrenome *</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  placeholder="Sobrenome"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="usuario@focusprint.com"
                required
              />
              <p className="text-sm text-gray-600">
                Deve ser um email do domínio @focusprint.com
              </p>
            </div>
          </div>

          {/* Role and Department */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Informações Profissionais</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Cargo *</Label>
                <Select 
                  value={formData.role} 
                  onValueChange={(value) => handleInputChange('role', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="support">Support</SelectItem>
                    <SelectItem value="analyst">Analyst</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Departamento *</Label>
                <Select 
                  value={formData.department} 
                  onValueChange={(value) => handleInputChange('department', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Leadership">Leadership</SelectItem>
                    <SelectItem value="Technology">Technology</SelectItem>
                    <SelectItem value="Support">Support</SelectItem>
                    <SelectItem value="Sales">Sales</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hire_date">Data de Contratação *</Label>
              <Input
                id="hire_date"
                type="date"
                value={formData.hire_date}
                onChange={(e) => handleInputChange('hire_date', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Information Note */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Informações Importantes:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Uma senha temporária será gerada automaticamente</li>
              <li>• O usuário receberá um email com instruções de acesso</li>
              <li>• O usuário deve alterar a senha no primeiro login</li>
              <li>• Apenas emails do domínio @focusprint.com são permitidos</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Criando...' : (user ? 'Atualizar Administrador' : 'Criar Administrador')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
