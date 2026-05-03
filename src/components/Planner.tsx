import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, getDocs, setDoc, doc, serverTimestamp, orderBy, limit, getDoc, deleteDoc } from 'firebase/firestore';
import { DailyLog, GoalSet, Script, Product } from '../types';
import { 
  Calendar as CalendarIcon, 
  Target, 
  BarChart3, 
  ShoppingBag, 
  Video, 
  Save,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Award,
  Archive,
  Search,
  Plus,
  Trash2,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PlannerProps {
  onUpdate?: (uid: string) => void;
}

export const Planner: React.FC<PlannerProps> = ({ onUpdate }) => {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [log, setLog] = useState<Partial<DailyLog>>({
    income: { affiliate: 0, rewards: 0, live: 0, brandDeals: 0, other: 0 },
    metrics: { videosPosted: 0, livesCompleted: 0, views: 0, a2c: 0, gmv: 0 },
    mileage: 0,
    moneyMoves: ['', '', ''],
    topHooks: ['', '', '', ''],
    livePlan: { offer: '', sequence: '' }
  });
  const [goals, setGoals] = useState<Partial<GoalSet>>({
    gmvGoal: 5000,
    commissionGoal: 1000,
    videosTarget: 30
  });
  const [scheduledScripts, setScheduledScripts] = useState<Script[]>([]);
  const [products, setProducts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [archiveScripts, setArchiveScripts] = useState<Script[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const logsPath = 'daily_logs';
      const goalsPath = 'goals';
      const scriptsPath = 'scripts';
      const productsPath = 'products';

      const [logSnap, goalsSnap, scriptsSnap, productsSnap, allLogsSnap] = await Promise.all([
        getDocs(query(collection(db, logsPath), where('userId', '==', user.uid), where('date', '==', selectedDate))).catch(e => handleFirestoreError(e, OperationType.LIST, logsPath)),
        getDoc(doc(db, goalsPath, user.uid)).catch(e => handleFirestoreError(e, OperationType.GET, `${goalsPath}/${user.uid}`)),
        getDocs(query(collection(db, scriptsPath), where('userId', '==', user.uid), where('scheduledDate', '==', selectedDate))).catch(e => handleFirestoreError(e, OperationType.LIST, scriptsPath)),
        getDocs(query(collection(db, productsPath), where('userId', '==', user.uid))).catch(e => handleFirestoreError(e, OperationType.LIST, productsPath)),
        getDocs(query(collection(db, logsPath), where('userId', '==', user.uid), orderBy('date', 'desc'))).catch(e => handleFirestoreError(e, OperationType.LIST, logsPath))
      ]);
      
      if (allLogsSnap) {
        setLogs((allLogsSnap as any).docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as DailyLog)));
      }
      
      const snap = logSnap as any;
      if (!snap.empty) {
        const data = snap.docs[0].data() as DailyLog;
        setLog({
          ...data,
          moneyMoves: data.moneyMoves || ['', '', ''],
          topHooks: data.topHooks || ['', '', '', ''],
          livePlan: data.livePlan || { offer: '', sequence: '' }
        });
      } else {
        setLog({
          date: selectedDate,
          income: { affiliate: 0, rewards: 0, live: 0, brandDeals: 0, other: 0 },
          metrics: { videosPosted: 0, livesCompleted: 0, views: 0, a2c: 0, gmv: 0 },
          mileage: 0,
          moneyMoves: ['', '', ''],
          topHooks: ['', '', '', ''],
          livePlan: { offer: '', sequence: '' }
        });
      }

      const gSnap = goalsSnap as any;
      if (gSnap.exists()) {
        setGoals(gSnap.data() as GoalSet);
      }

      if (scriptsSnap) {
        setScheduledScripts((scriptsSnap as any).docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Script)));
      }

      if (productsSnap) {
        const prodMap: Record<string, string> = {};
        (productsSnap as any).docs.forEach((doc: any) => {
          prodMap[doc.id] = (doc.data() as Product).name;
        });
        setProducts(prodMap);
      }
    } catch (error) {
      console.error("Planner fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const logId = `${user.uid}_${selectedDate}`;
    const logsPath = 'daily_logs';
    try {
      await setDoc(doc(db, logsPath, logId), {
        ...log,
        userId: user.uid,
        date: selectedDate,
        updatedAt: serverTimestamp()
      }, { merge: true });

      setSaved(true);
      if (onUpdate) onUpdate(user.uid);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${logsPath}/${logId}`);
    }
  };

  const updateIncome = (field: keyof DailyLog['income'], val: string) => {
    setLog(prev => ({
      ...prev,
      income: { ...prev.income!, [field]: parseFloat(val) || 0 }
    }));
  };

  const updateMetric = (field: keyof DailyLog['metrics'], val: string) => {
    setLog(prev => ({
      ...prev,
      metrics: { ...prev.metrics!, [field]: parseFloat(val) || 0 }
    }));
  };

  const updateMoneyMove = (index: number, val: string) => {
    setLog(prev => {
      const newMoves = [...(prev.moneyMoves || ['', '', ''])];
      newMoves[index] = val;
      return { ...prev, moneyMoves: newMoves };
    });
  };

  const updateHook = (index: number, val: string) => {
    setLog(prev => {
      const newHooks = [...(prev.topHooks || ['', '', '', ''])];
      newHooks[index] = val;
      return { ...prev, topHooks: newHooks };
    });
  };

  const updateLivePlan = (field: keyof NonNullable<DailyLog['livePlan']>, val: string) => {
    setLog(prev => ({
      ...prev,
      livePlan: { ...(prev.livePlan || { offer: '', sequence: '' }), [field]: val }
    }));
  };

  const fetchArchive = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const q = query(collection(db, 'scripts'), where('userId', '==', user.uid), where('savedToArchive', '==', true));
      const snap = await getDocs(q);
      setArchiveScripts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Script)));
    } catch (error) {
      console.error(error);
    }
  };

  const scheduleScript = async (script: Script) => {
    const scriptsPath = 'scripts';
    try {
      // Update the archived script to also have a scheduled date for this specific day 
      // or create a copy? Let's update the existing one if it's archiving, 
      // but actually user might want to reuse scripts. So let's create a COPY for the calendar.
      const { id, ...data } = script;
      await setDoc(doc(db, scriptsPath, `${script.id}_${selectedDate}`), {
        ...data,
        scheduledDate: selectedDate,
        savedToArchive: false,
        createdAt: serverTimestamp()
      }, { merge: true });
      fetchData();
      setShowArchive(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, scriptsPath);
    }
  };

  const removeScriptFromDay = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'scripts', id));
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-8 pb-20 no-print">
      <header className="flex items-center justify-between border-b pb-6 border-pink-100">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-pink-500 text-white rounded-2xl shadow-lg shadow-pink-200">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-3xl font-bold font-serif tracking-tight">Daily Spread</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-pink-400">Map your moves. Track your wins.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white p-3 rounded-2xl border border-pink-100 shadow-sm">
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent border-none text-sm font-bold focus:ring-0 cursor-pointer text-ink-900"
          />
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Page 1: CEO & Sales */}
        <article className="bg-white border border-pink-100 rounded-[40px] shadow-sm p-10 space-y-10">
          <header className="flex justify-between items-start border-b border-pink-50 pb-6">
            <div>
              <small className="text-[10px] font-bold uppercase tracking-widest text-ink-400">Page 1</small>
              <h3 className="text-2xl font-bold font-serif italic text-ink-900">Daily CEO & Sales</h3>
            </div>
            <div className="px-4 py-2 bg-pink-50 rounded-full text-xs font-bold text-pink-600">Day {logs.length + 1}</div>
          </header>

          <section className="space-y-6">
            <h4 className="text-xs font-bold uppercase tracking-widest text-ink-400 border-b border-pink-50 pb-2">Top 3 Money Moves</h4>
            <div className="space-y-3">
              {(log.moneyMoves || ['', '', '']).map((move, n) => (
                <div key={n} className="flex items-center gap-4 p-4 bg-pink-50/30 rounded-2xl border border-pink-100/50">
                  <span className="w-6 h-6 rounded-full bg-pink-500 text-white flex items-center justify-center font-bold text-[10px]">{n + 1}</span>
                  <input 
                    type="text" 
                    value={move}
                    onChange={(e) => updateMoneyMove(n, e.target.value)}
                    placeholder={`Money move #${n + 1}`}
                    className="flex-1 bg-transparent border-none text-sm focus:ring-0 p-0 italic font-medium text-ink-700"
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-2 gap-6">
             <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-widest text-ink-400 border-b border-pink-50 pb-2">Revenue Actual</h4>
                <div className="relative">
                   <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-300" />
                   <input 
                     type="number" 
                     value={log.metrics?.gmv || 0}
                     onChange={(e) => updateMetric('gmv', e.target.value)}
                     className="w-full bg-cream-50 rounded-xl py-3 pl-10 pr-4 text-xl font-bold text-ink-900 focus:ring-2 focus:ring-pink-100 border-none"
                   />
                </div>
             </div>
             <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-widest text-ink-400 border-b border-pink-50 pb-2">Units Sold</h4>
                <div className="relative">
                   <ShoppingBag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-300" />
                   <input 
                     type="number" 
                     value={log.metrics?.a2c || 0}
                     onChange={(e) => updateMetric('a2c', e.target.value)}
                     className="w-full bg-cream-50 rounded-xl py-3 pl-10 pr-4 text-xl font-bold text-ink-900 focus:ring-2 focus:ring-pink-100 border-none"
                   />
                </div>
             </div>
          </section>

          <section className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-ink-400 border-b border-pink-50 pb-2">Income Breakdown</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(log.income || {}).map(([key, val]) => (
                <div key={key} className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-ink-300 capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-pink-300">$</span>
                    <input 
                      type="number" 
                      value={val}
                      onChange={(e) => updateIncome(key as any, e.target.value)}
                      className="w-full bg-cream-50/50 rounded-xl py-2 pl-6 pr-4 text-sm font-bold border border-pink-50/50 focus:ring-2 focus:ring-pink-100"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </article>

        {/* Page 2: Content & Testing */}
        <article className="bg-white border border-pink-100 rounded-[40px] shadow-sm p-10 space-y-10">
          <header className="flex justify-between items-start border-b border-pink-50 pb-6">
            <div>
              <small className="text-[10px] font-bold uppercase tracking-widest text-ink-400">Page 2</small>
              <h3 className="text-2xl font-bold font-serif italic text-ink-900">Content & Testing</h3>
            </div>
            <button 
              onClick={() => { setShowArchive(true); fetchArchive(); }}
              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-pink-500 bg-pink-50 px-4 py-2 rounded-xl hover:bg-pink-100 transition-all border border-pink-100"
            >
              <Plus className="w-3 h-3" /> Add Script
            </button>
          </header>

          <section className="space-y-6">
            <h4 className="text-xs font-bold uppercase tracking-widest text-ink-400 border-b border-pink-50 pb-2">Today's Content Pipeline</h4>
            <div className="space-y-4">
               {scheduledScripts.map(script => (
                 <div key={script.id} className="p-5 bg-cream-50 rounded-2xl border border-cream-200 flex items-center justify-between group">
                   <div className="flex items-center gap-4 flex-1">
                     <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-pink-500">
                       <Video className="w-5 h-5" />
                     </div>
                     <div className="flex-1 min-w-0">
                       <h4 className="text-sm font-bold italic font-serif text-ink-900 group-hover:text-pink-600 transition-colors">{script.title}</h4>
                       <p className="text-[10px] uppercase tracking-widest text-ink-400">{products[script.productId] || 'Product'}</p>
                       <input 
                         type="text"
                         placeholder="Sync TikTok Link..."
                         value={script.videoUrl || ''}
                         onChange={async (e) => {
                           try {
                             await updateDoc(doc(db, 'scripts', script.id), { videoUrl: e.target.value });
                             fetchData();
                           } catch (err) { console.error(err); }
                         }}
                         className="mt-2 w-full bg-white/50 border border-pink-100 rounded-lg px-2 py-1 text-[8px] font-bold text-pink-500 placeholder:text-pink-200 focus:ring-1 focus:ring-pink-200 outline-none"
                       />
                     </div>
                   </div>
                   <div className="flex items-center gap-4">
                     <div className="flex gap-1">
                        <div className={`w-2 h-2 rounded-full ${script.videoUrl ? 'bg-emerald-400' : 'bg-pink-200'}`} title={script.videoUrl ? 'Synced' : 'Draft'} />
                     </div>
                     <button onClick={() => removeScriptFromDay(script.id)} className="p-2 text-ink-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                       <Trash2 className="w-4 h-4" />
                     </button>
                   </div>
                 </div>
               ))}
               
               {scheduledScripts.length === 0 && (
                 <div className="text-center py-10 bg-cream-50/50 rounded-3xl border border-dashed border-cream-200">
                   <p className="text-xs text-ink-300 italic">Queue your videos for the sprint.</p>
                 </div>
               )}
            </div>
          </section>

          <section className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-ink-400 border-b border-pink-50 pb-2">Hooks I'm Testing Today</h4>
            <div className="space-y-3">
              {(log.topHooks || ['', '', '', '']).map((hook, n) => (
                <div key={n} className="flex items-center gap-3">
                   <span className="text-[10px] font-bold text-ink-300">{n + 1}.</span>
                   <input 
                     type="text" 
                     value={hook}
                     onChange={(e) => updateHook(n, e.target.value)}
                     placeholder="Scroll-stopping hook idea..."
                     className="w-full bg-cream-50 rounded-xl px-4 py-3 text-sm italic font-serif text-ink-900 border-none focus:ring-2 focus:ring-pink-100"
                   />
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-ink-400 border-b border-pink-50 pb-2">Live Plan Snapshot 🎬</h4>
            <div className="grid grid-cols-1 gap-4">
               <input 
                 type="text" 
                 value={log.livePlan?.offer || ''}
                 onChange={(e) => updateLivePlan('offer', e.target.value)}
                 placeholder="Main Product / Offer"
                 className="w-full bg-pink-50/30 rounded-xl px-4 py-3 text-sm font-bold text-pink-600 border border-pink-100 focus:ring-2 focus:ring-pink-100"
               />
               <textarea 
                 rows={3}
                 value={log.livePlan?.sequence || ''}
                 onChange={(e) => updateLivePlan('sequence', e.target.value)}
                 placeholder="Opening Hook / Sequence"
                 className="w-full bg-pink-50/30 rounded-xl px-4 py-3 text-sm italic font-serif text-pink-600 border border-pink-100 focus:ring-2 focus:ring-pink-100"
               />
            </div>
          </section>
        </article>
      </div>

      <div className="fixed bottom-10 right-10 z-40">
        <button
          onClick={handleSave}
          className="flex items-center gap-3 px-8 py-5 bg-neutral-950 text-white rounded-full font-bold shadow-2xl hover:scale-105 active:scale-95 transition-all group"
        >
          {saved ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Save className="w-5 h-5 group-hover:rotate-12 transition-transform" />}
          {saved ? 'Planner Locked' : 'Save Daily Record'}
        </button>
      </div>

      <AnimatePresence>
        {showArchive && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowArchive(false)} className="absolute inset-0 bg-neutral-950/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white w-full max-w-2xl rounded-[40px] shadow-2xl p-10 flex flex-col max-h-[80vh]">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold italic font-serif">Script Archive</h3>
                <button onClick={() => setShowArchive(false)} className="p-2 hover:bg-neutral-50 rounded-full">
                  <X className="w-5 h-5 text-neutral-400" />
                </button>
              </div>

              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input 
                  type="text" 
                  placeholder="Search your scripts..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-neutral-50 rounded-2xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-neutral-200 border-none"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {archiveScripts.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase())).map(script => (
                  <div key={script.id} className="p-6 bg-neutral-50 rounded-3xl border border-neutral-100 flex items-center justify-between group hover:border-neutral-300 transition-all">
                    <div className="flex-1 min-w-0 mr-4">
                      <h4 className="text-sm font-bold truncate">{script.title}</h4>
                      <p className="text-[10px] text-neutral-400 uppercase tracking-widest">{products[script.productId] || 'Product'} • {script.type}</p>
                    </div>
                    <button 
                      onClick={() => scheduleScript(script)}
                      className="px-4 py-2 bg-neutral-950 text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:scale-105 transition-transform"
                    >
                      <Plus className="w-3 h-3" /> Schedule
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DollarSign = ({ className }: { className?: string }) => <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
