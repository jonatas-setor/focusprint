interface HeaderProps {
  title: string;
  subtitle?: string;
  type: 'admin' | 'client' | 'landing';
}

export default function Header({ title, subtitle, type }: HeaderProps) {
  const getHeaderStyles = () => {
    switch (type) {
      case 'admin':
        return 'bg-gray-800 text-white';
      case 'client':
        return 'bg-blue-600 text-white';
      default:
        return 'bg-white text-gray-900 border-b';
    }
  };

  return (
    <header className={`${getHeaderStyles()} px-6 py-4`}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          {subtitle && (
            <p className="text-sm opacity-75">{subtitle}</p>
          )}
        </div>
        <div>
          {/* TODO: Add user menu */}
        </div>
      </div>
    </header>
  );
}
