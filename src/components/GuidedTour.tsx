import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronRight, 
  ChevronLeft, 
  X, 
  Sparkles,
  Info
} from 'lucide-react';

interface TourStep {
  target: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  tab?: string;
}

interface GuidedTourProps {
  onComplete: () => void;
  activeTab: string;
  onTabChange: (tab: any) => void;
}

export const GuidedTour: React.FC<GuidedTourProps> = ({ onComplete, activeTab, onTabChange }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, height: 0 });

  const steps: TourStep[] = [
    {
      target: '[data-tour="sidebar-dashboard"]',
      title: "Command Center",
      content: "This is your starting point. Track your daily wins, goals, and high-level stats at a glance.",
      position: 'right',
      tab: 'dashboard'
    },
    {
      target: '[data-tour="sidebar-planner"]',
      title: "Daily Spread",
      content: "Map your daily moves here. Schedule your videos, scripts, and track your content pipeline.",
      position: 'right',
      tab: 'planner'
    },
    {
      target: '[data-tour="sidebar-studio"]',
      title: "AI Studio",
      content: "The brains of the operation. Use AI to generate viral scripts, hooks, and strategic analysis for any product.",
      position: 'right',
      tab: 'studio'
    },
    {
      target: '[data-tour="sidebar-products"]',
      title: "Product Catalog",
      content: "Manage your product portfolio. Store specs, target audiences, and AI analyses of your products.",
      position: 'right',
      tab: 'products'
    },
    {
      target: '[data-tour="sidebar-warehouse"]',
      title: "The Warehouse",
      content: "Your vault of viral ideas. Every hook and script you save is stored here for easy access.",
      position: 'right',
      tab: 'warehouse'
    },
    {
      target: '[data-tour="sidebar-financials"]',
      title: "Financials & Tax",
      content: "Real-time tax tracking. Log expenses, deductions, and income to stay CPA-ready.",
      position: 'right',
      tab: 'financials'
    },
    {
      target: '[data-tour="ai-orchestrator"]',
      title: "Viral Orchestrator",
      content: "Ready to go viral? Start by selecting a product and letting the AI do the heavy lifting.",
      position: 'left',
      tab: 'studio'
    }
  ];

  const updatePosition = useCallback(() => {
    const step = steps[currentStep];
    const element = document.querySelector(step.target);
    
    if (element) {
      const rect = element.getBoundingClientRect();
      setCoords({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      });
    }
  }, [currentStep, steps]);

  useEffect(() => {
    const step = steps[currentStep];
    if (step.tab && activeTab !== step.tab) {
      onTabChange(step.tab);
    }
    
    // Brief delay to allow DOM/React to render the new tab
    const timeout = setTimeout(updatePosition, 150);
    window.addEventListener('resize', updatePosition);
    
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', updatePosition);
    };
  }, [currentStep, activeTab, onTabChange, updatePosition]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(s => s - 1);
    }
  };

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-[200] pointer-events-none">
      {/* Dimmed Background with Hole */}
      <div 
        className="absolute inset-0 bg-neutral-950/60 transition-all duration-500"
        style={{
          clipPath: `polygon(
            0% 0%, 0% 100%, 100% 100%, 100% 0%, 
            0% 0%, 
            ${coords.left - 8}px ${coords.top - 8}px, 
            ${coords.left + coords.width + 8}px ${coords.top - 8}px, 
            ${coords.left + coords.width + 8}px ${coords.top + coords.height + 8}px, 
            ${coords.left - 8}px ${coords.top + coords.height + 8}px, 
            ${coords.left - 8}px ${coords.top - 8}px
          )`
        }}
      />

      {/* Floating Popover */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          className="absolute z-[210] pointer-events-auto w-80"
          style={{
            top: step.position === 'bottom' ? coords.top + coords.height + 24 : 
                 step.position === 'top' ? coords.top - 200 : 
                 coords.top + coords.height / 2 - 100,
            left: step.position === 'right' ? coords.left + coords.width + 24 : 
                  step.position === 'left' ? coords.left - 344 : 
                  coords.left + coords.width / 2 - 160,
          }}
        >
          <div className="bg-white rounded-[32px] p-8 shadow-2xl border border-pink-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-neutral-100">
               <motion.div 
                 className="h-full bg-pink-500"
                 initial={{ width: 0 }}
                 animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
               />
            </div>

            <button 
              onClick={onComplete}
              className="absolute top-4 right-4 p-2 text-neutral-300 hover:text-neutral-900 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-pink-50 flex items-center justify-center">
                 <Sparkles className="w-4 h-4 text-pink-500" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-pink-400">Step {currentStep + 1} of {steps.length}</span>
            </div>

            <h3 className="text-xl font-bold font-serif italic text-ink-900 mb-2">{step.title}</h3>
            <p className="text-sm text-ink-400 leading-relaxed mb-8">{step.content}</p>

            <div className="flex items-center justify-between">
              <button
                onClick={handleBack}
                disabled={currentStep === 0}
                className={`text-xs font-bold transition-all ${currentStep === 0 ? 'text-neutral-200' : 'text-neutral-400 hover:text-neutral-900'}`}
              >
                Back
              </button>
              <button
                onClick={handleNext}
                className="px-6 py-3 bg-neutral-950 text-white rounded-2xl text-xs font-bold flex items-center gap-2 hover:translate-x-1 transition-all"
              >
                {currentStep === steps.length - 1 ? "Finish Tour" : "Next Step"}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Pulsing Target Indicator (Optional) */}
      <motion.div 
        className="absolute border-2 border-pink-500 rounded-2xl pointer-events-none z-[190]"
        initial={false}
        animate={{
          top: coords.top - 8,
          left: coords.left - 8,
          width: coords.width + 16,
          height: coords.height + 16,
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          opacity: { repeat: Infinity, duration: 2 },
          layout: { type: "spring", bounce: 0.2 }
        }}
      />
    </div>
  );
};
