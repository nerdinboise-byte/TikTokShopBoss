import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Video, 
  ShoppingBag, 
  ArrowUpRight,
  Target,
  Trophy,
  Lightbulb,
  ChevronRight,
  Settings2,
  X,
  RefreshCcw
} from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { DailyLog, UserProfile, GoalSet } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { WeeklyReview } from './WeeklyReview';

interface DashboardProps {
  onUpdate?: (uid: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onUpdate }) => {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [goals, setGoals] = useState<GoalSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [editGoals, setEditGoals] = useState<Partial<GoalSet>>({
    gmvGoal: 5000,
    commissionGoal: 1000,
    videosTarget: 30,
    livesTarget: 12
  });

  const [syncing, setSyncing] = useState(false);

  const fetchData = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const logsPath = 'daily_logs';
      const usersPath = 'users';
      const goalsPath = 'goals';

      const [logsSnap, profileSnap, goalsSnap] = await Promise.all([
        getDocs(query(collection(db, logsPath), where('userId', '==', user.uid), orderBy('date', 'desc'), limit(30))).catch(e => handleFirestoreError(e, OperationType.LIST, logsPath)),
        getDoc(doc(db, usersPath, user.uid)).catch(e => handleFirestoreError(e, OperationType.GET, `${usersPath}/${user.uid}`)),
        getDoc(doc(db, goalsPath, user.uid)).catch(e => handleFirestoreError(e, OperationType.GET, `${goalsPath}/${user.uid}`))
      ]);

      const logsData = (logsSnap as any).docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as DailyLog));
      setLogs(logsData);
      const profileData = (profileSnap as any).data() as UserProfile;
      setProfile(profileData);
      
      if ((goalsSnap as any).exists()) {
        const goalData = (goalsSnap as any).data() as GoalSet;
        setGoals(goalData);
        setEditGoals(goalData);
      } else {
        const defaultGoals = { userId: user.uid, gmvGoal: 5000, commissionGoal: 1000, videosTarget: 30, livesTarget: 12 } as GoalSet;
        setGoals(defaultGoals);
        setEditGoals(defaultGoals);
      }
    } catch (error) {
      console.error("Dashboard fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTikTokConnect = async () => {
    try {
      const res = await fetch('/api/tiktok/auth');
      const { url } = await res.json();
      window.open(url, 'tiktok_oauth', 'width=600,height=700');
    } catch (err) {
      console.error('TikTok link failed:', err);
      alert('Failed to connect to TikTok');
    }
  };

  const syncTikTokData = async () => {
    if (!profile?.tiktokAccessToken) {
      handleTikTokConnect();
      return;
    }

    setSyncing(true);
    try {
      const res = await fetch('/api/tiktok/fetch-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: profile.tiktokAccessToken })
      });
      const data = await res.json();

      if (data.error) throw new Error(data.error);

      // Map dynamic TikTok data to internal daily logs
      const today = new Date().toISOString().split('T')[0];
      const todayLog = logs.find(l => l.date === today);
      
      const updatedIncome = {
        ...todayLog?.income,
        affiliate: (todayLog?.income?.affiliate || 0) + (data.sales?.[0]?.amount || 0)
      };

      const updatedMetrics = {
        ...todayLog?.metrics,
        views: (todayLog?.metrics?.views || 0) + data.videos.reduce((sum: number, v: any) => sum + (v.view_count || 0), 0),
        gmv: (todayLog?.metrics?.gmv || 0) + (data.sales?.[0]?.amount || 0),
        videosPosted: data.videos.length
      };

      const logId = todayLog?.id || doc(collection(db, 'daily_logs')).id;
      await setDoc(doc(db, 'daily_logs', logId), {
        userId: profile.uid,
        date: today,
        income: updatedIncome,
        metrics: updatedMetrics,
        updatedAt: serverTimestamp()
      }, { merge: true });

      alert('TikTok stats synced successfully!');
      fetchData();
    } catch (err: any) {
      console.error('Sync failed:', err);
      alert('Sync failed: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'TIKTOK_AUTH_SUCCESS') {
        const { tokens } = event.data;
        const user = auth.currentUser;
        if (!user) return;

        try {
          await setDoc(doc(db, 'users', user.uid), {
            tiktokAccessToken: tokens.access_token,
            tiktokRefreshToken: tokens.refresh_token,
            tiktokTokenExpiry: Date.now() + (tokens.expires_in * 1000),
            updatedAt: serverTimestamp()
          }, { merge: true });
          
          fetchData();
        } catch (err) {
          console.error('Failed to save TikTok tokens:', err);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [profile]);

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveGoals = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const goalsPath = 'goals';
    try {
      await setDoc(doc(db, goalsPath, user.uid), {
        ...editGoals,
        userId: user.uid,
        updatedAt: serverTimestamp()
      });
      setGoals({ ...editGoals, userId: user.uid } as GoalSet);
      setShowGoalModal(false);
      if (onUpdate) onUpdate(user.uid);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${goalsPath}/${user.uid}`);
    }
  };

  const totalGMV = logs.reduce((sum, log) => sum + (log.metrics?.gmv || 0), 0);
  const totalVideos = logs.reduce((sum, log) => sum + (log.metrics?.videosPosted || 0), 0);
  const totalCommission = logs.reduce((sum, log) => {
    if (!log.income) return sum;
    return sum + Object.values(log.income).reduce((a, b) => a + (b || 0), 0);
  }, 0);

  const gmvProgress = Math.min(100, (totalGMV / (goals?.gmvGoal || 1)) * 100);
  const videosProgress = Math.min(100, (totalVideos / (goals?.videosTarget || 1)) * 100);
  const commProgress = Math.min(100, (totalCommission / (goals?.commissionGoal || 1)) * 100);
  const livesProgress = Math.min(100, (logs.reduce((sum, l) => sum + (l.metrics?.livesCompleted || 0), 0) / (goals?.livesTarget || 12)) * 100);

  if (loading) return <div className="flex items-center justify-center p-20 text-neutral-400 font-mono text-xs uppercase tracking-widest italic">Syncing with TikTok API...</div>;

  return (
    <div className="space-y-10 pb-20 text-ink-900">
      <header className="flex items-center justify-between border-b pb-8 border-pink-100">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 bg-pink-500 rounded-full animate-pulse" />
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-400">Live Command Center</h2>
          </div>
          <h1 className="text-4xl font-bold font-serif tracking-tight">Let's stack some commissions, <em>boss.</em></h1>
          <p className="text-pink-400 text-sm font-medium mt-1 uppercase tracking-widest font-serif italic">Welcome back, {profile?.tiktokHandle || profile?.displayName || 'Creator'}</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={syncTikTokData}
            disabled={syncing}
            className={`flex items-center gap-2 px-4 py-2 bg-neutral-950 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all hover:bg-neutral-800 ${syncing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <RefreshCcw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : profile?.tiktokAccessToken ? 'Sync TikTok' : 'Connect TikTok'}
          </button>
          <button 
            onClick={() => setShowGoalModal(true)}
            className="p-3 bg-white border border-pink-100 rounded-2xl shadow-sm hover:bg-pink-50 transition-all group"
          >
            <Settings2 className="w-5 h-5 text-pink-400 group-hover:rotate-90 transition-transform" />
          </button>
        </div>
      </header>

      {/* Goal Progress Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.article 
          whileHover={{ y: -5 }}
          className="p-8 bg-white border border-pink-100 rounded-[32px] shadow-sm relative overflow-hidden group"
        >
          <small className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-400">Sprint Revenue</small>
          <div className="flex items-baseline gap-2 mt-2 mb-4">
            <strong className="text-3xl font-bold font-serif italic tracking-tighter text-ink-900">${totalCommission.toLocaleString()}</strong>
            <span className="text-[10px] text-ink-300 font-bold">of $${(goals?.commissionGoal || 0).toLocaleString()}</span>
          </div>
          <div className="h-2 bg-pink-50 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${commProgress}%` }} className="h-full bg-pink-500" />
          </div>
          <p className="text-[10px] font-bold text-pink-600 mt-2 uppercase tracking-widest">{commProgress.toFixed(0)}% to goal</p>
        </motion.article>

        <motion.article 
          whileHover={{ y: -5 }}
          className="p-8 bg-white border border-pink-100 rounded-[32px] shadow-sm relative overflow-hidden group"
        >
          <small className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-400">Videos Posted</small>
          <div className="flex items-baseline gap-2 mt-2 mb-4">
            <strong className="text-3xl font-bold font-serif italic tracking-tighter text-ink-900">{totalVideos}</strong>
            <span className="text-[10px] text-ink-300 font-bold">of {goals?.videosTarget || 0}</span>
          </div>
          <div className="h-2 bg-pink-50 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${videosProgress}%` }} className="h-full bg-pink-500" />
          </div>
          <p className="text-[10px] font-bold text-pink-600 mt-2 uppercase tracking-widest">{videosProgress.toFixed(0)}% logged</p>
        </motion.article>

        <motion.article 
          whileHover={{ y: -5 }}
          className="p-8 bg-white border border-pink-100 rounded-[32px] shadow-sm relative overflow-hidden group"
        >
          <small className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-400">Lives Completed</small>
          <div className="flex items-baseline gap-2 mt-2 mb-4">
            <strong className="text-3xl font-bold font-serif italic tracking-tighter text-ink-900">{logs.reduce((sum, l) => sum + (l.metrics?.livesCompleted || 0), 0)}</strong>
            <span className="text-[10px] text-ink-300 font-bold">of {goals?.livesTarget || 12}</span>
          </div>
          <div className="h-2 bg-pink-50 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${livesProgress}%` }} className="h-full bg-pink-500" />
          </div>
          <p className="text-[10px] font-bold text-pink-600 mt-2 uppercase tracking-widest">Sprint focus</p>
        </motion.article>

        <motion.article 
          whileHover={{ y: -5 }}
          className="p-8 bg-white border border-pink-100 rounded-[32px] shadow-sm relative overflow-hidden group"
        >
          <small className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-400">Days Logged</small>
          <div className="flex items-baseline gap-2 mt-2 mb-4">
            <strong className="text-3xl font-bold font-serif italic tracking-tighter text-ink-900">{logs.length}</strong>
            <span className="text-[10px] text-ink-300 font-bold">of 30 Days</span>
          </div>
          <div className="h-2 bg-pink-50 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${(logs.length / 30) * 100}%` }} className="h-full bg-pink-500" />
          </div>
          <p className="text-[10px] font-bold text-pink-600 mt-2 uppercase tracking-widest">Sprint Velocity</p>
        </motion.article>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Today's Top 3 Money Moves */}
        <div className="p-10 bg-white border border-pink-100 rounded-[40px] shadow-sm">
           <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold italic font-serif">Today's top 3 money moves</h3>
              <span className="px-3 py-1 bg-pink-50 text-pink-600 rounded-full text-[10px] font-bold uppercase tracking-widest">CEO Page</span>
           </div>
           
           <div className="space-y-4">
              {(logs[0]?.moneyMoves || ['Film 5 hero product angles', 'Go live 6:00-7:30 PM', 'Research trending hooks']).map((move, n) => (
                <div key={n} className="flex items-center gap-4 p-5 bg-pink-50/50 rounded-2xl border border-pink-100/50">
                  <span className="w-8 h-8 rounded-full bg-pink-500 text-white flex items-center justify-center font-bold text-xs">{n + 1}</span>
                  <span className="text-sm font-medium text-ink-700 italic">
                    {move || 'Plan next money move...'}
                  </span>
                </div>
              ))}
           </div>
        </div>

        {/* Hero Products Section */}
        <div className="p-10 bg-white border border-pink-100 rounded-[40px] shadow-sm">
           <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold italic font-serif">Hero products pushed today</h3>
              <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold uppercase tracking-widest">Affiliate Focus</span>
           </div>
           
           <div className="space-y-4">
              <div className="flex items-center justify-between p-5 bg-cream-100 rounded-2xl border border-cream-200">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-pink-500" />
                  <span className="text-sm font-bold text-ink-900">Viral Lash Mascara</span>
                </div>
                <span className="text-xs font-bold text-ink-400">4 / 5 videos</span>
              </div>
              <div className="flex items-center justify-between p-5 bg-cream-100 rounded-2xl border border-cream-200">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-sm font-bold text-ink-900">Collagen Jelly Mask</span>
                </div>
                <span className="text-xs font-bold text-ink-400">3 / 3 videos</span>
              </div>
           </div>
           
           <button 
             className="w-full mt-8 py-3 text-pink-600 font-bold text-sm hover:underline"
           >
              Manage products →
           </button>
        </div>
      </div>

      <AnimatePresence>
        {showGoalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 text-neutral-900">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowGoalModal(false)} className="absolute inset-0 bg-neutral-950/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white w-full max-w-lg rounded-[40px] shadow-2xl p-10">
               <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-bold italic font-serif underline decoration-neutral-100 underline-offset-8">Configure 30-Day Goals</h3>
                  <button onClick={() => setShowGoalModal(false)} className="p-2 hover:bg-neutral-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>
               </div>
               
               <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2 block">GMV Sales Goal ($)</label>
                    <input 
                      type="number" 
                      value={editGoals.gmvGoal}
                      onChange={(e) => setEditGoals({ ...editGoals, gmvGoal: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-neutral-50 rounded-2xl p-4 border-none focus:ring-2 focus:ring-neutral-200 text-xl font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2 block">Commission Payout Goal ($)</label>
                    <input 
                      type="number" 
                      value={editGoals.commissionGoal}
                      onChange={(e) => setEditGoals({ ...editGoals, commissionGoal: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-neutral-50 rounded-2xl p-4 border-none focus:ring-2 focus:ring-neutral-200 text-xl font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2 block">Monthly Video Target</label>
                    <input 
                      type="number" 
                      value={editGoals.videosTarget}
                      onChange={(e) => setEditGoals({ ...editGoals, videosTarget: parseInt(e.target.value) || 0 })}
                      className="w-full bg-neutral-50 rounded-2xl p-4 border-none focus:ring-2 focus:ring-neutral-200 text-xl font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2 block">Monthly Lives Target</label>
                    <input 
                      type="number" 
                      value={editGoals.livesTarget}
                      onChange={(e) => setEditGoals({ ...editGoals, livesTarget: parseInt(e.target.value) || 0 })}
                      className="w-full bg-neutral-50 rounded-2xl p-4 border-none focus:ring-2 focus:ring-neutral-200 text-xl font-bold"
                    />
                  </div>
                  
                  <button 
                    onClick={handleSaveGoals}
                    className="w-full py-5 bg-neutral-950 text-white rounded-2xl font-bold shadow-lg hover:scale-[1.02] active:scale-95 transition-all mt-4"
                  >
                    Lock Goals // Update Velocity
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showReview && (
          <WeeklyReview onClose={() => setShowReview(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};
