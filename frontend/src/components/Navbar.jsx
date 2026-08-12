import { Bell, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ onMenuToggle }) {
  const { user } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-4">
        {onMenuToggle && (
          <button onClick={onMenuToggle} className="text-gray-500 hover:text-gray-700 md:hidden">
            <Menu size={22} />
          </button>
        )}
        <h1 className="text-gray-700 font-semibold text-base hidden md:block">
          Military Asset Management
        </h1>
      </div>
      <div className="flex items-center gap-3">
        <button className="relative text-gray-500 hover:text-gray-700">
          <Bell size={20} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center text-sm font-bold">
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <span className="text-sm text-gray-600 hidden sm:block">{user?.username}</span>
        </div>
      </div>
    </header>
  );
}
