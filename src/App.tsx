/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useMemo } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { auth, googleProvider, db } from './lib/firebase';
import { doc, getDoc, setDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { AIStudio } from './components/AIStudio';
import { Financials } from './components/Financials';
import { Onboarding } from './components/Onboarding';
import { Planner } from './components/Planner';
import { BrandDeals } from './components/BrandDeals';
import { ProductCatalog } from './components/ProductCatalog';
import { Warehouse } from './components/Warehouse';
import { LogIn, Loader2, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DailyLog, GoalSet } from './types';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'planner' | 'deals' | 'studio' | 'products' | 'warehouse' | 'financials'>('dashboard');
  
  // App-level state for sync
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [goals, setGoals] = useState<GoalSet | null>(null);

  const fetchSyncData = async (uid: string) => {
    try {
      const logsSnap = await getDocs(query(collection(db, 'daily_logs'), where('userId', '==', uid)));
      const goalSnap = await getDoc(doc(db, 'goals', uid));
      
      setLogs(logsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as DailyLog)));
      if (goalSnap.exists()) {
        setGoals(goalSnap.data() as GoalSet);
      }
    } catch (err) {
      console.error("App sync error:", err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        // Sync user profile
        const userRef = doc(db, 'users', authUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: authUser.uid,
            email: authUser.email,
            displayName: authUser.displayName,
            photoURL: authUser.photoURL,
            taxRate: 15.3, // Default SE Tax
            onboarded: false,
            createdAt: new Date().toISOString(),
          });
          setIsNewUser(true);
        } else {
          const profile = userSnap.data();
          if (!profile.onboarded) {
            setIsNewUser(true);
          }
        }
        setUser(authUser);
        fetchSyncData(authUser.uid);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    const handleTabChange = (e: any) => {
      setActiveTab(e.detail);
    };
    window.addEventListener('changeTab', handleTabChange);

    return () => {
      unsubscribe();
      window.removeEventListener('changeTab', handleTabChange);
    };
  }, []);

  const stats = useMemo(() => {
    const totalGMV = logs.reduce((sum, l) => sum + (l.metrics?.gmv || 0), 0);
    const totalVideos = logs.reduce((sum, l) => sum + (l.metrics?.videosPosted || 0), 0);
    return { totalGMV, totalVideos };
  }, [logs]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login failed', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50 text-neutral-900 font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 text-white overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(50,50,50,0.5)_0%,transparent_50%)]" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="z-10 text-center max-w-xl"
        >
          <h1 className="text-6xl font-bold tracking-tighter mb-4 italic font-serif">ShopBoss</h1>
          <p className="text-neutral-400 text-lg mb-10 leading-relaxed">
            The ultimate TikTok Shop affiliate OS. Content generation, script writing, expense tracking, and tax management. Built for creators by thenerdycpa.com.
          </p>
          
          <button
            onClick={handleLogin}
            className="flex items-center gap-3 px-8 py-4 bg-white text-black rounded-full font-semibold hover:bg-neutral-200 transition-colors group"
          >
            <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            Get Started with Google
          </button>
        </motion.div>

        <div className="absolute bottom-10 left-10 text-neutral-500 font-mono text-xs uppercase tracking-widest text-[10px]">
          The Nerdy CPA // official digital OS
        </div>
      </div>
    );
  }

  if (isNewUser) {
    return <Onboarding user={user} onComplete={() => setIsNewUser(false)} />;
  }

  return (
    <Layout 
      user={user} 
      activeTab={activeTab} 
      onTabChange={setActiveTab}
      stats={stats}
      goals={goals}
    >
      <AnimatePresence mode="wait">
        <motion.div
           key={activeTab}
           initial={{ opacity: 0, x: 20 }}
           animate={{ opacity: 1, x: 0 }}
           exit={{ opacity: 0, x: -20 }}
           transition={{ duration: 0.2 }}
        >
          {activeTab === 'dashboard' && <Dashboard onUpdate={fetchSyncData} />}
          {activeTab === 'planner' && <Planner onUpdate={fetchSyncData} />}
          {activeTab === 'deals' && <BrandDeals />}
          {activeTab === 'products' && <ProductCatalog />}
          {activeTab === 'studio' && <AIStudio />}
          {activeTab === 'warehouse' && <Warehouse />}
          {activeTab === 'financials' && <Financials onUpdate={fetchSyncData} />}
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
}

