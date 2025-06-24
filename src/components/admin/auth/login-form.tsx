'use client';

export default function AdminLoginForm() {
  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Platform Admin Login
      </h2>
      
      <form className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email (@focusprint.com)
          </label>
          <input
            type="email"
            id="email"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="admin@focusprint.com"
          />
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Senha
          </label>
          <input
            type="password"
            id="password"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          Entrar
        </button>
      </form>
      
      <p className="mt-4 text-xs text-gray-500 text-center">
        Acesso restrito a administradores da plataforma
      </p>
    </div>
  );
}
