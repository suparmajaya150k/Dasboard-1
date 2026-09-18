import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { BarChart3, ChevronLeft, ChevronRight, LogOut, Settings as SettingsIcon, Star } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  activeMenu: string;
  setActiveMenu: (menu: string) => void;
  onLogout: () => void;
  userName: string | null;
}

export function Sidebar({ isOpen, setIsOpen, activeMenu, setActiveMenu, onLogout, userName }: SidebarProps) {
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    setAvatarUrl(localStorage.getItem('app_avatar') || '');
  }, []);

  return (
    <div
      className={cn(
        "relative flex flex-col h-screen bg-[#0F172A] text-white transition-all duration-300 z-20 border-r border-slate-200",
        isOpen ? "w-64" : "w-16"
      )}
    >
      <div className="flex items-center justify-between p-6 h-auto border-b border-slate-800">
        {isOpen && (
          <div className="flex items-center gap-3 overflow-hidden">
             <img src="https://imgur.com/9EiNqyh.png" alt="150k" className="h-12 w-12 object-contain shrink-0 rounded bg-white" />
             <span className="font-bold text-xl text-white whitespace-nowrap tracking-tight uppercase">
              Optik 150k
             </span>
          </div>
        )}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "p-1 rounded-md hover:bg-slate-800 text-slate-400 transition-colors shrink-0",
            !isOpen && "mx-auto"
          )}
        >
          {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>

      <nav className="flex-1 py-6 space-y-1">
        {isOpen && <div className="mb-2 px-6 text-[10px] font-semibold tracking-widest text-slate-500 uppercase">Main Operations</div>}
        <button
          onClick={() => setActiveMenu('revenue')}
          className={cn(
            "flex w-full items-center gap-3 px-6 py-3 transition-colors",
            activeMenu === 'revenue' 
              ? "bg-blue-600/10 text-blue-400 border-r-4 border-blue-500" 
              : "text-slate-400 opacity-60 hover:opacity-100",
            !isOpen && "justify-center px-0 border-r-0"
          )}
          title="Revenue"
        >
          <BarChart3 size={20} className="shrink-0" />
          {isOpen && <span className="font-medium whitespace-nowrap">Revenue</span>}
        </button>
        
        <button
          onClick={() => setActiveMenu('target')}
          className={cn(
            "flex w-full items-center gap-3 px-6 py-3 transition-colors",
            activeMenu === 'target' 
              ? "bg-blue-600/10 text-blue-400 border-r-4 border-blue-500" 
              : "text-slate-400 opacity-60 hover:opacity-100",
            !isOpen && "justify-center px-0 border-r-0"
          )}
          title="Omset vs Target"
        >
          <BarChart3 size={20} className="shrink-0" />
          {isOpen && <span className="font-medium whitespace-nowrap">Omset vs Target</span>}
        </button>

        <button
          onClick={() => setActiveMenu('rating')}
          className={cn(
            "flex w-full items-center gap-3 px-6 py-3 transition-colors",
            activeMenu === 'rating' 
              ? "bg-blue-600/10 text-blue-400 border-r-4 border-blue-500" 
              : "text-slate-400 opacity-60 hover:opacity-100",
            !isOpen && "justify-center px-0 border-r-0"
          )}
          title="Rating Google"
        >
          <Star size={20} className="shrink-0 text-amber-400 fill-amber-400" />
          {isOpen && <span className="font-medium whitespace-nowrap">Rating Google</span>}
        </button>
        
        <button
          onClick={() => setActiveMenu('settings')}
          className={cn(
            "flex w-full items-center gap-3 px-6 py-3 transition-colors",
            activeMenu === 'settings' 
              ? "bg-blue-600/10 text-blue-400 border-r-4 border-blue-500" 
              : "text-slate-400 opacity-60 hover:opacity-100",
            !isOpen && "justify-center px-0 border-r-0"
          )}
          title="Settings"
        >
          <SettingsIcon size={20} className="shrink-0" />
          {isOpen && <span className="font-medium whitespace-nowrap">Settings</span>}
        </button>
      </nav>

      <div className="border-t border-slate-800 p-6">
        {isOpen && (
          <div className="mb-6 flex items-center gap-3 overflow-hidden">
             <div className="h-8 w-8 shrink-0 rounded-full bg-slate-700 overflow-hidden flex items-center justify-center">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold">SJ</span>
                )}
             </div>
             <div className="text-sm overflow-hidden">
                <p className="font-medium truncate text-white">Suparma Jaya</p>
                <p className="text-xs text-slate-500">Administrator</p>
             </div>
          </div>
        )}
        <button
          onClick={onLogout}
          className={cn(
            "flex items-center w-full px-0 text-slate-400 hover:text-white transition-colors group",
            !isOpen && "justify-center mx-auto"
          )}
          title="Sign Out"
        >
          <LogOut size={20} className="shrink-0" />
          {isOpen && <span className="ml-3 font-medium whitespace-nowrap">Sign Out</span>}
        </button>
      </div>
    </div>
  );
}
