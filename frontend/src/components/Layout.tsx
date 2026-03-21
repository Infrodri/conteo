import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { LogOut, LayoutDashboard, FileText, Settings, Eye } from 'lucide-react';
import clsx from 'clsx';

export const Layout = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/digitacion', label: 'Digitación', icon: FileText },
    ...(user?.rol === 'ADMIN' 
      ? [
          { to: '/admin', label: 'Admin', icon: Settings },
          { to: '/observacion', label: 'Observación', icon: Eye },
        ] 
      : []
    ),
  ];

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h1 className="text-xl font-bold text-primary-400">SCEM</h1>
          <p className="text-xs text-gray-400">Sistema Electoral Municipal</p>
        </div>
        
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <Link
                  to={to}
                  className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <Icon size={20} />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="mb-3">
            <p className="font-medium">{user?.nombre}</p>
            <p className="text-xs text-gray-400">{user?.email}</p>
            <span className={clsx(
              'inline-block mt-1 px-2 py-0.5 text-xs rounded',
              user?.rol === 'ADMIN' ? 'bg-primary-600' : 'bg-gray-600'
            )}>
              {user?.rol}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors text-red-400"
          >
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-gray-100 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};
