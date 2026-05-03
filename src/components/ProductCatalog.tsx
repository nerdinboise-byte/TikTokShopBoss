import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, deleteDoc, doc, orderBy, updateDoc, setDoc } from 'firebase/firestore';
import { Product, Script } from '../types';
import { 
  ShoppingBag, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Search, 
  ChevronRight,
  FileText,
  Target,
  Sparkles,
  Archive,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';

export const ProductCatalog: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newProduct, setNewProduct] = useState({ name: '', brand: '', link: '', description: '', targetAudience: '' });
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productScripts, setProductScripts] = useState<Script[]>([]);
  const [generating, setGenerating] = useState(false);

  const fetchData = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const productsPath = 'products';
      const q = query(collection(db, productsPath), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q).catch(e => handleFirestoreError(e, OperationType.LIST, productsPath));
      if (snap) {
        setProducts((snap as any).docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Product)));
        // Update selected product if it's already open
        if (selectedProduct) {
          const updated = (snap as any).docs.find((d: any) => d.id === selectedProduct.id);
          if (updated) setSelectedProduct({ id: updated.id, ...updated.data() } as Product);
        }
      }
    } catch (error) {
      console.error("Products fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateWorkup = async () => {
    if (!selectedProduct) return;
    setGenerating(true);
    try {
      const { generateScriptWorkup } = await import('../lib/gemini');
      const productInfo = `${selectedProduct.name} by ${selectedProduct.brand}. ${selectedProduct.description}`;
      const data = await generateScriptWorkup(productInfo, selectedProduct.targetAudience);
      
      await updateDoc(doc(db, 'products', selectedProduct.id), {
        workup: data.workup
      });
      
      await fetchData();
    } catch (error) {
      console.error("Workup generation failed:", error);
    } finally {
      setGenerating(false);
    }
  };

  const fetchScripts = async (productId: string) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const scriptsPath = 'scripts';
      const q = query(collection(db, scriptsPath), where('userId', '==', user.uid), where('productId', '==', productId));
      const snap = await getDocs(q);
      setProductScripts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Script)));
    } catch (error) {
      console.error("Scripts fetch error:", error);
    }
  };

  const handleAddToPlanner = async (script: Script) => {
    const user = auth.currentUser;
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    
    try {
      const scriptId = doc(collection(db, 'scripts')).id;
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
      alert('Scheduled to today\'s Spread!');
      fetchScripts(script.productId);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'scripts');
    }
  };

  const handleArchiveScript = async (script: Script) => {
    try {
      await updateDoc(doc(db, 'scripts', script.id), {
        savedToArchive: true
      });
      fetchScripts(script.productId);
    } catch (error) {
      console.error("Archive error:", error);
    }
  };

  const handleDeleteScript = async (script: Script) => {
    if (!confirm('Are you sure you want to delete this script?')) return;
    try {
      await deleteDoc(doc(db, 'scripts', script.id));
      fetchScripts(script.productId);
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      fetchScripts(selectedProduct.id);
    }
  }, [selectedProduct]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    const productsPath = 'products';
    try {
      await addDoc(collection(db, productsPath), {
        ...newProduct,
        userId: user.uid,
        createdAt: serverTimestamp()
      });
      setShowAdd(false);
      setNewProduct({ name: '', brand: '', link: '', description: '', targetAudience: '' });
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, productsPath);
    }
  };

  const deleteProduct = async (id: string) => {
    const productsPath = 'products';
    try {
      await deleteDoc(doc(db, productsPath, id));
      if (selectedProduct?.id === id) setSelectedProduct(null);
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${productsPath}/${id}`);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.brand.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-20 text-ink-900">
      <header className="flex items-center justify-between border-b pb-6 border-pink-100">
        <div>
          <h2 className="text-3xl font-bold font-serif tracking-tight">Product Catalog</h2>
          <p className="text-[10px] font-bold uppercase tracking-widest text-pink-400 mt-1">Track & Manage Promoted Items</p>
        </div>
        <button 
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-pink-500 text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-xl shadow-pink-200 hover:scale-105 transition-transform"
        >
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
            <input 
              type="text" 
              placeholder="Search catalog..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-pink-100 rounded-2xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-pink-100 outline-none shadow-sm"
            />
          </div>

          <div className="space-y-2">
            {filteredProducts.map(product => (
              <button
                key={product.id}
                onClick={() => setSelectedProduct(product)}
                className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between group ${selectedProduct?.id === product.id ? 'bg-pink-500 border-pink-500 text-white shadow-lg shadow-pink-100' : 'bg-white border-pink-50 hover:border-pink-200'}`}
              >
                <div>
                  <p className="text-sm font-bold truncate font-serif italic">{product.name}</p>
                  <p className={`text-[10px] uppercase tracking-widest transition-colors ${selectedProduct?.id === product.id ? 'text-white/60' : 'text-pink-400 font-bold'}`}>{product.brand}</p>
                </div>
                <ChevronRight className={`w-4 h-4 transition-transform ${selectedProduct?.id === product.id ? 'translate-x-1' : 'text-ink-200'}`} />
              </button>
            ))}
            {filteredProducts.length === 0 && !loading && (
              <div className="text-center py-10 text-ink-300 bg-cream-50/50 rounded-3xl border border-dashed border-pink-100">
                <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-xs italic font-serif">No products found</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {selectedProduct ? (
              <motion.div
                key={selectedProduct.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white rounded-[40px] border border-pink-100 p-10 shadow-sm space-y-10"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-3xl font-bold font-serif tracking-tight flex items-center gap-3">
                      {selectedProduct.name}
                    </h3>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-pink-400 italic font-serif">{selectedProduct.brand}</span>
                      {selectedProduct.link && (
                        <a href={selectedProduct.link} target="_blank" rel="noreferrer" className="text-[10px] flex items-center gap-1 text-pink-600 hover:underline font-bold uppercase tracking-widest">
                          <ExternalLink className="w-3 h-3" /> Shop Link
                        </a>
                      )}
                    </div>
                  </div>
                  <button onClick={() => deleteProduct(selectedProduct.id)} className="p-2 text-ink-200 hover:text-red-500 transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-ink-400 flex items-center gap-2">
                      <FileText className="w-3 h-3" /> Product Specs
                    </h4>
                    <p className="text-sm text-ink-700 leading-relaxed bg-cream-50 p-6 rounded-3xl border border-cream-100">
                      {selectedProduct.description || "No description provided."}
                    </p>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-ink-400 flex items-center gap-2">
                      <Target className="w-3 h-3" /> Target Audience
                    </h4>
                    <p className="text-sm text-pink-600 leading-relaxed bg-pink-50/50 p-6 rounded-3xl italic font-serif border border-pink-50">
                      {selectedProduct.targetAudience || "No target audience defined."}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 pt-10 border-t border-neutral-100">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-900 flex items-center gap-2">
                      <Sparkles className="w-3 h-3 text-neutral-900" /> AI Strategic Analysis
                    </h4>
                    {!selectedProduct.workup && !generating && (
                      <button 
                        onClick={handleGenerateWorkup}
                        className="text-[10px] font-bold bg-neutral-950 text-white px-4 py-2 rounded-full hover:scale-105 transition-transform shadow-lg"
                      >
                        Compute Viral Blueprint
                      </button>
                    )}
                  </div>

                  {generating ? (
                    <div className="bg-neutral-50 p-10 rounded-[40px] border border-dashed border-neutral-200 flex flex-col items-center justify-center gap-3">
                       <Sparkles className="w-6 h-6 text-emerald-500 animate-pulse" />
                       <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Synthesizing pains & solutions...</p>
                    </div>
                  ) : selectedProduct.workup ? (
                    <div className="space-y-6">
                      <div className="bg-neutral-50 p-8 rounded-[40px] prose prose-neutral prose-sm max-w-none text-neutral-700 leading-relaxed font-serif italic border border-neutral-100 relative group">
                        <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={handleGenerateWorkup} className="text-[10px] font-bold text-neutral-400 hover:text-neutral-900">Regenerate Analysis</button>
                        </div>
                        <ReactMarkdown>{selectedProduct.workup}</ReactMarkdown>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-neutral-50 p-10 rounded-[40px] border border-dashed border-neutral-100 text-center">
                       <p className="text-xs text-neutral-400 italic">No AI workup generated yet. Click above to analyze this product.</p>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-900 flex items-center gap-2">
                      <Archive className="w-3 h-3" /> Script Archive
                    </h4>
                    <span className="text-[10px] text-neutral-400">{productScripts.length} Saved scripts</span>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {productScripts?.map(script => (
                      <div key={script.id} className="p-6 bg-white border border-neutral-100 rounded-3xl shadow-sm hover:shadow-md transition-shadow group">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h5 className="font-bold text-sm italic font-serif underline underline-offset-4 decoration-neutral-100">{script.title}</h5>
                            {script.savedToArchive && <span className="text-[8px] font-bold text-pink-500 uppercase tracking-widest mt-1 block">In Warehouse</span>}
                          </div>
                          <div className="flex items-center gap-2">
                             {!script.savedToArchive && (
                               <button 
                                 onClick={() => handleArchiveScript(script)}
                                 className="p-2 bg-cream-50 text-ink-300 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-pink-50 hover:text-pink-500"
                                 title="Save to Warehouse"
                               >
                                  <Archive className="w-4 h-4" />
                               </button>
                             )}
                             <button 
                               onClick={() => handleAddToPlanner(script)}
                               className="p-2 bg-pink-50 text-pink-500 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-pink-100"
                               title="Schedule to Daily Spread"
                             >
                                <Calendar className="w-4 h-4" />
                             </button>
                             <button 
                               onClick={() => handleDeleteScript(script)}
                               className="p-2 text-ink-100 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                               title="Delete Permanent"
                             >
                                <Trash2 className="w-4 h-4" />
                             </button>
                             <span className="text-[10px] px-2 py-1 bg-neutral-100 rounded-lg font-bold text-neutral-500 uppercase tracking-widest">{script.type}</span>
                          </div>
                        </div>
                        <p className="text-xs text-neutral-500 line-clamp-3 mb-4 leading-relaxed italic">{script.content}</p>
                        <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-tighter text-neutral-400">
                          {script.scheduledDate && (
                            <span className="flex items-center gap-1 text-pink-600">
                              <Calendar className="w-3 h-3" /> Scheduled: {script.scheduledDate}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {productScripts.length === 0 && (
                      <div className="text-center py-12 bg-neutral-50 rounded-3xl border border-dashed border-neutral-200">
                        <p className="text-xs text-neutral-400 italic">No scripts saved for this product yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-10 bg-neutral-50 rounded-[40px] border border-dashed border-neutral-200 min-h-[400px]">
                <ShoppingBag className="w-16 h-16 text-neutral-200 mb-6" />
                <h3 className="text-xl font-bold italic font-serif text-neutral-400">Select a Product</h3>
                <p className="text-sm text-neutral-400 max-w-xs mt-2">Pick a product from your catalog to view its AI workup and saved scripts.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAdd(false)} className="absolute inset-0 bg-neutral-950/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white w-full max-w-lg rounded-[40px] shadow-2xl p-10">
              <h3 className="text-2xl font-bold mb-8 italic font-serif">Add New Product</h3>
              
              <form onSubmit={handleAddProduct} className="space-y-6 text-neutral-900">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2 block">Product Name</label>
                  <input type="text" required value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} placeholder="e.g. 4K Streaming Camera" className="w-full bg-neutral-50 rounded-2xl py-4 px-4 border-none focus:ring-2 focus:ring-neutral-200" />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2 block">Brand</label>
                  <input type="text" required value={newProduct.brand} onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })} placeholder="e.g. Sony" className="w-full bg-neutral-50 rounded-2xl py-4 px-4 border-none focus:ring-2 focus:ring-neutral-200" />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2 block">Shop/Affiliate Link</label>
                  <input type="url" value={newProduct.link} onChange={(e) => setNewProduct({ ...newProduct, link: e.target.value })} placeholder="https://..." className="w-full bg-neutral-50 rounded-2xl py-4 px-4 border-none focus:ring-2 focus:ring-neutral-200" />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2 block">Value Proposition / Specs</label>
                  <textarea rows={3} value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} placeholder="Tell the AI what makes this product great..." className="w-full bg-neutral-50 rounded-2xl py-4 px-4 border-none focus:ring-2 focus:ring-neutral-200 resize-none" />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2 block">Target Audience</label>
                  <input type="text" value={newProduct.targetAudience} onChange={(e) => setNewProduct({ ...newProduct, targetAudience: e.target.value })} placeholder="e.g. Tech enthusiasts, content creators" className="w-full bg-neutral-50 rounded-2xl py-4 px-4 border-none focus:ring-2 focus:ring-neutral-200" />
                </div>

                <div className="flex gap-3 pt-6">
                  <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-4 text-sm font-bold text-neutral-500 hover:bg-neutral-50 rounded-2xl transition-colors">Discard</button>
                  <button type="submit" className="flex-1 py-4 bg-neutral-950 text-white rounded-2xl text-sm font-bold shadow-lg hover:bg-neutral-800 transition-colors uppercase tracking-widest">Catalog Product</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
