'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Video, VideoOff } from 'lucide-react';

interface GoogleMeetButtonProps {
  projectId: string;
  onMeetCreated: (meetLink: string) => void;
}

export default function GoogleMeetButton({ projectId, onMeetCreated }: GoogleMeetButtonProps) {
  const [hasGoogleAuth, setHasGoogleAuth] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkGoogleAuth();
  }, []);

  const checkGoogleAuth = async () => {
    try {
      setChecking(true);
      const response = await fetch('/api/auth/google/status');
      
      if (response.ok) {
        const { connected } = await response.json();
        setHasGoogleAuth(connected);
      } else {
        setHasGoogleAuth(false);
      }
    } catch (error) {
      console.error('Error checking Google auth:', error);
      setHasGoogleAuth(false);
    } finally {
      setChecking(false);
    }
  };

  const createMeet = async () => {
    if (!hasGoogleAuth) {
      // Show modal to connect Google (not mandatory)
      const shouldConnect = confirm(
        'Para criar videochamadas, você precisa conectar sua conta Google. Deseja conectar agora?'
      );
      if (shouldConnect) {
        window.location.href = '/api/auth/google/connect';
      }
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/client/projects/${projectId}/meet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create Google Meet');
      }

      const { meetLink } = await response.json();
      onMeetCreated(meetLink);
    } catch (error) {
      console.error('Error creating Google Meet:', error);
      alert('Erro ao criar videochamada. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <Button
        disabled
        variant="secondary"
        size="sm"
        className="flex items-center gap-2"
      >
        <Video className="w-4 h-4 opacity-50" />
        Verificando...
      </Button>
    );
  }

  return (
    <Button
      onClick={createMeet}
      disabled={loading}
      variant={hasGoogleAuth ? "default" : "secondary"}
      size="sm"
      className="flex items-center gap-2"
      title={hasGoogleAuth ? "Criar videochamada Google Meet" : "Conecte sua conta Google para criar videochamadas"}
    >
      {hasGoogleAuth ? (
        <>
          <Video className="w-4 h-4" />
          {loading ? 'Criando...' : 'Iniciar Meet'}
        </>
      ) : (
        <>
          <VideoOff className="w-4 h-4 opacity-50" />
          Iniciar Meet
        </>
      )}
    </Button>
  );
}
