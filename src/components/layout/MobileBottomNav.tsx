import React from 'react';
import {
  LayoutDashboard,
  FileBadge,
  Palette,
  Award,
  BookOpenCheck,
  BarChart3,
  Settings,
} from 'lucide-react';

interface MobileBottomNavProps {
  currentTab: string;
  onNavigate: (tab: string, param?: string) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onNavigate,
}) => {
  const items = [
    { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
    { id: 'templates', label: 'Plantillas', icon: FileBadge },
    { id: 'editor', label: 'Editor', icon: Palette },
    { id: 'certificates', label: 'Certificados', icon: Award },
    { id: 'exams', label: 'Exámenes', icon: BookOpenCheck },
    { id: 'settings', label: 'Ajustes', icon: Settings },
  ];

  return (
    <div className="md:hidden fixed bottom-3 inset-x-3 z-40 pointer-events-none flex justify-center">
      <nav
        className="pointer-events-auto flex items-center justify-between gap-1 px-3 py-2 rounded-full bg-slate-900/80 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/80 max-w-md w-full select-none"
        style={{ WebkitBackdropFilter: 'blur(20px)' }}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1.5 rounded-2xl transition-all duration-200 relative ${
                isActive
                  ? 'text-indigo-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isActive && (
                <span className="absolute -top-1 w-6 h-1 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500" />
              )}
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'scale-110' : ''} transition-transform`} />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
