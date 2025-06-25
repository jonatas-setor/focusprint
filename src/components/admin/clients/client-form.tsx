'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Client } from '@/types/database';
import { handleClientError, showErrorToast } from '@/lib/error-handler';
import { formatCNPJ, validateCNPJ, formatPhone, validatePhone } from '@/lib/utils';

interface ClientFormProps {
  client?: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface FormData {
  name: string;
  email: string;
  plan_type: 'free' | 'pro' | 'business';
  status: 'active' | 'inactive' | 'suspended';
  cnpj?: string;
  phone?: string;
  address?: string;
}

const PLAN_LIMITS = {
  free: { max_users: 5, max_projects: 3, price: 'R$ 0' },
  pro: { max_users: 15, max_projects: 10, price: 'R$ 97/mês' },
  business: { max_users: 50, max_projects: 50, price: 'R$ 399/mês' }
};

export function ClientForm({ client, open, onOpenChange, onSuccess }: ClientFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    plan_type: 'free',
    status: 'active',
    cnpj: '',
    phone: '',
    address: ''
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});

  const isEditing = !!client;

  // Reset form when dialog opens/closes or client changes
  useEffect(() => {
    if (open) {
      if (client) {
        setFormData({
          name: client.name,
          email: client.email,
          plan_type: client.plan_type as 'free' | 'pro' | 'business',
          status: client.status as 'active' | 'inactive' | 'suspended',
          cnpj: (client as any).cnpj || '',
          phone: (client as any).phone || '',
          address: (client as any).address || ''
        });
      } else {
        setFormData({
          name: '',
          email: '',
          plan_type: 'free',
          status: 'active',
          cnpj: '',
          phone: '',
          address: ''
        });
      }
      setErrors({});
    }
  }, [open, client]);

  const validateField = (field: keyof FormData, value: string): string | undefined => {
    switch (field) {
      case 'name':
        if (!value.trim()) {
          return 'Nome é obrigatório';
        }
        if (value.length < 2) {
          return 'Nome deve ter pelo menos 2 caracteres';
        }
        if (value.length > 100) {
          return 'Nome deve ter no máximo 100 caracteres';
        }
        if (!/^[a-zA-Z0-9\s\-_.&]+$/.test(value)) {
          return 'Nome contém caracteres inválidos';
        }
        break;

      case 'email':
        if (!value.trim()) {
          return 'Email é obrigatório';
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return 'Email inválido';
        }
        if (value.length > 255) {
          return 'Email deve ter no máximo 255 caracteres';
        }
        break;

      case 'cnpj':
        if (value && value.trim() !== '') {
          const cleanCnpj = value.replace(/\D/g, '');
          if (cleanCnpj.length > 0 && cleanCnpj.length < 14) {
            return 'CNPJ deve ter 14 dígitos';
          }
          if (cleanCnpj.length === 14 && !validateCNPJ(value)) {
            return 'CNPJ inválido. Verifique os dígitos verificadores';
          }
        }
        break;

      case 'phone':
        if (value && value.trim() !== '') {
          const cleanPhone = value.replace(/\D/g, '');
          if (cleanPhone.length > 0 && cleanPhone.length < 10) {
            return 'Telefone deve ter pelo menos 10 dígitos';
          }
          if (cleanPhone.length > 15) {
            return 'Telefone deve ter no máximo 15 dígitos';
          }
          if (!validatePhone(value)) {
            return 'Telefone inválido. Use o formato: +55 (XX) XXXXX-XXXX';
          }
        }
        break;

      case 'address':
        if (value && value.length > 500) {
          return 'Endereço deve ter no máximo 500 caracteres';
        }
        break;

      default:
        break;
    }
    return undefined;
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    // Validate all fields
    Object.keys(formData).forEach((key) => {
      const field = key as keyof FormData;
      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const url = isEditing ? `/api/admin/clients/${client.id}` : '/api/admin/clients';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save client');
      }

      toast.success(isEditing ? 'Cliente atualizado com sucesso!' : 'Cliente criado com sucesso!');
      onSuccess();
      onOpenChange(false);

    } catch (error) {
      console.error('Error saving client:', error);
      showErrorToast(error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    // Apply formatting for specific fields
    let formattedValue = value;
    if (field === 'cnpj') {
      formattedValue = formatCNPJ(value);
    } else if (field === 'phone') {
      formattedValue = formatPhone(value);
    }

    setFormData(prev => ({ ...prev, [field]: formattedValue }));

    // Real-time validation for better UX
    const error = validateField(field, formattedValue);
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const handleBlur = (field: keyof FormData) => {
    // Validate on blur for immediate feedback
    const error = validateField(field, formData[field]);
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const selectedPlanLimits = PLAN_LIMITS[formData.plan_type];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Cliente' : 'Novo Cliente'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Atualize as informações do cliente abaixo.'
              : 'Preencha as informações para criar um novo cliente.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Empresa *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Ex: Acme Corporation"
                    className={errors.name ? 'border-destructive' : ''}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="admin@empresa.com"
                    className={errors.email ? 'border-destructive' : ''}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    value={formData.cnpj}
                    onChange={(e) => handleInputChange('cnpj', e.target.value)}
                    placeholder="00.000.000/0001-00"
                    className={errors.cnpj ? 'border-destructive' : ''}
                    maxLength={18}
                  />
                  {errors.cnpj && (
                    <p className="text-sm text-destructive">{errors.cnpj}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+55 (11) 99999-9999"
                    className={errors.phone ? 'border-destructive' : ''}
                    maxLength={20}
                  />
                  {errors.phone && (
                    <p className="text-sm text-destructive">{errors.phone}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Rua, número, bairro, cidade, estado"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleInputChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                      <SelectItem value="suspended">Suspenso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Plan Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Plano de Assinatura</CardTitle>
              <CardDescription>
                Selecione o plano que define os limites e recursos disponíveis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="plan_type">Tipo de Plano</Label>
                <Select 
                  value={formData.plan_type} 
                  onValueChange={(value) => handleInputChange('plan_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">
                      Free - R$ 0 (5 usuários, 3 projetos)
                    </SelectItem>
                    <SelectItem value="pro">
                      Pro - R$ 97/mês (15 usuários, 10 projetos)
                    </SelectItem>
                    <SelectItem value="business">
                      Business - R$ 399/mês (50 usuários, 50 projetos)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Plan Details */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">
                  Detalhes do Plano {formData.plan_type.toUpperCase()}
                </h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Preço:</span>
                    <p className="font-medium">{selectedPlanLimits.price}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Usuários:</span>
                    <p className="font-medium">{selectedPlanLimits.max_users} máximo</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Projetos:</span>
                    <p className="font-medium">{selectedPlanLimits.max_projects} máximo</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : (isEditing ? 'Atualizar' : 'Criar Cliente')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
