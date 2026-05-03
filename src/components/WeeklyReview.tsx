import React, { useState } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Trophy, 
  BarChart3, 
  Lightbulb, 
  Target,
  X,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface WeeklyReviewProps {
  onClose: () => void;
}

export const WeeklyReview: React.FC<WeeklyReviewProps> = ({ onClose }) => {
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    wins: '',
    numbers: '',
    lessons: '',
    nextWeekPlan: ''
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setLoading(true);
    await addDoc(collection(db, 'weekly_reviews'), {
      ...data,
      userId: user.uid,
      timestamp: serverTimestamp(),
      weekEnding: new Date().toISOString()
    });
    setSaved(true);
    setTimeout(onClose, 2000);
  };

  const steps = [
    { id: 1, title: 'Big Wins', desc: 'What went exceptionally well this week? (e.g. video went viral, first $100 day)', icon: Trophy, field: 'wins' },
    { id: 2, title: 'The Numbers', desc: 'Summary of stats or specific milestones hit.', icon: BarChart3, field: 'numbers' },
    { id: 3, title: 'Hard Lessons', desc: 'What didnt work? What will you stop doing?', icon: Lightbulb, field: 'lessons' },
    { id: 4, title: 'Attack Plan', desc: '3 core focuses for next week.', icon: Target, field: 'nextWeekPlan' }
  ];

  const current = steps[step - 1];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 text-neutral-900">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-neutral-950/80 backdrop-blur-xl" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 40 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        exit={{ opacity: 0, scale: 0.95, y: 40 }}
        className="relative bg-white w-full max-w-2xl rounded-[60px] shadow-2xl p-16 overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-neutral-100">
           <div className="h-full bg-neutral-900 transition-all duration-500" style={{ width: `${(step / steps.length) * 100}%` }} />
        </div>

        <button onClick={onClose} className="absolute top-8 right-8 p-2 hover:bg-neutral-50 rounded-full transition-colors"><X className="w-6 h-6" /></button>

        {saved ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
             <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-10 h-10" />
             </div>
             <h2 className="text-3xl font-bold italic font-serif mb-2">Metrics Archived</h2>
             <p className="text-neutral-400">Your week-end closeout is locked into the ledger.</p>
          </div>
        ) : (
          <div className="space-y-12">
            <header>
               <div className="flex items-center gap-3 mb-4 text-neutral-400">
                  <current.icon className="w-5 h-5" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Step {step} of 4 // Review Cycle</span>
               </div>
               <h2 className="text-4xl font-bold italic font-serif mb-4">{current.title}</h2>
               <p className="text-lg text-neutral-500 leading-relaxed italic">{current.desc}</p>
            </header>

            <textarea 
              value={(data as any)[current.field]}
              onChange={(e) => setData({ ...data, [(current as any).field]: e.target.value })}
              placeholder="Start typing..."
              className="w-full h-48 bg-neutral-50 rounded-[40px] p-10 border-none focus:ring-2 focus:ring-neutral-200 text-xl font-medium resize-none placeholder:text-neutral-200"
              autoFocus
            />

            <div className="flex justify-between items-center pt-8 border-t border-neutral-100">
               <button 
                 disabled={step === 1}
                 onClick={() => setStep(s => s - 1)}
                 className="text-sm font-bold text-neutral-300 hover:text-neutral-900 transition-colors disabled:opacity-0"
               >
                 Go Back
               </button>
               
               {step < 4 ? (
                 <button 
                   onClick={() => setStep(s => s + 1)}
                   className="px-10 py-5 bg-neutral-900 text-white rounded-full font-bold shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                 >
                   Continue <Sparkles className="w-4 h-4" />
                 </button>
               ) : (
                 <button 
                   onClick={handleSubmit}
                   className="px-10 py-5 bg-emerald-500 text-white rounded-full font-bold shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                 >
                   Finalize Week <CheckCircle2 className="w-4 h-4" />
                 </button>
               )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
