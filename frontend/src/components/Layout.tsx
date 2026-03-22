import { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { LogOut, LayoutDashboard, FileText, Settings, Eye, Menu, X } from 'lucide-react';
import clsx from 'clsx';

export const Layout = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-gray-900 text-white px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-primary-400">SCEM</h1>
          <p className="text-xs text-gray-400">Sistema Electoral</p>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 hover:bg-gray-800 rounded-lg"
          aria-label="Menu"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileMenuOpen(false)}
        >
          <aside 
            className="absolute right-0 top-0 h-full w-72 bg-gray-900 text-white flex flex-col animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-primary-400">SCEM</h1>
                <p className="text-xs text-gray-400">Sistema Electoral Municipal</p>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 hover:bg-gray-800 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            
            <nav className="flex-1 p-4">
              <ul className="space-y-2">
                {navItems.map(({ to, label, icon: Icon }) => (
                  <li key={to}>
                    <Link
                      to={to}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors"
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
                className="flex items-center gap-2 w-full px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors text-red-400"
              >
                <LogOut size={18} />
                Cerrar Sesión
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-gray-900 text-white flex-col fixed h-screen">
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
      <main className="flex-1 lg:ml-64 bg-gray-100 pt-16 lg:pt-0 p-4 lg:p-8 overflow-auto min-h-screen">
        <Outlet />
      </main>

      <style>{`
        @keyframes slide-in {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slide-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};
