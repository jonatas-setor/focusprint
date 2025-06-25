import ClientLoginForm from '@/components/client/auth/login-form';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            FocuSprint
          </h1>
          <p className="text-gray-600">
            Faça login para acessar sua conta
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <ClientLoginForm />
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Não tem uma conta?{' '}
            <a href="/register" className="font-medium text-blue-600 hover:text-blue-500">
              Criar conta
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
