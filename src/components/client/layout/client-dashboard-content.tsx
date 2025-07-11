"use client";

import { useClientAuth } from "@/hooks/use-client-auth";
import { ClientSidebar } from "@/components/client/shared/client-sidebar";
import { ClientHeader } from "@/components/client/shared/client-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ClientDashboardContentProps {
  children: React.ReactNode;
}

export default function ClientDashboardContent({ children }: ClientDashboardContentProps) {
  const { profile, loading, error, refetch } = useClientAuth();

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header Skeleton */}
        <div className="border-b bg-background/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex items-center space-x-4">
              <div>
                <Skeleton className="h-6 w-48" />
                <div className="flex items-center space-x-2 mt-1">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          </div>
        </div>

        <div className="flex">
          {/* Sidebar Skeleton */}
          <div className="w-64 border-r bg-background/95">
            <div className="p-4 space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-6 w-2/3" />
            </div>
          </div>

          {/* Main Content Skeleton */}
          <main className="flex-1 p-6">
            <div className="space-y-6">
              <Skeleton className="h-8 w-64" />
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="mt-2">
              <div className="space-y-2">
                <p className="font-medium">Erro ao carregar dados do usuário</p>
                <p className="text-sm">
                  {error || "Não foi possível carregar o perfil do usuário"}
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={refetch}
                  className="mt-3"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tentar novamente
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Success state with real data
  console.log("✅ ClientDashboardContent: Rendering with real profile:", {
    name: `${profile.first_name} ${profile.last_name}`,
    client: profile.client?.name,
    role: profile.role
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Client Header with Real Data */}
      <ClientHeader profile={profile} />

      <div className="flex">
        {/* Sophisticated Sidebar with Real Data */}
        <ClientSidebar profile={profile} />

        {/* Main Content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
