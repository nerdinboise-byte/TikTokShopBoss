import React, { useState, useEffect } from 'react';
import { generateScriptWorkup } from '../lib/gemini';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { Product, Script } from '../types';
import { 
  Sparkles, 
  Loader2, 
  Video, 
  Archive, 
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
  const [customInfo, setCustomInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'workup' | 'hooks' | 'scripts' | 'seo'>('workup');
  const [savingScriptIds, setSavingScriptIds] = useState<string[]>([]);

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
      const data = await generateScriptWorkup(productInfo, targetAudience);
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

  const saveScriptToArchive = async (script: any, index: number) => {
    const user = auth.currentUser;
    if (!user || !selectedProduct) return;

    const scriptId = `script-archive-${index}`;
    if (savingScriptIds.includes(scriptId)) return;

    setSavingScriptIds(prev => [...prev, scriptId]);
    try {
      await addDoc(collection(db, 'scripts'), {
        userId: user.uid,
        productId: selectedProduct.id,
        title: script.title,
        content: script.content,
        type: script.type,
        hooks: results.hooks || [],
        hashtags: results.hashtags || [],
        caption: results?.captions?.[Math.min(index, results.captions?.length - 1 || 0)] || '',
        savedToArchive: true,
        status: 'Idea',
        createdAt: serverTimestamp()
      });
      alert('Script stored in Warehouse!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'scripts');
    } finally {
      setSavingScriptIds(prev => prev.filter(id => id !== scriptId));
    }
  };

  const saveHookToArchive = async (hook: any, index: number) => {
    const user = auth.currentUser;
    if (!user || !selectedProduct) return;

    const hookId = `hook-archive-${index}`;
    if (savingScriptIds.includes(hookId)) return;

    setSavingScriptIds(prev => [...prev, hookId]);
    try {
      await addDoc(collection(db, 'scripts'), {
        userId: user.uid,
        productId: selectedProduct.id,
        title: `Hook: ${hook.tos}`,
        content: `Visual: ${hook.visual}\n\nVerbal: ${hook.verbal}`,
        type: 'Hook',
        hooks: [hook],
        hashtags: results.hashtags || [],
        caption: results?.captions?.[0] || '',
        savedToArchive: true,
        status: 'Idea',
        createdAt: serverTimestamp()
      });
      alert('Hook stored in Warehouse!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'scripts');
    } finally {
      setSavingScriptIds(prev => prev.filter(id => id !== hookId));
    }
  };

  const addToCalendar = async (script: any, index: number) => {
    const user = auth.currentUser;
    if (!user || !selectedProduct) return;

    const today = new Date().toISOString().split('T')[0];
    setSavingScriptIds(prev => [...prev, `cal-${index}`]);
    try {
      const scriptsPath = 'scripts';
      await addDoc(collection(db, scriptsPath), {
        userId: user.uid,
        productId: selectedProduct.id,
        title: script.title,
        content: script.content,
        type: script.type,
        hooks: results.hooks,
        hashtags: results.hashtags,
        caption: results?.captions?.[Math.min(index, results.captions?.length - 1 || 0)],
        scheduledDate: today,
        savedToArchive: false,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'scripts');
    } finally {
      setSavingScriptIds(prev => prev.filter(id => id !== `cal-${index}`));
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
              <label className="text-[10px] font-bold uppercase tracking-widest text-ink-400 block">3. Additional Info</label>
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
                <div className="flex bg-cream-50 p-3 gap-2 border-b border-pink-50">
                  {['workup', 'hooks', 'scripts', 'seo'].map((tab) => (
                    <button 
                      key={tab}
                      onClick={() => setActiveTab(tab as any)} 
                      className={`flex-1 py-3 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === tab ? 'bg-pink-500 shadow-lg text-white' : 'text-pink-400 hover:bg-pink-50'}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="flex-1 p-10 overflow-y-auto custom-scrollbar">
                  {activeTab === 'workup' && (
                    <div className="prose prose-pink max-w-none text-ink-700 leading-relaxed font-serif italic text-lg px-2">
                      <ReactMarkdown>{results.workup}</ReactMarkdown>
                    </div>
                  )}

                  {activeTab === 'hooks' && (
                    <div className="space-y-8">
                       <header className="flex items-center justify-between border-b border-pink-50 pb-4">
                          <h4 className="text-xl font-bold font-serif italic text-ink-900">Scroll-Stopping Hooks</h4>
                          <span className="text-[10px] font-bold text-pink-400 uppercase tracking-widest">{results?.hooks?.length} Options</span>
                       </header>
                      {results?.hooks?.map((hook: any, i: number) => (
                        <div key={i} className="p-8 bg-cream-50 rounded-[32px] border border-cream-100 space-y-6 relative group hover:border-pink-200 transition-all">
                          <div className="flex items-center justify-between pb-4 border-b border-cream-200">
                            <div className="flex items-center gap-4">
                              <span className="w-8 h-8 rounded-full bg-pink-500 text-white flex items-center justify-center font-bold text-xs">{i + 1}</span>
                              <h4 className="font-bold text-ink-900 italic font-serif">Option {i + 1}</h4>
                            </div>
                            <button 
                              onClick={() => saveHookToArchive(hook, i)}
                              disabled={savingScriptIds.includes(`hook-archive-${i}`)}
                              className="flex items-center gap-2 px-4 py-2 bg-white border border-pink-100 rounded-xl text-[10px] font-bold uppercase tracking-widest text-pink-500 hover:bg-pink-500 hover:text-white transition-all shadow-sm disabled:opacity-50"
                            >
                              {savingScriptIds.includes(`hook-archive-${i}`) ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Archive className="w-3 h-3" />
                              )}
                              Store in Warehouse
                            </button>
                          </div>
                          <div className="grid grid-cols-1 gap-4">
                             <div className="space-y-2">
                               <p className="font-bold text-[10px] uppercase tracking-widest text-pink-400">Visual Component</p>
                               <div className="bg-white p-4 rounded-2xl border border-pink-50 text-ink-700 text-sm leading-relaxed">{hook.visual}</div>
                             </div>
                             <div className="space-y-2">
                               <p className="font-bold text-[10px] uppercase tracking-widest text-pink-400">Text on Screen (TOS)</p>
                               <div className="bg-pink-500 p-4 rounded-2xl text-white font-bold text-sm shadow-lg shadow-pink-100">{hook.tos}</div>
                             </div>
                             <div className="space-y-2">
                               <p className="font-bold text-[10px] uppercase tracking-widest text-pink-400">Verbal Delivery</p>
                               <div className="bg-white p-4 rounded-2xl border border-pink-50 text-ink-950 italic font-serif text-sm">"{hook.verbal}"</div>
                             </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'scripts' && (
                    <div className="space-y-12">
                      <header className="flex items-center justify-between border-b border-pink-50 pb-4">
                          <h4 className="text-xl font-bold font-serif italic text-ink-900">High-Conversion Scripts</h4>
                       </header>
                      {results?.scripts?.map((script: any, i: number) => (
                        <div key={i} className="space-y-6">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                               <h4 className="text-lg font-bold italic font-serif text-ink-900 leading-tight">{script.title}</h4>
                               <div className="flex items-center gap-2 mt-2">
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-pink-500 bg-pink-50 px-3 py-1 rounded-full">{script.type}</span>
                               </div>
                            </div>
                            <div className="flex gap-2">
                               <button 
                                 onClick={() => saveScriptToArchive(script, i)}
                                 disabled={savingScriptIds.includes(`script-archive-${i}`)}
                                 className="flex items-center gap-2 px-4 py-3 bg-white border border-pink-100 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-pink-500 hover:bg-pink-50 shadow-sm disabled:opacity-50"
                               >
                                 {savingScriptIds.includes(`script-archive-${i}`) ? <Loader2 className="w-3 h-3 animate-spin" /> : <Archive className="w-4 h-4" />}
                               </button>
                               <button 
                                 onClick={() => addToCalendar(script, i)}
                                 disabled={savingScriptIds.includes(`cal-${i}`)}
                                 className="p-3 bg-pink-500 rounded-2xl hover:bg-pink-600 transition-all shadow-lg shadow-pink-100 disabled:opacity-50"
                               >
                                 {savingScriptIds.includes(`cal-${i}`) ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Calendar className="w-4 h-4 text-white" />}
                               </button>
                            </div>
                          </div>
                          <div className="bg-cream-50 p-8 rounded-[40px] text-sm text-ink-700 leading-loose whitespace-pre-wrap font-sans border border-cream-100 shadow-inner italic">
                             {script.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'seo' && (
                    <div className="space-y-10">
                      <div className="space-y-6">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-pink-500 flex items-center gap-2">
                          <Hash className="w-3 h-3" /> Trending Tags
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {results?.hashtags?.map((tag: string, i: number) => (
                            <span key={i} className="px-4 py-2 bg-pink-50 text-pink-600 rounded-xl text-xs font-bold border border-pink-100">
                              #{tag.replace('#', '')}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-6">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-pink-500 flex items-center gap-2">
                          <MessageSquare className="w-3 h-3" /> Viral Captions
                        </h4>
                        <div className="space-y-4">
                          {results?.captions?.map((caption: string, i: number) => (
                            <div key={i} className="p-6 bg-cream-50 rounded-3xl text-sm text-ink-700 leading-relaxed italic border border-pink-50 relative group">
                               {caption}
                               <button className="absolute top-4 right-4 text-pink-200 hover:text-pink-500 transition-colors opacity-0 group-hover:opacity-100">
                                 <Plus className="w-4 h-4" />
                               </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                   )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
