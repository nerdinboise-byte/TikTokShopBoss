import React from 'react';
import { User, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { 
  LayoutDashboard, 
  Sparkles, 
  Wallet, 
  LogOut, 
  User as UserIcon,
  TrendingUp,
  Calendar,
  Handshake,
  ShoppingBag,
  Archive,
  X
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  user: User;
  activeTab: 'dashboard' | 'planner' | 'deals' | 'studio' | 'products' | 'warehouse' | 'financials';
  onTabChange: (tab: 'dashboard' | 'planner' | 'deals' | 'studio' | 'products' | 'warehouse' | 'financials') => void;
  stats?: { totalGMV: number; totalVideos: number };
  goals?: any;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ user, activeTab, onTabChange, stats, goals, isOpen, onClose }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'planner', label: 'Daily Spread', icon: Calendar },
    { id: 'products', label: 'Products', icon: ShoppingBag },
    { id: 'studio', label: 'Hook Lab', icon: Sparkles },
    { id: 'warehouse', label: 'Warehouse', icon: Archive },
    { id: 'deals', label: 'Partnerships', icon: Handshake },
    { id: 'financials', label: 'Income Hub', icon: Wallet },
  ] as const;

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={cn(
          "fixed inset-0 bg-ink-900/40 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      <aside className={cn(
        "fixed inset-y-0 left-0 w-72 bg-white border-r border-pink-100 flex flex-col no-print font-sans z-50 transition-transform duration-300 lg:relative lg:translate-x-0 lg:w-64",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-8 border-bottom border-pink-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-pink-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-pink-200">
               <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-serif leading-none">Shop Boss<span className="text-pink-500">.</span></h1>
              <p className="text-[10px] uppercase tracking-widest text-pink-400 font-bold mt-1">30-Day Sprint</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden p-2 text-ink-300 hover:text-pink-500 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="flex-1 p-4 flex flex-col gap-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onTabChange(item.id);
                if (onClose) onClose();
              }}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left",
                activeTab === item.id 
                  ? "bg-pink-500 text-white shadow-lg shadow-pink-200" 
                  : "text-ink-500 hover:bg-pink-50 hover:text-pink-600"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </nav>

      <div className="p-6 border-t border-pink-50 bg-cream-50/50">
        <div className="bg-pink-50 rounded-2xl p-4 border border-pink-100 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[8px] font-bold uppercase tracking-widest text-pink-600 px-2 py-0.5 bg-white rounded-full">Sprint Goals</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[8px] uppercase tracking-widest text-ink-400 font-bold">Rev</p>
              <p className="text-xs font-bold text-ink-900">${stats?.totalGMV.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
            </div>
            <div>
              <p className="text-[8px] uppercase tracking-widest text-ink-400 font-bold">Vid</p>
              <p className="text-xs font-bold text-ink-900">{stats?.totalVideos} / {goals?.videosTarget || 30}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          {user.photoURL ? (
            <img src={user.photoURL} alt={user.displayName || ''} className="w-8 h-8 rounded-full border border-pink-100" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-500">
              <UserIcon className="w-4 h-4" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold truncate text-ink-900">{user.displayName}</p>
            <p className="text-[10px] text-ink-400 truncate uppercase tracking-tighter">Status: Boss</p>
          </div>
        </div>
        
        <button
          onClick={() => signOut(auth)}
          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-ink-400 hover:text-pink-600 transition-colors"
        >
          <LogOut className="w-3 h-3" />
          Log out
        </button>
      </div>
    </aside>
    </>
  );
};
