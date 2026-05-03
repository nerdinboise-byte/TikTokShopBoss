import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, orderBy } from 'firebase/firestore';
import { BrandDeal } from '../types';
import { 
  Plus, 
  Briefcase, 
  Search, 
  Filter, 
  ExternalLink,
  Trash2,
  CheckCircle2,
  Clock,
  Handshake,
  DollarSign,
  Calendar,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const BrandDeals: React.FC = () => {
  const [deals, setDeals] = useState<BrandDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newDeal, setNewDeal] = useState({
    brandName: '',
    productName: '',
    dealType: 'Affiliate + Flat Fee',
    fee: '',
    deadline: '',
    status: 'pitched'
  });

  const fetchData = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const dealsPath = 'brand_deals';
    try {
      const q = query(collection(db, dealsPath), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q).catch(e => handleFirestoreError(e, OperationType.LIST, dealsPath));
      if (snap) {
        setDeals((snap as any).docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as BrandDeal)));
      }
    } catch (error) {
      console.error("BrandDeals fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user || !newDeal.brandName) return;

    const dealsPath = 'brand_deals';
    try {
      await addDoc(collection(db, dealsPath), {
        ...newDeal,
        userId: user.uid,
        fee: parseFloat(newDeal.fee as string) || 0,
        createdAt: serverTimestamp()
      });

      setShowAdd(false);
      setNewDeal({ brandName: '', productName: '', dealType: 'Affiliate + Flat Fee', fee: '', deadline: '', status: 'pitched' });
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, dealsPath);
    }
  };

  const updateStatus = async (id: string, status: BrandDeal['status']) => {
    const dealsPath = 'brand_deals';
    try {
      await updateDoc(doc(db, dealsPath, id), { status });
      setDeals(prev => prev.map(d => d.id === id ? { ...d, status } : d));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${dealsPath}/${id}`);
    }
  };

  const deleteDeal = async (id: string) => {
    const dealsPath = 'brand_deals';
    try {
      await deleteDoc(doc(db, dealsPath, id));
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${dealsPath}/${id}`);
    }
  };

  const statusColors = {
    pitched: 'bg-cream-50 text-ink-400 border border-pink-100',
    negotiating: 'bg-pink-50 text-pink-600 border border-pink-200',
    signed: 'bg-pink-100 text-pink-700 border border-pink-300',
    content_posted: 'bg-pink-500 text-white shadow-sm',
    paid: 'bg-ink-900 text-white shadow-xl'
  };

  return (
    <div className="space-y-8 pb-20 text-ink-900">
      <header className="flex items-center justify-between border-b pb-6 border-pink-100">
        <div>
          <h2 className="text-3xl font-bold font-serif tracking-tight">Brand Partnerships</h2>
          <p className="text-[10px] font-bold uppercase tracking-widest text-pink-400 mt-1">Track deliverables, deadlines, and payouts.</p>
        </div>
        <button 
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-pink-500 text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-xl shadow-pink-100 hover:scale-105 transition-transform"
        >
          <Plus className="w-4 h-4" /> Log New Deal
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="p-8 bg-white border border-pink-100 rounded-[40px] shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-ink-400 mb-2">Active Collaborations</p>
            <p className="text-4xl font-bold tabular-nums font-serif italic text-ink-900">{deals.filter(d => d.status !== 'paid').length}</p>
         </div>
         <div className="p-8 bg-cream-50 border border-pink-50 rounded-[40px] shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-pink-400 mb-2">Pending Payouts</p>
            <p className="text-4xl font-bold tabular-nums text-pink-600 font-serif italic">
               ${deals.filter(d => d.status === 'content_posted').reduce((sum, d) => sum + d.fee, 0).toLocaleString()}
            </p>
         </div>
         <div className="p-8 bg-ink-900 text-white rounded-[40px] shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-6 opacity-10"><DollarSign className="w-12 h-12" /></div>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-2">Total Deal Revenue</p>
            <p className="text-4xl font-bold tabular-nums font-serif italic">${deals.reduce((sum, d) => sum + d.fee, 0).toLocaleString()}</p>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {deals.map((deal) => (
            <motion.div 
              key={deal.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="group p-8 bg-white border border-pink-100 rounded-[40px] shadow-sm hover:shadow-xl transition-all relative"
            >
              <div className="flex justify-between items-start mb-6">
                <div className={cn("px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest", statusColors[deal.status])}>
                  {deal.status.replace('_', ' ')}
                </div>
                <button onClick={() => deleteDeal(deal.id)} className="text-pink-100 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2 rounded-full hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <h3 className="text-xl font-bold font-serif italic mb-1 text-ink-900">{deal.brandName}</h3>
              <p className="text-sm text-ink-300 font-medium mb-6 uppercase tracking-widest text-[10px]">{deal.productName || 'Collaboration'}</p>

              <div className="space-y-4 pt-4 border-t border-pink-50">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-ink-400 font-bold uppercase tracking-tighter">Agreement</span>
                  <span className="font-bold text-ink-800">{deal.dealType}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-ink-400 font-bold uppercase tracking-tighter">Deadline</span>
                  <span className="font-bold text-ink-800 flex items-center gap-1.5">
                    <Clock className="w-3 h-3" /> {deal.deadline || 'TBD'}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-pink-500">Fixed Fee</span>
                  <span className="text-2xl font-bold tabular-nums text-ink-900 font-serif italic">${deal.fee.toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-2">
                {deal.status === 'pitched' && (
                  <button onClick={() => updateStatus(deal.id, 'negotiating')} className="col-span-2 py-3 bg-pink-50 text-pink-600 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-pink-100 transition-colors">Move to Negotiation</button>
                )}
                {deal.status === 'negotiating' && (
                  <button onClick={() => updateStatus(deal.id, 'signed')} className="col-span-2 py-3 bg-pink-500 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-pink-600 transition-colors shadow-lg shadow-pink-100">Contract Signed</button>
                )}
                {deal.status === 'signed' && (
                  <button onClick={() => updateStatus(deal.id, 'content_posted')} className="col-span-2 py-3 bg-pink-500 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-pink-600 transition-colors shadow-lg shadow-pink-100">Content Posted</button>
                )}
                {deal.status === 'content_posted' && (
                  <button onClick={() => updateStatus(deal.id, 'paid')} className="col-span-2 py-3 bg-ink-900 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-ink-800 transition-colors shadow-lg">Mark as Paid</button>
                )}
                {deal.status === 'paid' && (
                  <div className="col-span-2 py-3 bg-pink-50 text-pink-500 rounded-2xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 border border-pink-200">
                    <CheckCircle2 className="w-3 h-3 text-pink-500" /> Deal Closed
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAdd(false)} className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" />
             <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white w-full max-w-lg rounded-[40px] shadow-2xl p-10 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-8">
                   <h3 className="text-2xl font-bold font-serif italic text-ink-900">Log Partnership</h3>
                   <button onClick={() => setShowAdd(false)} className="p-2 hover:bg-pink-50 rounded-full transition-colors text-ink-300"><X className="w-5 h-5" /></button>
                </div>
                
                <form onSubmit={handleAdd} className="space-y-6">
                   <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-ink-400 mb-2 block">Brand Name</label>
                      <input type="text" required value={newDeal.brandName} onChange={(e) => setNewDeal({ ...newDeal, brandName: e.target.value })} className="w-full bg-cream-50 rounded-2xl p-4 border-none focus:ring-2 focus:ring-pink-100 font-bold text-ink-900 placeholder:text-ink-200" placeholder="e.g. Nike" />
                   </div>
                   <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-ink-400 mb-2 block">Product/Campaign</label>
                      <input type="text" value={newDeal.productName} onChange={(e) => setNewDeal({ ...newDeal, productName: e.target.value })} className="w-full bg-cream-50 rounded-2xl p-4 border-none focus:ring-2 focus:ring-pink-100 font-bold text-ink-900 placeholder:text-ink-200" placeholder="e.g. Summer Collection 2024" />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-ink-400 mb-2 block">Fixed Fee ($)</label>
                        <input type="number" required value={newDeal.fee} onChange={(e) => setNewDeal({ ...newDeal, fee: e.target.value })} className="w-full bg-cream-50 rounded-2xl p-4 border-none focus:ring-2 focus:ring-pink-100 font-bold text-ink-900 placeholder:text-ink-200" placeholder="0.00" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-ink-400 mb-2 block">Deadline</label>
                        <input type="date" value={newDeal.deadline} onChange={(e) => setNewDeal({ ...newDeal, deadline: e.target.value })} className="w-full bg-cream-50 rounded-2xl p-4 border-none focus:ring-2 focus:ring-pink-100 font-bold text-ink-900" />
                      </div>
                   </div>
                   <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-ink-400 mb-3 block">Agreement Type</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['Affiliate + Flat Fee', 'Flat Fee Only', 'Gifting / Trade', 'Retainer'].map(type => (
                          <button key={type} type="button" onClick={() => setNewDeal({ ...newDeal, dealType: type })} className={cn("py-3 px-4 rounded-xl text-[10px] font-bold uppercase tracking-tighter transition-all text-left", newDeal.dealType === type ? 'bg-pink-500 text-white shadow-lg shadow-pink-100' : 'bg-cream-50 text-ink-400 hover:bg-pink-50')}>
                            {type}
                          </button>
                        ))}
                      </div>
                   </div>
                   <button type="submit" className="w-full py-5 bg-ink-900 text-white rounded-2xl font-bold shadow-2xl hover:scale-[1.02] active:scale-95 transition-all mt-4 font-serif italic text-lg">
                      Protocol Inscribed // Save Deal
                   </button>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
