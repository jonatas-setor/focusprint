import ClientRegisterForm from '@/components/client/auth/register-form';

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            FocuSprint
          </h1>
          <p className="text-gray-600">
            Crie sua conta e comece a usar
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <ClientRegisterForm />
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Já tem uma conta?{' '}
            <a href="/login" className="font-medium text-blue-600 hover:text-blue-500">
              Fazer login
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
