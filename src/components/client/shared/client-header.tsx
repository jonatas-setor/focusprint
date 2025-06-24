'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  User, 
  Settings, 
  LogOut, 
  Crown, 
  Shield, 
  Users 
} from 'lucide-react';
import { ClientProfile } from '@/lib/auth/server';
import { createClient } from '@/lib/auth/client-auth';

interface ClientHeaderProps {
  profile: ClientProfile;
}

export function ClientHeader({ profile }: ClientHeaderProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.href = '/auth/login';
    } catch (error) {
      console.error('Error logging out:', error);
      setIsLoggingOut(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-3 w-3" />;
      case 'admin':
        return <Shield className="h-3 w-3" />;
      default:
        return <Users className="h-3 w-3" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'admin':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getPlanBadgeVariant = (planType: string) => {
    switch (planType) {
      case 'business':
        return 'default';
      case 'pro':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Left side - Company info */}
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {profile.client.name}
            </h1>
            <div className="flex items-center space-x-2">
              <Badge variant={getPlanBadgeVariant(profile.client.plan_type)}>
                {profile.client.plan_type.toUpperCase()}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {profile.client.max_users} usuários • {profile.client.max_projects} projetos
              </span>
            </div>
          </div>
        </div>

        {/* Right side - User menu */}
        <div className="flex items-center space-x-4">
          {/* User info */}
          <div className="hidden md:block text-right">
            <p className="text-sm font-medium">
              {profile.first_name} {profile.last_name}
            </p>
            <div className="flex items-center justify-end space-x-1">
              {getRoleIcon(profile.role)}
              <Badge variant={getRoleBadgeVariant(profile.role)} className="text-xs">
                {profile.role}
              </Badge>
            </div>
          </div>

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarImage 
                    src={profile.avatar_url} 
                    alt={`${profile.first_name} ${profile.last_name}`} 
                  />
                  <AvatarFallback>
                    {profile.first_name.charAt(0)}{profile.last_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium">
                    {profile.first_name} {profile.last_name}
                  </p>
                  <p className="w-[200px] truncate text-sm text-muted-foreground">
                    {profile.client.name}
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Perfil</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Configurações</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>{isLoggingOut ? 'Saindo...' : 'Sair'}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
