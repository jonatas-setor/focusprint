'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Mail, CheckCircle, AlertCircle } from 'lucide-react';

export default function ConfirmEmailPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Get user email if available
    const getUserEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
    };
    getUserEmail();
  }, []);

  const resendConfirmation = async () => {
    if (!userEmail) {
      setError('Email não encontrado. Faça login novamente.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: userEmail,
      });

      if (error) {
        throw error;
      }

      setMessage('Email de confirmação reenviado com sucesso!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao reenviar email');
    } finally {
      setLoading(false);
    }
  };

  const goToLogin = () => {
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <Mail className="h-6 w-6 text-blue-600" />
          </div>
          <h1 className="mt-6 text-3xl font-bold text-gray-900">
            Confirme seu email
          </h1>
          <p className="mt-2 text-gray-600">
            Enviamos um link de confirmação para seu email
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {userEmail && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-blue-600 mr-2" />
                <p className="text-sm text-blue-800">
                  Email enviado para: <strong>{userEmail}</strong>
                </p>
              </div>
            </div>
          )}

          {message && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-600">{message}</p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-6">
            <div className="text-sm text-gray-600">
              <p className="mb-4">
                Para acessar sua conta, você precisa confirmar seu endereço de email.
                Clique no link que enviamos para você.
              </p>
              <p className="mb-4">
                Não recebeu o email? Verifique sua caixa de spam ou clique no botão abaixo
                para reenviar.
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={resendConfirmation}
                disabled={loading || !userEmail}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Reenviando...' : 'Reenviar email de confirmação'}
              </button>

              <button
                onClick={goToLogin}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Voltar ao login
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
