import React, { useState, useEffect } from 'react';
import { generateScriptWorkup } from '../lib/gemini';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { Product, Script } from '../types';
import { 
  Sparkles, 
  Loader2, 
  Video, 
  Package, 
  Calendar, 
  CheckCircle2, 
  Plus,
  Search,
  ChevronRight,
  Target,
  FileText,
  Hash,
  MessageSquare
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';

export const AIStudio: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [targetAudience, setTargetAudience] = useState('');
  const [scriptType, setScriptType] = useState('Review');
  const [customInfo, setCustomInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('workup');
  const [savingScriptIds, setSavingScriptIds] = useState<string[]>([]);

  const scriptTypes = [
    'Review',
    'Unboxing',
    'GRWM',
    'Tutorial',
    'Storytelling',
    'Problem/Solution',
    'Showcase'
  ];

  useEffect(() => {
    const fetchProducts = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const q = query(collection(db, 'products'), where('userId', '==', user.uid));
      const snap = await getDocs(q);
      setProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      setTargetAudience(selectedProduct.targetAudience);
    }
  }, [selectedProduct]);

  const handleGenerate = async () => {
    if (!selectedProduct) return;
    setLoading(true);
    try {
      const productInfo = `${selectedProduct.name} by ${selectedProduct.brand}. ${selectedProduct.description}. ${customInfo}`;
      const data = await generateScriptWorkup(productInfo, targetAudience, scriptType);
      setResults(data);
      setActiveTab('workup');

      // Save workup to product for future reference
      const user = auth.currentUser;
      if (user) {
        await updateDoc(doc(db, 'products', selectedProduct.id), {
          workup: data.workup
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const saveOptionToArchive = async (option: any, index: number) => {
    const user = auth.currentUser;
    if (!user || !selectedProduct) return;

    const opId = `op-archive-${index}`;
    if (savingScriptIds.includes(opId)) return;

    setSavingScriptIds(prev => [...prev, opId]);
    try {
      await addDoc(collection(db, 'scripts'), {
        userId: user.uid,
        productId: selectedProduct.id,
        title: `${scriptType} - Option ${index + 1}: ${selectedProduct.name}`,
        content: option.script,
        type: scriptType,
        hooks: [option.hook],
        hashtags: option.hashtags || [],
        caption: option.caption || '',
        savedToArchive: true,
        status: 'Idea',
        createdAt: serverTimestamp()
      });
      alert('Script stored in Warehouse!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'scripts');
    } finally {
      setSavingScriptIds(prev => prev.filter(id => id !== opId));
    }
  };

  const addOptionToCalendar = async (option: any, index: number) => {
    const user = auth.currentUser;
    if (!user || !selectedProduct) return;

    const today = new Date().toISOString().split('T')[0];
    const calId = `cal-${index}`;
    setSavingScriptIds(prev => [...prev, calId]);
    try {
      await addDoc(collection(db, 'scripts'), {
        userId: user.uid,
        productId: selectedProduct.id,
        title: `${scriptType} - Option ${index + 1}: ${selectedProduct.name}`,
        content: option.script,
        type: scriptType,
        hooks: [option.hook],
        hashtags: option.hashtags,
        caption: option.caption,
        scheduledDate: today,
        savedToArchive: false,
        status: 'Scripting',
        createdAt: serverTimestamp()
      });
      alert('Added to today\'s schedule!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'scripts');
    } finally {
      setSavingScriptIds(prev => prev.filter(id => id !== calId));
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <header className="flex items-center justify-between border-b pb-6 border-pink-100">
        <div>
          <h2 className="text-3xl font-bold font-serif tracking-tight">Hook Lab</h2>
          <p className="text-[10px] font-bold uppercase tracking-widest text-pink-400 mt-1">Viral Content Orchestrator</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 text-ink-900">
        <div className="space-y-6">
          <div className="p-8 bg-white rounded-[40px] border border-pink-100 shadow-sm space-y-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-widest text-ink-400 block">1. Select Product</label>
                <button onClick={() => window.dispatchEvent(new CustomEvent('changeTab', { detail: 'products' }))} className="text-[10px] font-bold text-pink-500 hover:underline">+ Add Product</button>
              </div>
              {products.length === 0 ? (
                <div className="p-6 bg-cream-50 rounded-2xl border border-dashed border-pink-100 text-center">
                  <p className="text-[10px] font-bold text-ink-300 uppercase tracking-widest">No products in your catalog</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {products.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedProduct(p)}
                      className={`flex items-center justify-between px-5 py-4 rounded-2xl border text-sm font-bold transition-all ${selectedProduct?.id === p.id ? 'bg-pink-500 text-white border-pink-500 shadow-lg shadow-pink-100' : 'bg-cream-50/50 text-ink-400 border-pink-50/50 hover:bg-cream-50 hover:border-pink-100'}`}
                    >
                      <span className="font-serif italic">{p.name}</span>
                      {selectedProduct?.id === p.id && <CheckCircle2 className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-bold uppercase tracking-widest text-ink-400 block">2. Target Audience</label>
              <input 
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g. Busy moms, tech enthusiasts..."
                className="w-full bg-cream-50 rounded-2xl py-4 px-5 border-none focus:ring-2 focus:ring-pink-100 text-sm font-bold shadow-inner"
              />
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-bold uppercase tracking-widest text-ink-400 block">3. Script Format</label>
              <div className="flex flex-wrap gap-2">
                {scriptTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => setScriptType(type)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${scriptType === type ? 'bg-pink-500 text-white shadow-md' : 'bg-cream-50 text-ink-400 hover:bg-cream-100'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-bold uppercase tracking-widest text-ink-400 block">4. Additional Info</label>
              <textarea 
                rows={3}
                value={customInfo}
                onChange={(e) => setCustomInfo(e.target.value)}
                placeholder="Highlight specific features or viral goals..."
                className="w-full bg-cream-50 rounded-2xl py-4 px-5 border-none focus:ring-2 focus:ring-pink-100 text-sm font-bold shadow-inner resize-none"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading || !selectedProduct}
              data-tour="ai-orchestrator"
              className="w-full py-5 bg-pink-500 text-white rounded-full flex items-center justify-center gap-3 font-bold hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-pink-100 uppercase tracking-widest text-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Viral Blueprint...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-pink-200" />
                  Orchestrate Content
                </>
              )}
            </button>
          </div>
        </div>

        <div className="relative min-h-[600px]">
          <AnimatePresence mode="wait">
            {!results ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center text-pink-200 gap-4 bg-cream-50/50 rounded-[40px] border border-dashed border-pink-100"
              >
                <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-lg shadow-pink-50">
                  <Video className="w-8 h-8 text-pink-300" />
                </div>
                <p className="text-sm font-bold italic font-serif">Configure your lab to start orchestration</p>
              </motion.div>
            ) : (
              <motion.div
                key="results"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-[40px] border border-pink-100 shadow-xl overflow-hidden flex flex-col h-full"
              >
                <div className="flex bg-cream-50 p-3 gap-2 border-b border-pink-50 overflow-x-auto no-scrollbar">
                  <button 
                    onClick={() => setActiveTab('workup')} 
                    className={`whitespace-nowrap px-6 py-3 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === 'workup' ? 'bg-pink-500 shadow-lg text-white' : 'text-pink-400 hover:bg-pink-50'}`}
                  >
                    Strategy
                  </button>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <button 
                      key={i}
                      onClick={() => setActiveTab(`option-${i}`)} 
                      className={`whitespace-nowrap px-6 py-3 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === `option-${i}` ? 'bg-pink-500 shadow-lg text-white' : 'text-pink-400 hover:bg-pink-50'}`}
                    >
                      Option {i + 1}
                    </button>
                  ))}
                </div>

                <div className="flex-1 p-10 overflow-y-auto custom-scrollbar">
                  {activeTab === 'workup' && (
                    <div className="prose prose-pink max-w-none text-ink-700 leading-relaxed font-serif text-lg px-2 shadow-sm rounded-3xl p-6 bg-pink-50/20">
                      <ReactMarkdown>{results.workup}</ReactMarkdown>
                    </div>
                  )}

                  {[0, 1, 2, 3, 4].map((i) => {
                    const option = results.options?.[i];
                    if (!option || activeTab !== `option-${i}`) return null;

                    return (
                      <div key={i} className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-300">
                        <header className="flex items-center justify-between border-b border-pink-50 pb-6">
                           <div>
                             <h4 className="text-2xl font-bold font-serif italic text-ink-900">Script Option {i + 1}</h4>
                             <p className="text-[10px] font-bold text-pink-400 uppercase tracking-widest mt-1">{scriptType} Mastery</p>
                           </div>
                           <div className="flex gap-3">
                              <button 
                                onClick={() => saveOptionToArchive(option, i)}
                                disabled={savingScriptIds.includes(`op-archive-${i}`)}
                                className="flex items-center gap-2 px-6 py-3 bg-white border border-pink-100 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-pink-500 hover:bg-pink-50 shadow-sm disabled:opacity-50 transition-all font-sans"
                              >
                                {savingScriptIds.includes(`op-archive-${i}`) ? <Loader2 className="w-3 h-3 animate-spin" /> : <Package className="w-4 h-4" />}
                                Warehouse
                              </button>
                              <button 
                                onClick={() => addOptionToCalendar(option, i)}
                                disabled={savingScriptIds.includes(`cal-${i}`)}
                                className="flex items-center gap-2 px-6 py-3 bg-pink-500 text-white rounded-2xl hover:bg-pink-600 transition-all shadow-lg shadow-pink-100 disabled:opacity-50 text-[10px] font-bold uppercase tracking-widest"
                              >
                                {savingScriptIds.includes(`cal-${i}`) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                                Today
                              </button>
                           </div>
                        </header>

                        <section className="space-y-6">
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-ink-400 flex items-center gap-2">
                             <Sparkles className="w-3 h-3 text-pink-500" /> Viral Hook
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-cream-50 p-6 rounded-3xl border border-cream-100 space-y-2">
                               <span className="text-[8px] font-bold uppercase text-ink-300">Visual</span>
                               <p className="text-xs text-ink-700 italic leading-relaxed">{option.hook.visual}</p>
                            </div>
                            <div className="bg-pink-500 p-6 rounded-3xl shadow-lg shadow-pink-100 space-y-2">
                               <span className="text-[8px] font-bold uppercase text-white/60">TOS (Text on Screen)</span>
                               <p className="text-sm text-white font-bold">{option.hook.tos}</p>
                            </div>
                            <div className="bg-white p-6 rounded-3xl border border-pink-50 space-y-2">
                               <span className="text-[8px] font-bold uppercase text-pink-300">Verbal</span>
                               <p className="text-xs text-ink-950 font-serif italic">"{option.hook.verbal}"</p>
                            </div>
                          </div>
                        </section>

                        <section className="space-y-6">
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-ink-400 flex items-center gap-2">
                             <FileText className="w-3 h-3 text-pink-500" /> Full Script
                          </h4>
                          <div className="bg-neutral-50 p-8 rounded-[40px] text-sm text-ink-800 leading-loose whitespace-pre-wrap font-sans border border-neutral-100 shadow-inner italic">
                             {option.script}
                          </div>
                        </section>
                        
                        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <div className="space-y-4">
                              <h4 className="text-[10px] font-bold uppercase tracking-widest text-ink-400 flex items-center gap-2">
                                <MessageSquare className="w-3 h-3 text-pink-500" /> Caption
                              </h4>
                              <div className="p-6 bg-cream-50 rounded-3xl text-xs text-ink-700 leading-relaxed italic border border-pink-50">
                                {option.caption}
                              </div>
                           </div>
                           <div className="space-y-4">
                              <h4 className="text-[10px] font-bold uppercase tracking-widest text-ink-400 flex items-center gap-2">
                                <Hash className="w-3 h-3 text-pink-500" /> Keywords
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {option.hashtags.map((tag: string, ti: number) => (
                                  <span key={ti} className="px-4 py-2 bg-pink-50 text-pink-600 rounded-xl text-[10px] font-bold border border-pink-100">
                                    #{tag.replace('#', '')}
                                  </span>
                                ))}
                              </div>
                           </div>
                        </section>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
