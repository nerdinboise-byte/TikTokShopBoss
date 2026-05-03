import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, getDocs, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { Script, Product } from '../types';
import { 
  Archive, 
  Search, 
  Trash2, 
  Video, 
  Calendar, 
  ChevronRight,
  Filter,
  Sparkles,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const Warehouse: React.FC = () => {
  const [items, setItems] = useState<Script[]>([]);
  const [products, setProducts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'Script' | 'Hook'>('all');
  const [selectedItem, setSelectedItem] = useState<Script | null>(null);

  const fetchData = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      // Fetch archived scripts - simplified query to avoid index issues
      const q = query(
        collection(db, 'scripts'), 
        where('userId', '==', user.uid), 
        where('savedToArchive', '==', true)
      );
      const snap = await getDocs(q).catch(e => handleFirestoreError(e, OperationType.LIST, 'scripts'));
      if (snap) {
        // Sort manually to avoid index requirement
        const scriptItems = (snap as any).docs
          .map((doc: any) => ({ id: doc.id, ...doc.data() } as Script))
          .sort((a, b) => {
            const dateA = a.createdAt?.toDate?.() || new Date(0);
            const dateB = b.createdAt?.toDate?.() || new Date(0);
            return dateB.getTime() - dateA.getTime();
          });
        setItems(scriptItems);
      }

      // Fetch products for grouping/names
      const pq = query(collection(db, 'products'), where('userId', '==', user.uid));
      const psnap = await getDocs(pq).catch(e => handleFirestoreError(e, OperationType.LIST, 'products'));
      if (psnap) {
        const prodMap: Record<string, string> = {};
        (psnap as any).docs.forEach((d: any) => {
          prodMap[d.id] = (d.data() as Product).name;
        });
        setProducts(prodMap);
      }
    } catch (error) {
      console.error("Warehouse fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, 'scripts', id));
      setItems(prev => prev.filter(i => i.id !== id));
      if (selectedItem?.id === id) setSelectedItem(null);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddToPlanner = async (script: Script) => {
    const user = auth.currentUser;
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    
    try {
      // Create a copy of the script for the planner
      const scriptId = doc(collection(db, 'scripts')).id;
      // Using addDoc or setDoc with a generated ID
      const { setDoc, serverTimestamp } = await import('firebase/firestore');
      await setDoc(doc(db, 'scripts', scriptId), {
        userId: user.uid,
        productId: script.productId,
        title: script.title,
        content: script.content,
        type: script.type,
        scheduledDate: today,
        savedToArchive: false,
        status: 'To Film',
        createdAt: serverTimestamp()
      });
      alert('Content added to today\'s Daily Spread!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'scripts');
    }
  };

  const filteredItems = items.filter(item => {
    const productName = products[item.productId] || '';
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         productName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || item.type === filterType;
    return matchesSearch && matchesFilter;
  });

  // Group by product
  const groupedItems = filteredItems.reduce((acc, item) => {
    const pName = products[item.productId] || 'Uncategorized';
    if (!acc[pName]) acc[pName] = [];
    acc[pName].push(item);
    return acc;
  }, {} as Record<string, Script[]>);

  return (
    <div className="space-y-8 pb-20 text-ink-900">
      <header className="flex items-center justify-between border-b pb-6 border-pink-100">
        <div>
          <h2 className="text-3xl font-bold font-serif tracking-tight">Script Warehouse</h2>
          <p className="text-[10px] font-bold uppercase tracking-widest text-pink-400 mt-1">Your high-converting creative arsenal.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
              <input 
                type="text" 
                placeholder="Search warehouse..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-pink-100 rounded-2xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-pink-100 outline-none"
              />
            </div>
            
            <div className="flex gap-2">
              {(['all', 'Script', 'Hook'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border ${filterType === type ? 'bg-pink-500 text-white border-pink-500' : 'bg-cream-50 text-pink-400 border-pink-50 hover:border-pink-100'}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {Object.entries(groupedItems).map(([productName, productItems]) => (
              <div key={productName} className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-pink-400 px-2 flex items-center gap-2">
                  <div className="h-px bg-pink-100 flex-1" />
                  {productName}
                  <div className="h-px bg-pink-100 flex-1" />
                </h4>
                {productItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between group ${selectedItem?.id === item.id ? 'bg-pink-500 border-pink-500 text-white shadow-lg' : 'bg-white border-pink-50 hover:border-pink-200 shadow-sm'}`}
                  >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${selectedItem?.id === item.id ? 'bg-white/20' : 'bg-pink-50'}`}>
                      {item.type === 'Hook' ? <Sparkles className="w-4 h-4 text-pink-500" /> : <Video className="w-4 h-4 text-pink-500" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold truncate font-serif italic max-w-[150px]">{item.title}</p>
                      <div className="flex items-center gap-2">
                        <p className={`text-[10px] uppercase tracking-widest ${selectedItem?.id === item.id ? 'text-white/60' : 'text-pink-400 font-bold'}`}>{item.type}</p>
                        {item.videoUrl && <div className="w-1 h-1 rounded-full bg-emerald-400" title="Strategically Linked to TikTok" />}
                      </div>
                    </div>
                  </div>
                    <div className="flex items-center gap-2">
                       <button onClick={(e) => handleDelete(item.id, e)} className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity ${selectedItem?.id === item.id ? 'hover:bg-white/20 text-white' : 'hover:bg-red-50 text-red-400'}`}>
                         <Trash2 className="w-3.5 h-3.5" />
                       </button>
                       <ChevronRight className={`w-4 h-4 ${selectedItem?.id === item.id ? 'text-white' : 'text-ink-200'}`} />
                    </div>
                  </button>
                ))}
              </div>
            ))}
            {filteredItems.length === 0 && !loading && (
              <div className="text-center py-20 bg-cream-50/50 rounded-[40px] border border-dashed border-pink-100">
                <Archive className="w-12 h-12 mx-auto mb-4 text-pink-100" />
                <p className="text-sm font-serif italic text-ink-300">The warehouse is empty.</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {selectedItem ? (
              <motion.div
                key={selectedItem.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="bg-white rounded-[40px] border border-pink-100 p-10 shadow-sm space-y-8"
              >
                <header className="flex justify-between items-start border-b border-pink-50 pb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                       <span className="px-2 py-1 bg-pink-50 rounded text-[10px] font-bold text-pink-500 uppercase tracking-widest">{selectedItem.type}</span>
                       <span className="text-[10px] font-bold text-ink-300 uppercase tracking-widest">• {products[selectedItem.productId]}</span>
                    </div>
                    <h3 className="text-3xl font-bold font-serif italic text-ink-900 tracking-tight">{selectedItem.title}</h3>
                  </div>
                  <div className="flex items-center gap-3">
                     <button 
                       onClick={() => handleAddToPlanner(selectedItem)}
                       className="flex items-center gap-2 px-6 py-3 bg-pink-500 text-white rounded-full hover:bg-pink-600 transition-all shadow-xl shadow-pink-100 font-bold text-[10px] uppercase tracking-widest"
                     >
                        <Plus className="w-4 h-4" /> Schedule to Spread
                     </button>
                  </div>
                </header>

                <section className="space-y-4">
                   <h4 className="text-[10px] font-bold uppercase tracking-widest text-ink-400">Creative Content</h4>
                   <div className="p-8 bg-cream-50 rounded-[40px] border border-cream-100 text-ink-700 leading-loose italic font-serif whitespace-pre-wrap">
                      {selectedItem.content}
                   </div>
                </section>

                <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-4">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-ink-400 flex items-center gap-2">
                         <MessageSquare className="w-3 h-3" /> Caption
                      </h4>
                      <div className="p-6 bg-pink-50/50 rounded-3xl border border-pink-50 text-sm text-pink-600 italic">
                         {selectedItem.caption || "No caption stored."}
                      </div>
                   </div>
                   <div className="space-y-4">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-ink-400 flex items-center gap-2">
                         <Search className="w-3 h-3" /> SEO Strategy
                      </h4>
                      <div className="flex flex-wrap gap-2">
                         {selectedItem.hashtags?.map((tag, i) => (
                           <span key={i} className="px-3 py-1 bg-white border border-pink-100 rounded-lg text-[10px] font-bold text-pink-500 uppercase tracking-tighter">
                             #{tag.replace('#', '')}
                           </span>
                         ))}
                      </div>
                   </div>
                </section>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-10 bg-cream-50/50 rounded-[40px] border border-dashed border-pink-100 min-h-[500px]">
                <Archive className="w-20 h-20 text-pink-100 mb-6" />
                <h3 className="text-2xl font-bold font-serif italic text-ink-300">Select an Item</h3>
                <p className="text-sm text-ink-300 max-w-xs mt-2 font-medium">Revisit your best hooks and scripts to scale your results.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
