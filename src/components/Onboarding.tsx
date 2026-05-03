import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { 
  TrendingUp, 
  Target, 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  Calculator, 
  PenTool 
} from 'lucide-react';
import { User } from 'firebase/auth';

interface OnboardingProps {
  user: User;
  onComplete: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ user, onComplete }) => {
  const [step, setStep] = useState(1);
  const [tiktokHandle, setTiktokHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleComplete = async () => {
    if (!tiktokHandle.trim()) {
      setError("Please enter your TikTok handle to continue.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        onboarded: true,
        tiktokHandle: tiktokHandle.startsWith('@') ? tiktokHandle : `@${tiktokHandle}`,
      });
      onComplete();
    } catch (err: any) {
      console.error(err);
      setError("Lock-in failed. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      title: "Welcome to ShopBoss",
      description: "Ready to go from 'Creator' to 'CEO'? Built by thenerdycpa.com, ShopBoss is your all-in-one command center for TikTok Shop Affiliate success.",
      icon: TrendingUp,
      color: "bg-emerald-500"
    },
    {
      title: "The Content Engine",
      description: "Input an idea, select your tone, and let our AI blueprint your entire strategy. We generate LinkedIn, X, Instagram drafts + TikTok scripts and platform-specific AI images.",
      icon: PenTool,
      color: "bg-blue-500"
    },
    {
      title: "CPA-Grade Financials",
      description: "Track every deduction: samples, equipment, software, and even mileage. We calculate your estimated taxes automatically so tax time is a breeze.",
      icon: Calculator,
      color: "bg-amber-500"
    },
    {
      title: "Your Identity",
      description: "What is your TikTok handle? This helps us tailor your command center content.",
      icon: ShieldCheck,
      color: "bg-purple-500",
      input: true
    }
  ];

  const currentStep = steps[step - 1];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-neutral-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(50,50,50,0.3)_0%,transparent_50%)]" />
      
      <motion.div 
        key={step}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-2xl bg-white rounded-[40px] p-12 relative overflow-hidden shadow-2xl"
      >
        <div className="flex justify-between items-center mb-12">
          <div className="flex gap-2">
            {steps.map((_, i) => (
              <div 
                key={i} 
                className={`h-1 rounded-full transition-all ${i + 1 === step ? 'w-8 bg-neutral-900' : 'w-2 bg-neutral-100'}`} 
              />
            ))}
          </div>
          <span className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest">Onboarding // Step 0{step}</span>
        </div>

        <div className={`${currentStep.color} w-16 h-16 rounded-3xl flex items-center justify-center mb-8 shadow-lg`}>
          <currentStep.icon className="w-8 h-8 text-white" />
        </div>

        <h2 className="text-4xl font-bold italic font-serif mb-4 tracking-tight">{currentStep.title}</h2>
        <p className="text-neutral-500 leading-relaxed text-lg mb-12">{currentStep.description}</p>

        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold mb-6 border border-red-100 flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 rotate-180" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {currentStep.input && (
          <div className="mb-12">
            <div className="relative">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl font-bold text-neutral-300">@</span>
              <input
                type="text"
                value={tiktokHandle.replace(/^@/, '')}
                onChange={(e) => setTiktokHandle(e.target.value)}
                placeholder="tiktok_handle"
                className="w-full bg-neutral-50 rounded-2xl p-6 pl-12 border-none focus:ring-2 focus:ring-neutral-200 transition-all text-xl font-bold italic placeholder:text-neutral-200"
              />
            </div>
          </div>
        )}

        <div className="flex justify-between items-center">
          {step > 1 && (
            <button 
              onClick={() => setStep(s => s - 1)}
              className="text-neutral-400 font-bold hover:text-neutral-900 transition-colors"
            >
              Back
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={step === steps.length ? handleComplete : () => setStep(s => s + 1)}
            disabled={loading}
            className="px-10 py-5 bg-neutral-950 text-white rounded-full font-bold flex items-center gap-3 hover:translate-x-1 transition-all active:scale-95 shadow-xl shadow-neutral-200"
          >
            {loading ? 'Initializing...' : step === steps.length ? 'Enter the Command Center' : 'Next Step'}
            {!loading && <ArrowRight className="w-5 h-5" />}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
