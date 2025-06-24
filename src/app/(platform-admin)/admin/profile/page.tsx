'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, User, Key, Download, AlertTriangle, CheckCircle } from 'lucide-react';
import { TwoFactorSetupWizard } from '@/components/admin/2fa/TwoFactorSetupWizard';
import { TwoFactorStatus } from '@/components/admin/2fa/TwoFactorStatus';

interface AdminProfile {
  id: string;
  role: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
}

interface TwoFactorInfo {
  twoFactorEnabled: boolean;
  hasActiveSetupSession: boolean;
  canSetup2FA: boolean;
}

export default function AdminProfilePage() {
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [twoFactorInfo, setTwoFactorInfo] = useState<TwoFactorInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSetupWizard, setShowSetupWizard] = useState(false);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load admin profile
      const profileResponse = await fetch('/api/admin/users/me');
      if (!profileResponse.ok) {
        throw new Error('Failed to load profile');
      }
      const profileData = await profileResponse.json();
      setAdminProfile(profileData.admin);

      // Load 2FA status
      const twoFactorResponse = await fetch('/api/admin/2fa/setup');
      if (!twoFactorResponse.ok) {
        throw new Error('Failed to load 2FA status');
      }
      const twoFactorData = await twoFactorResponse.json();
      setTwoFactorInfo(twoFactorData);

    } catch (err) {
      console.error('Error loading profile data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleSetup2FA = () => {
    setShowSetupWizard(true);
  };

  const handleSetupComplete = () => {
    setShowSetupWizard(false);
    loadProfileData(); // Reload to get updated status
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-red-100 text-red-800';
      case 'operations_admin': return 'bg-blue-100 text-blue-800';
      case 'financial_admin': return 'bg-green-100 text-green-800';
      case 'technical_admin': return 'bg-purple-100 text-purple-800';
      case 'support_admin': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatRoleName = (role: string) => {
    return role.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!adminProfile) {
    return (
      <div className="p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Perfil de administrador não encontrado.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Perfil do Administrador</h1>
        <p className="text-gray-600">Gerencie suas informações e configurações de segurança</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Segurança
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informações do Perfil
              </CardTitle>
              <CardDescription>
                Suas informações básicas de administrador
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Nome</label>
                  <p className="mt-1 text-gray-900">{adminProfile.first_name} {adminProfile.last_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-gray-900">{adminProfile.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Função</label>
                  <div className="mt-1">
                    <Badge className={getRoleBadgeColor(adminProfile.role)}>
                      {formatRoleName(adminProfile.role)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Membro desde</label>
                  <p className="mt-1 text-gray-900">
                    {new Date(adminProfile.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Autenticação de Dois Fatores (2FA)
                </CardTitle>
                <CardDescription>
                  Adicione uma camada extra de segurança à sua conta
                </CardDescription>
              </CardHeader>
              <CardContent>
                {twoFactorInfo && (
                  <TwoFactorStatus
                    enabled={twoFactorInfo.twoFactorEnabled}
                    hasActiveSession={twoFactorInfo.hasActiveSetupSession}
                    canSetup={twoFactorInfo.canSetup2FA}
                    onSetup={handleSetup2FA}
                  />
                )}
              </CardContent>
            </Card>

            {showSetupWizard && (
              <TwoFactorSetupWizard
                onComplete={handleSetupComplete}
                onCancel={() => setShowSetupWizard(false)}
              />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
