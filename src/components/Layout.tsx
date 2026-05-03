import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { User } from 'firebase/auth';
import { Menu, TrendingUp } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  activeTab: 'dashboard' | 'planner' | 'deals' | 'studio' | 'products' | 'warehouse' | 'financials';
  onTabChange: (tab: 'dashboard' | 'planner' | 'deals' | 'studio' | 'products' | 'warehouse' | 'financials') => void;
  stats?: { totalGMV: number; totalVideos: number };
  goals?: any;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, activeTab, onTabChange, stats, goals }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-neutral-50 text-neutral-900 font-sans relative">
      <Sidebar 
        user={user} 
        activeTab={activeTab} 
        onTabChange={onTabChange} 
        stats={stats}
        goals={goals}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between p-4 bg-white border-b border-pink-100 sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-pink-500 rounded-lg flex items-center justify-center text-white">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="font-bold font-serif text-lg">Shop Boss</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-ink-300 hover:text-pink-500 transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
