'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClientList } from '@/components/admin/clients/client-list';
import { ClientForm } from '@/components/admin/clients/client-form';
import { Client } from '@/types/database';

// Disable static generation for this page
export const dynamic = 'force-dynamic';

export default function AdminClientsPage() {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreateClient = () => {
    setEditingClient(null);
    setShowForm(true);
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setShowForm(true);
  };

  const handleViewClient = (client: Client) => {
    router.push(`/admin/clients/${client.id}`);
  };

  const handleFormSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      <ClientList
        key={refreshKey}
        onCreateClient={handleCreateClient}
        onEditClient={handleEditClient}
        onViewClient={handleViewClient}
      />

      <ClientForm
        client={editingClient}
        open={showForm}
        onOpenChange={setShowForm}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
