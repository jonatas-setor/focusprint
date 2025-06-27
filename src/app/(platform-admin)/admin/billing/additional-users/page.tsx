import { Suspense } from 'react';
import { AdditionalUsersDashboard } from '@/components/admin/billing/additional-users-dashboard';

// Disable static generation for this page
export const dynamic = 'force-dynamic';

export default function AdditionalUsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Usuários Adicionais
        </h1>
        <p className="text-muted-foreground">
          Gerencie o faturamento de usuários acima dos limites dos planos
        </p>
      </div>

      <Suspense fallback={<AdditionalUsersSkeleton />}>
        <AdditionalUsersDashboard />
      </Suspense>
    </div>
  );
}

function AdditionalUsersSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats Cards Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg border animate-pulse">
            <div className="flex items-center justify-between mb-2">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-4 w-4 bg-gray-200 rounded"></div>
            </div>
            <div className="h-8 bg-gray-200 rounded w-16"></div>
          </div>
        ))}
      </div>

      {/* Controls Skeleton */}
      <div className="bg-white p-6 rounded-lg border">
        <div className="space-y-4">
          <div className="h-6 bg-gray-200 rounded w-48"></div>
          <div className="h-4 bg-gray-200 rounded w-96"></div>
          <div className="flex gap-4">
            <div className="h-10 bg-gray-200 rounded flex-1"></div>
            <div className="h-10 bg-gray-200 rounded w-32"></div>
            <div className="h-10 bg-gray-200 rounded w-24"></div>
          </div>
        </div>
      </div>

      {/* Billing List Skeleton */}
      <div className="bg-white rounded-lg border">
        <div className="p-6 border-b">
          <div className="h-6 bg-gray-200 rounded w-64"></div>
        </div>
        <div className="divide-y">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-6 animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-6 bg-gray-200 rounded w-24"></div>
                  <div className="h-5 bg-gray-200 rounded w-16"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded w-32"></div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="space-y-1">
                    <div className="h-3 bg-gray-200 rounded w-20"></div>
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
