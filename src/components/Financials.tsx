import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, deleteDoc, doc, orderBy, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { Expense, DailyLog, UserProfile, Product, IncomeEntry, WeeklyBudget } from '../types';
import { 
  Plus, 
  X, 
  Calculator, 
  ArrowUpRight, 
  Receipt,
  Download,
  Calendar,
  DollarSign,
  ShieldCheck,
  TrendingUp,
  FileText,
  Target,
  PieChart,
  ShoppingBag,
  LayoutDashboard,
  TrendingDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FinancialsProps {
  onUpdate?: (uid: string) => void;
}

export const Financials: React.FC<FinancialsProps> = ({ onUpdate }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [incomeEntries, setIncomeEntries] = useState<IncomeEntry[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [weeklyBudgets, setWeeklyBudgets] = useState<WeeklyBudget[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'ledger' | 'budget' | 'income'>('overview');
  
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [showTaxReport, setShowTaxReport] = useState(false);

  const [newExpense, setNewExpense] = useState({ amount: '', category: 'Equipment & Tech', description: '' });
  const [newIncome, setNewIncome] = useState({ amount: '', productId: '', source: 'affiliate' as const, description: '' });
  const [newBudget, setNewBudget] = useState<Partial<WeeklyBudget>>({
    weekId: '', 
    categoryBudgets: {},
    salesGoal: 0
  });

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const defaultCategories = [
    'Advertising & Marketing', 
    'Business Meals', 
    'Equipment & Tech', 
    'Software Subscriptions', 
    'Travel', 
    'Home Office',
    'Samples',
    'Contract Labor',
    'Shipping & Logistics',
    'Education & Courses',
    'Bank Charges',
    'Professional Services',
    'Internet & Utilities',
    'Office Supplies'
  ];

  const allCategories = [...defaultCategories, ...(profile?.customExpenseCategories || [])];

  const getCurrentWeekId = () => {
    const d = new Date();
    const day = d.getDay() || 7;
    if (day !== 1) d.setHours(-24 * (day - 1));
    return d.toISOString().split('T')[0];
  };

  const currentWeekId = getCurrentWeekId();

  const fetchData = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const expensesPath = 'expenses';
      const logsPath = 'daily_logs';
      const usersPath = 'users';
      const productsPath = 'products';
      const incomePath = 'income_entries';
      const budgetsPath = 'weekly_budgets';

      const [expSnap, logSnap, profileSnap, prodSnap, incSnap, budSnap] = await Promise.all([
        getDocs(query(collection(db, expensesPath), where('userId', '==', user.uid), orderBy('date', 'desc'))).catch(e => handleFirestoreError(e, OperationType.LIST, expensesPath)),
        getDocs(query(collection(db, logsPath), where('userId', '==', user.uid))).catch(e => handleFirestoreError(e, OperationType.LIST, logsPath)),
        getDoc(doc(db, usersPath, user.uid)).catch(e => handleFirestoreError(e, OperationType.GET, `${usersPath}/${user.uid}`)),
        getDocs(query(collection(db, productsPath), where('userId', '==', user.uid))),
        getDocs(query(collection(db, incomePath), where('userId', '==', user.uid), orderBy('date', 'desc'))),
        getDocs(query(collection(db, budgetsPath), where('userId', '==', user.uid)))
      ]);

      setExpenses((expSnap as any).docs.map((doc: any) => ({ id: doc.id, ...doc.data(), date: doc.data().date?.toDate() } as Expense)));
      setDailyLogs((logSnap as any).docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as DailyLog)));
      setProfile((profileSnap as any).data() as UserProfile);
      setProducts((prodSnap as any).docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Product)));
      setIncomeEntries((incSnap as any).docs.map((doc: any) => ({ id: doc.id, ...doc.data(), date: doc.data().date?.toDate() } as IncomeEntry)));
      setWeeklyBudgets((budSnap as any).docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as WeeklyBudget)));
    } catch (error) {
      console.error("Financials fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user || !newExpense.amount) return;

    try {
      await addDoc(collection(db, 'expenses'), {
        userId: user.uid,
        amount: parseFloat(newExpense.amount),
        category: newExpense.category,
        description: newExpense.description,
        date: serverTimestamp(),
        weekId: currentWeekId
      });
      setShowAddExpense(false);
      setNewExpense({ amount: '', category: 'Equipment & Tech', description: '' });
      fetchData();
      if (onUpdate) onUpdate(user.uid);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'expenses');
    }
  };

  const handleAddIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user || !newIncome.amount) return;

    try {
      await addDoc(collection(db, 'income_entries'), {
        userId: user.uid,
        amount: parseFloat(newIncome.amount),
        productId: newIncome.productId,
        source: newIncome.source,
        description: newIncome.description,
        date: serverTimestamp()
      });
      setShowAddIncome(false);
      setNewIncome({ amount: '', productId: '', source: 'affiliate', description: '' });
      fetchData();
      if (onUpdate) onUpdate(user.uid);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'income_entries');
    }
  };

  const handleSaveBudget = async () => {
    const user = auth.currentUser;
    if (!user || !newBudget.weekId) return;

    try {
      const budgetId = `${user.uid}_${newBudget.weekId}`;
      await setDoc(doc(db, 'weekly_budgets', budgetId), {
        ...newBudget,
        userId: user.uid
      });
      setShowAddBudget(false);
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'weekly_budgets');
    }
  };

  const handleAddCustomCategory = async () => {
    const user = auth.currentUser;
    if (!user || !newCategoryName || !profile) return;

    try {
      const updatedCategories = [...(profile.customExpenseCategories || []), newCategoryName];
      await updateDoc(doc(db, 'users', user.uid), {
        customExpenseCategories: updatedCategories
      });
      setProfile({ ...profile, customExpenseCategories: updatedCategories });
      setNewExpense({ ...newExpense, category: newCategoryName });
      setNewCategoryName('');
      setIsAddingCategory(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const deleteExpense = async (id: string) => {
    const expensesPath = 'expenses';
    try {
      await deleteDoc(doc(db, expensesPath, id));
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${expensesPath}/${id}`);
    }
  };

  const totalIncomeFromEntries = incomeEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const totalIncomeFromLogs = dailyLogs.reduce((sum, log) => {
    if (!log.income) return sum;
    return sum + Object.values(log.income).reduce((a, b) => a + (b || 0), 0);
  }, 0);
  
  const totalIncome = totalIncomeFromEntries + totalIncomeFromLogs;

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalMileage = dailyLogs.reduce((sum, log) => sum + (log.mileage || 0), 0);
  const mileageDeduction = totalMileage * 0.67;
  const netIncome = Math.max(0, totalIncome - totalExpenses - mileageDeduction);
  
  const selfEmploymentTax = netIncome * 0.9235 * 0.153;
  const incomeTax = netIncome * ((profile?.taxRate || 10) / 100);
  const totalTaxRef = selfEmploymentTax + incomeTax;

  const currentBudget = weeklyBudgets.find(b => b.weekId === currentWeekId);
  const weeklyExpenses = expenses.filter(e => e.weekId === currentWeekId).reduce((sum, e) => sum + e.amount, 0);
  const weeklySales = incomeEntries.filter(e => {
    const d = e.date instanceof Date ? e.date : e.date?.toDate?.() || new Date();
    return d.toISOString().split('T')[0] >= currentWeekId;
  }).reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-8 pb-20 text-ink-900">
      <header className="flex flex-col md:flex-row md:items-end justify-between border-b pb-6 border-pink-100 gap-4">
        <div>
          <h2 className="text-3xl font-bold font-serif tracking-tight text-ink-900 italic underline decoration-pink-200 underline-offset-8 decoration-4">Income Hub</h2>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-400 mt-2">Official Strategic Digital OS // Financial Command</p>
        </div>
        <div className="flex gap-2 bg-cream-50 p-1.5 rounded-2xl border border-pink-50">
          {[
            { id: 'overview', icon: LayoutDashboard, label: 'Audit' },
            { id: 'income', icon: ArrowUpRight, label: 'Sales' },
            { id: 'ledger', icon: Receipt, label: 'Write-offs' },
            { id: 'budget', icon: Target, label: 'Budget' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-pink-500 text-white shadow-lg shadow-pink-100' : 'text-ink-400 hover:text-pink-500 hover:bg-white'}`}
            >
              <tab.icon className="w-3 h-3" />
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {activeTab === 'overview' && (
        <div className="space-y-8">

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-8 bg-ink-900 text-white rounded-[40px] shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10">
                <Calculator className="w-8 h-8 opacity-20 mb-4" />
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-3">Est. Tax Liability</p>
                <p className="text-4xl font-bold tabular-nums font-serif italic">${totalTaxRef.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <div className="mt-6 flex items-center gap-2 text-[8px] bg-white/10 w-fit px-3 py-1.5 rounded-full border border-white/5 font-bold uppercase tracking-tighter">
                  <ShieldCheck className="w-3 h-3 text-pink-400" /> CPA-Grade Estimate
                </div>
              </div>
            </div>

            <div className="p-8 bg-white border border-pink-100 rounded-[40px] shadow-sm hover:shadow-md transition-shadow">
              <p className="text-[10px] font-bold uppercase tracking-widest text-ink-400 mb-2">Gross Revenue</p>
              <p className="text-4xl font-bold tabular-nums text-ink-900 font-serif italic border-b-4 border-emerald-50 w-fit pb-1">${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <div className="flex items-center gap-2 mt-4 text-[10px] text-emerald-600 font-bold uppercase tracking-tighter">
                <TrendingUp className="w-3 h-3" /> Combined Data Streams
              </div>
            </div>

            <div className="p-8 bg-white border border-pink-100 rounded-[40px] shadow-sm hover:shadow-md transition-shadow">
              <p className="text-[10px] font-bold uppercase tracking-widest text-ink-400 mb-2">Total Deductions</p>
              <p className="text-4xl font-bold tabular-nums text-pink-500 font-serif italic">${(totalExpenses + mileageDeduction).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className="text-[10px] text-ink-300 mt-4 flex items-center gap-2 font-bold uppercase tracking-tighter italic">
                <PieChart className="w-3 h-3" /> Incl. ${mileageDeduction.toFixed(2)} mileage
              </p>
            </div>

            <div className="p-8 bg-cream-50 border border-pink-50 rounded-[40px] shadow-sm relative group overflow-hidden">
              <div className="relative z-10">
                <p className="text-[10px] font-bold uppercase tracking-widest text-pink-500 mb-2">Net Cash Flow</p>
                <p className="text-4xl font-bold tabular-nums text-ink-900 font-serif italic">${netIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p className="text-[10px] text-pink-400 mt-4 font-bold uppercase tracking-widest">Protocol Realized Profit</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-10 rounded-[48px] border border-pink-100 shadow-sm space-y-6">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-bold font-serif italic text-ink-900">Actual vs Budget</h3>
                <Target className="w-6 h-6 text-pink-200" />
              </div>
              
              <div className="space-y-6">
                 <div>
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mb-2">
                       <span className="text-ink-400">Sales Goal ({currentWeekId})</span>
                       <span className="text-emerald-600">${weeklySales.toFixed(0)} / ${currentBudget?.salesGoal || 0}</span>
                    </div>
                    <div className="h-3 bg-cream-50 rounded-full overflow-hidden border border-pink-50">
                       <div 
                         className="h-full bg-emerald-500 transition-all duration-1000 shadow-[0_0_15px_rgba(16,185,129,0.3)]" 
                         style={{ width: `${Math.min(100, (weeklySales / (currentBudget?.salesGoal || 1)) * 100)}%` }} 
                       />
                    </div>
                 </div>

                 <div>
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mb-2">
                       <span className="text-ink-400">Total Spending Limit</span>
                       <span className="text-pink-600">${weeklyExpenses.toFixed(0)} / ${Object.values(currentBudget?.categoryBudgets || {}).reduce((a, b) => a + b, 0)}</span>
                    </div>
                    <div className="h-3 bg-cream-50 rounded-full overflow-hidden border border-pink-50">
                       <div 
                         className={`h-full transition-all duration-1000 shadow-lg ${weeklyExpenses > Object.values(currentBudget?.categoryBudgets || {}).reduce((a, b) => a + b, 0) ? 'bg-red-500 shadow-red-100' : 'bg-pink-500 shadow-pink-100'}`} 
                         style={{ width: `${Math.min(100, (weeklyExpenses / (Object.values(currentBudget?.categoryBudgets || {}).reduce((a, b) => a + b, 1) || 1)) * 100)}%` }} 
                       />
                    </div>
                 </div>
              </div>

              <div className="pt-6 mt-8 border-t border-pink-50">
                <div className="flex items-center gap-4 p-4 bg-pink-50/50 rounded-3xl">
                   <TrendingDown className="w-8 h-8 text-pink-500" />
                   <div>
                      <p className="text-xs font-bold text-ink-900 italic">Strategic Insight</p>
                      <p className="text-[10px] text-ink-400 font-medium">You are {weeklyExpenses > (Object.values(currentBudget?.categoryBudgets || {}).reduce((a, b) => a + b, 0)) ? 'over' : 'under'} your spending limit this week. {weeklySales < (currentBudget?.salesGoal || 0) ? 'Increase content volume to hit your sales goal.' : 'Great job hitting your targets!'}</p>
                   </div>
                </div>
              </div>
            </div>

            <div className="bg-ink-900 text-white p-10 rounded-[48px] shadow-2xl relative overflow-hidden">
               <div className="relative z-10">
                  <h3 className="text-2xl font-bold font-serif italic mb-8 underline decoration-pink-500 decoration-2 underline-offset-8">Tax Projection</h3>
                  <div className="space-y-6">
                     <div className="flex justify-between items-center py-4 border-b border-white/5">
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Self-Employment Tax</span>
                        <span className="text-lg font-bold font-serif italic">${selfEmploymentTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                     </div>
                     <div className="flex justify-between items-center py-4 border-b border-white/5">
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Income Tax Estimate</span>
                        <span className="text-lg font-bold font-serif italic">${incomeTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                     </div>
                     <div className="pt-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-pink-400 mb-2">Total Est. Liability</p>
                        <p className="text-5xl font-bold font-serif italic">${totalTaxRef.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                     </div>
                  </div>
                  <button 
                    onClick={() => setShowTaxReport(true)}
                    className="mt-10 w-full py-5 bg-pink-500 text-white rounded-3xl font-bold shadow-xl shadow-pink-900/40 hover:bg-pink-600 transition-all font-serif italic"
                  >
                    Generate CPA Report // Export PDF
                  </button>
               </div>
               <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl" />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ledger' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-bold font-serif italic text-ink-900">The Expense Ledger</h3>
            <button 
              onClick={() => setShowAddExpense(true)}
              className="flex items-center gap-2 bg-pink-500 text-white px-8 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-xl shadow-pink-100 hover:scale-105 transition-all"
            >
              <Plus className="w-4 h-4" /> Post New Deduction
            </button>
          </div>
          <div className="bg-white rounded-[40px] border border-pink-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-ink-400 border-b border-pink-50">
                  <th className="px-10 py-6 font-bold">Category</th>
                  <th className="px-10 py-6 font-bold">Protocol Description</th>
                  <th className="px-10 py-6 font-bold">Auth Date</th>
                  <th className="px-10 py-6 font-bold text-right">Value (USD)</th>
                  <th className="px-10 py-6 font-bold w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pink-50">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-10 py-20 text-center text-ink-200 italic text-sm">Central expense ledger currently empty.</td>
                  </tr>
                ) : (
                  expenses.map((e) => (
                    <tr key={e.id} className="hover:bg-cream-50 transition-colors group">
                      <td className="px-10 py-5">
                        <span className="px-3 py-1 rounded-full bg-pink-50 text-[10px] font-bold text-pink-600 uppercase tracking-tighter border border-pink-100 shadow-sm">
                          {e.category}
                        </span>
                      </td>
                      <td className="px-10 py-5 text-sm font-medium text-ink-900">{e.description}</td>
                      <td className="px-10 py-5 text-[10px] font-bold text-ink-300 font-serif italic">{e.date?.toLocaleDateString()}</td>
                      <td className="px-10 py-5 text-sm font-bold text-ink-900 text-right tabular-nums">
                        ${e.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-10 py-5">
                        <button onClick={() => deleteExpense(e.id)} className="text-ink-100 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2 rounded-full hover:bg-red-50">
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'income' && (
        <div className="space-y-8">
           <div className="flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-bold font-serif italic text-ink-900">Revenue Breakdown</h3>
              <p className="text-[10px] font-bold text-pink-400 uppercase tracking-widest mt-1">Track actual sales matched with your catalog.</p>
            </div>
            <button 
              onClick={() => setShowAddIncome(true)}
              className="flex items-center gap-2 bg-pink-500 text-white px-8 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-xl shadow-pink-100 hover:scale-105 transition-all"
            >
              <ArrowUpRight className="w-4 h-4" /> Log Daily Sales
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             <div className="lg:col-span-2 space-y-4">
                <div className="bg-white rounded-[40px] border border-pink-100 shadow-sm overflow-hidden">
                   <table className="w-full text-left">
                     <thead>
                        <tr className="text-[10px] uppercase tracking-widest text-ink-400 border-b border-pink-50">
                          <th className="px-8 py-6">Source</th>
                          <th className="px-8 py-6">Product Match</th>
                          <th className="px-8 py-6">Description</th>
                          <th className="px-8 py-6 text-right">Amount</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-pink-50">
                        {incomeEntries.map(entry => (
                          <tr key={entry.id} className="hover:bg-cream-50 transition-all">
                             <td className="px-8 py-5">
                                <span className={`px-2 py-1 rounded text-[8px] font-bold uppercase ${entry.source === 'affiliate' ? 'bg-emerald-50 text-emerald-600' : entry.source === 'live' ? 'bg-pink-50 text-pink-500' : 'bg-ink-100 text-ink-600'}`}>
                                   {entry.source}
                                </span>
                             </td>
                             <td className="px-8 py-5 text-xs font-bold text-ink-900 italic font-serif">
                                {products.find(p => p.id === entry.productId)?.name || 'Unlinked Revenue'}
                             </td>
                             <td className="px-8 py-5 text-xs text-ink-400 font-medium">{entry.description}</td>
                             <td className="px-8 py-5 text-sm font-bold text-ink-900 text-right font-serif italic">
                                ${entry.amount.toFixed(2)}
                             </td>
                          </tr>
                        ))}
                     </tbody>
                   </table>
                </div>
             </div>

             <div className="space-y-6">
                <div className="bg-cream-50 p-8 rounded-[40px] border border-pink-50 shadow-sm">
                   <h4 className="text-[10px] font-bold uppercase tracking-widest text-pink-500 mb-6">Revenue by Product</h4>
                   <div className="space-y-4">
                      {products.map(p => {
                        const prodIncome = incomeEntries.filter(e => e.productId === p.id).reduce((sum, e) => sum + e.amount, 0);
                        const percentage = (prodIncome / (totalIncome || 1)) * 100;
                        if (prodIncome === 0) return null;
                        return (
                          <div key={p.id}>
                             <div className="flex justify-between text-[10px] font-bold text-ink-900 mb-2">
                                <span className="truncate max-w-[120px] font-serif italic underline decoration-pink-200 underline-offset-4">{p.name}</span>
                                <span>${prodIncome.toFixed(0)}</span>
                             </div>
                             <div className="h-2 bg-white rounded-full overflow-hidden">
                                <div className="h-full bg-pink-500" style={{ width: `${percentage}%` }} />
                             </div>
                          </div>
                        );
                      })}
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'budget' && (
        <div className="space-y-8">
           <div className="flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-bold font-serif italic text-ink-900">Weekly Strategic Budget</h3>
              <p className="text-[10px] font-bold text-pink-400 uppercase tracking-widest mt-1">Set sales targets and spending guardrails.</p>
            </div>
            <button 
              onClick={() => setShowAddBudget(true)}
              className="flex items-center gap-2 bg-pink-500 text-white px-8 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-xl shadow-pink-100 hover:scale-105 transition-all"
            >
              <Target className="w-4 h-4" /> Configure Weekly Plan
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="bg-white p-10 rounded-[48px] border border-pink-100 shadow-sm">
                <div className="flex items-center gap-4 mb-8">
                   <div className="p-3 bg-cream-50 rounded-2xl text-pink-500"><ShoppingBag className="w-6 h-6" /></div>
                   <div>
                      <h4 className="text-lg font-bold font-serif italic text-ink-900">Spending Limits</h4>
                      <p className="text-[10px] text-ink-300 font-bold uppercase tracking-widest">By Category</p>
                   </div>
                </div>
                <div className="space-y-6">
                   {allCategories.map(cat => {
                     const limit = currentBudget?.categoryBudgets?.[cat] || 0;
                     const spent = expenses.filter(e => e.weekId === currentWeekId && e.category === cat).reduce((sum, e) => sum + e.amount, 0);
                     const percentage = limit > 0 ? (spent / limit) * 100 : 0;
                     
                     return (
                       <div key={cat} className="space-y-2">
                          <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                             <span className="text-ink-400">{cat}</span>
                             <span className={spent > limit && limit > 0 ? 'text-red-500' : 'text-ink-900'}>
                               ${spent.toFixed(0)} / ${limit.toFixed(0)}
                             </span>
                          </div>
                          <div className="h-2 bg-cream-50 rounded-full overflow-hidden border border-pink-50">
                             <div 
                               className={`h-full transition-all ${spent > limit && limit > 0 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'bg-pink-400'}`} 
                               style={{ width: `${Math.min(100, percentage)}%` }} 
                             />
                          </div>
                       </div>
                     );
                   })}
                </div>
             </div>

             <div className="space-y-6">
                <div className="bg-ink-900 text-white p-10 rounded-[48px] shadow-2xl overflow-hidden relative">
                   <div className="relative z-10">
                      <Target className="w-10 h-10 text-pink-500 mb-6" />
                      <h3 className="text-2xl font-bold font-serif italic mb-2 tracking-tight">Sales Protocol</h3>
                      <p className="text-[10px] font-bold text-pink-400 uppercase tracking-widest mb-8">Weekly GMV Target</p>
                      
                      <div className="bg-white/5 p-8 rounded-3xl border border-white/10 mb-8">
                         <div className="flex justify-between items-end mb-4">
                            <span className="text-xs font-bold uppercase tracking-[0.2em] opacity-40">Actual Status</span>
                            <span className="text-4xl font-bold font-serif italic text-emerald-400">${weeklySales.toLocaleString()}</span>
                         </div>
                         <div className="flex justify-between items-end">
                            <span className="text-xs font-bold uppercase tracking-[0.2em] opacity-40">Weekly Goal</span>
                            <span className="text-2xl font-bold font-serif italic opacity-80">${(currentBudget?.salesGoal || 0).toLocaleString()}</span>
                         </div>
                      </div>
                      
                      <p className="text-xs text-white/40 italic leading-relaxed">
                         To hit your ${currentBudget?.salesGoal || 0} target, prioritize products with the highest conversion rates from your Catalog.
                      </p>
                   </div>
                   <div className="absolute top-0 right-0 p-10 opacity-5"><Target className="w-32 h-32" /></div>
                </div>
             </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showAddExpense && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddExpense(false)} className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white w-full max-w-lg rounded-[40px] shadow-2xl p-10">
              <h3 className="text-2xl font-bold mb-8 italic font-serif text-ink-900">Post New Deduction</h3>
              
              <form onSubmit={handleAddExpense} className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-pink-400 mb-2 block">Value (USD)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-300" />
                    <input type="number" step="0.01" required value={newExpense.amount} onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })} placeholder="0.00" className="w-full bg-cream-50 rounded-2xl py-4 pl-12 pr-4 border-none focus:ring-2 focus:ring-pink-100 text-lg font-bold text-ink-900 italic font-serif" />
                  </div>
                </div>

                <div>
                   <div className="flex items-center justify-between mb-3">
                     <label className="text-[10px] font-bold uppercase tracking-widest text-ink-400 block">Tax Category</label>
                     <button type="button" onClick={() => setIsAddingCategory(!isAddingCategory)} className="text-[10px] font-bold text-pink-500 border-b border-pink-500 leading-none">
                       {isAddingCategory ? 'Cancel' : '+ Custom'}
                     </button>
                   </div>

                   {isAddingCategory ? (
                     <div className="flex gap-2 mb-4">
                       <input 
                         type="text" 
                         value={newCategoryName} 
                         onChange={(e) => setNewCategoryName(e.target.value)}
                         placeholder="Category Name" 
                         className="flex-1 bg-cream-50 rounded-xl py-3 px-4 border-none text-[10px] focus:ring-2 focus:ring-pink-100 font-bold" 
                       />
                       <button type="button" onClick={handleAddCustomCategory} className="bg-ink-900 text-white px-4 py-2 rounded-xl text-[10px] font-bold hover:bg-ink-800 transition-all font-serif">Add Category</button>
                     </div>
                   ) : (
                     <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                       {allCategories.map(cat => (
                         <button key={cat} type="button" onClick={() => setNewExpense({ ...newExpense, category: cat })} className={`py-3 px-4 rounded-xl text-[8px] font-bold transition-all text-left uppercase tracking-widest ${newExpense.category === cat ? 'bg-pink-500 text-white shadow-lg shadow-pink-100' : 'bg-cream-50 text-ink-300 hover:bg-pink-50 hover:text-pink-500'}`}>
                           {cat}
                         </button>
                       ))}
                     </div>
                   )}
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-ink-400 mb-2 block">Ledger Description</label>
                  <input type="text" required value={newExpense.description} onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })} placeholder="e.g. Sony A7IV for live streaming" className="w-full bg-cream-50 rounded-2xl py-4 px-4 border-none focus:ring-2 focus:ring-pink-100 font-bold text-ink-900 italic font-serif" />
                </div>

                <div className="flex gap-3 pt-6">
                  <button type="button" onClick={() => setShowAddExpense(false)} className="flex-1 py-4 text-[10px] font-bold uppercase tracking-widest text-ink-300 hover:bg-pink-50 rounded-2xl transition-all">Discard</button>
                  <button type="submit" className="flex-1 py-4 bg-ink-900 text-white rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all font-serif italic">Lock into Ledger</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showAddIncome && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddIncome(false)} className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white w-full max-w-lg rounded-[40px] shadow-2xl p-10 overflow-hidden">
               <div className="absolute top-0 inset-x-0 h-2 bg-emerald-500" />
               <h3 className="text-2xl font-bold mb-8 italic font-serif text-ink-900">Log Daily Sales</h3>
               
               <form onSubmit={handleAddIncome} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-ink-400 mb-2 block">Value (USD)</label>
                        <input type="number" step="0.01" required value={newIncome.amount} onChange={(e) => setNewIncome({ ...newIncome, amount: e.target.value })} placeholder="0.00" className="w-full bg-cream-50 rounded-2xl py-4 px-4 border-none focus:ring-2 focus:ring-pink-100 font-bold text-ink-900 italic font-serif text-xl" />
                     </div>
                     <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-ink-400 mb-2 block">Source</label>
                        <select value={newIncome.source} onChange={(e) => setNewIncome({ ...newIncome, source: e.target.value as any })} className="w-full bg-cream-50 rounded-2xl py-4 px-4 border-none focus:ring-2 focus:ring-pink-100 font-bold text-ink-900 uppercase text-[10px] tracking-widest h-[60px]">
                           <option value="affiliate">Affiliate Sales</option>
                           <option value="live">Live Streaming</option>
                           <option value="brand_deal">Brand Payouts</option>
                           <option value="other">Other Misc</option>
                        </select>
                     </div>
                  </div>

                  <div>
                     <label className="text-[10px] font-bold uppercase tracking-widest text-ink-400 mb-2 block">Match to Product</label>
                     <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                        {products.map(p => (
                          <button key={p.id} type="button" onClick={() => setNewIncome({ ...newIncome, productId: p.id })} className={`text-left p-3 rounded-xl border text-[10px] font-bold transition-all ${newIncome.productId === p.id ? 'bg-pink-500 text-white border-pink-500 shadow-lg shadow-pink-100' : 'bg-white border-pink-50 text-ink-400 hover:border-pink-200'}`}>
                             <p className="font-serif italic text-[12px]">{p.name}</p>
                             <p className="uppercase tracking-widest text-[8px] opacity-60 mt-1">{p.brand}</p>
                          </button>
                        ))}
                     </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-ink-400 mb-2 block">Description</label>
                    <input type="text" required value={newIncome.description} onChange={(e) => setNewIncome({ ...newIncome, description: e.target.value })} placeholder="e.g. 50x Affiliate Commissions" className="w-full bg-cream-50 rounded-2xl py-4 px-4 border-none focus:ring-2 focus:ring-pink-100 font-bold text-ink-900 italic font-serif" />
                  </div>

                  <div className="flex gap-3 pt-6">
                    <button type="button" onClick={() => setShowAddIncome(false)} className="flex-1 py-4 text-[10px] font-bold uppercase tracking-widest text-ink-300 hover:bg-pink-50 rounded-2xl transition-all">Cancel</button>
                    <button type="submit" className="flex-1 py-4 bg-ink-900 text-white rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all font-serif italic text-lg">Broadcast Revenue</button>
                  </div>
               </form>
            </motion.div>
          </div>
        )}

        {showAddBudget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddBudget(false)} className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white w-full max-w-2xl rounded-[40px] shadow-2xl p-10 overflow-hidden">
               <div className="absolute top-0 inset-x-0 h-2 bg-pink-500" />
               <div className="flex justify-between items-center mb-8">
                  <div>
                    <h3 className="text-2xl font-bold italic font-serif text-ink-900">Weekly Strategic Setup</h3>
                    <p className="text-[10px] font-bold text-pink-400 uppercase tracking-widest mt-1">Configure Protocol Week for {currentWeekId}</p>
                  </div>
                  <X className="w-6 h-6 text-ink-200 cursor-pointer" onClick={() => setShowAddBudget(false)} />
               </div>

               <div className="space-y-8 max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
                  <div className="p-8 bg-ink-900 text-white rounded-3xl">
                     <label className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40 mb-4 block">Primary Sales Goal (GMV)</label>
                     <div className="flex items-center gap-4">
                        <DollarSign className="w-10 h-10 text-pink-500" />
                        <input 
                           type="number" 
                           value={newBudget.salesGoal} 
                           onChange={(e) => setNewBudget({ ...newBudget, salesGoal: parseFloat(e.target.value) })}
                           className="bg-transparent border-none text-6xl font-bold font-serif italic focus:ring-0 p-0 w-full" 
                        />
                     </div>
                  </div>

                  <div className="space-y-4">
                     <h4 className="text-[10px] font-bold uppercase tracking-widest text-ink-400 flex items-center gap-2">
                        <div className="flex-1 h-px bg-pink-50" />
                        Allocated Spending Guardrails
                        <div className="flex-1 h-px bg-pink-50" />
                     </h4>
                     <div className="grid grid-cols-2 gap-4">
                        {allCategories.map(cat => (
                          <div key={cat} className="p-4 bg-cream-50 rounded-2xl border border-pink-50">
                             <label className="text-[8px] font-bold uppercase tracking-widest text-pink-500 mb-2 block truncate">{cat}</label>
                             <input 
                                type="number"
                                placeholder="$ 0.00"
                                value={newBudget.categoryBudgets?.[cat] || ''}
                                onChange={(e) => setNewBudget({
                                   ...newBudget,
                                   categoryBudgets: { ...newBudget.categoryBudgets, [cat]: parseFloat(e.target.value) || 0 }
                                })}
                                className="w-full bg-transparent border-none p-0 text-lg font-bold font-serif italic text-ink-900 focus:ring-0" 
                             />
                          </div>
                        ))}
                     </div>
                  </div>
               </div>

               <div className="flex gap-4 mt-8 border-t border-pink-50 pt-8">
                  <button onClick={() => setShowAddBudget(false)} className="flex-1 py-4 text-[10px] font-bold uppercase tracking-widest text-ink-300 hover:text-ink-900 transition-colors">Abort Changes</button>
                  <button onClick={handleSaveBudget} className="flex-1 py-4 bg-ink-900 text-white rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] shadow-xl hover:bg-pink-500 transition-all font-serif italic text-lg">Initialize Protocol Plan</button>
               </div>
            </motion.div>
          </div>
        )}

        {showTaxReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 text-ink-900">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowTaxReport(false)} className="absolute inset-0 bg-ink-900/40 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative bg-white w-full max-w-2xl rounded-[40px] shadow-2xl p-12 overflow-y-auto max-h-[90vh] border border-pink-100">
              <div className="flex justify-between items-start mb-12">
                <div>
                   <h3 className="text-3xl font-bold font-serif italic mb-2 underline decoration-pink-100 underline-offset-8 decoration-4">Tax Projection Report</h3>
                   <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-400">Official Strategic Digital OS // Financial Review</p>
                </div>
                <button onClick={() => setShowTaxReport(false)} className="p-2 hover:bg-pink-50 rounded-full transition-colors text-ink-200 hover:text-pink-500"><X className="w-6 h-6" /></button>
              </div>

              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-8">
                   <div className="p-8 bg-cream-50 rounded-3xl border border-pink-50">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-ink-400 mb-4 italic">Gross Revenue</p>
                      <p className="text-4xl font-bold font-serif italic tabular-nums text-emerald-600">${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                   </div>
                   <div className="p-8 bg-cream-50 rounded-3xl border border-pink-50">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-ink-400 mb-4 italic">Total Write-offs</p>
                      <p className="text-4xl font-bold font-serif italic tabular-nums text-pink-500">-${(totalExpenses + mileageDeduction).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                   </div>
                </div>

                <div className="bg-white rounded-[40px] p-10 border border-pink-100 space-y-6 shadow-sm">
                   <div className="flex justify-between items-center py-4 border-b border-pink-50">
                      <span className="text-xs font-bold uppercase tracking-widest text-ink-400 flex items-center gap-2 italic">
                         <ShieldCheck className="w-4 h-4 text-pink-300" /> Self-Employment Tax (15.3%)
                      </span>
                      <span className="text-xl font-bold font-serif italic tabular-nums text-ink-900">${selfEmploymentTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                   </div>
                   <div className="flex justify-between items-center py-4 border-b border-pink-50">
                      <span className="text-xs font-bold uppercase tracking-widest text-ink-400 flex items-center gap-2 italic">
                         <Calculator className="w-4 h-4 text-pink-300" /> Income Tax Estimate ({profile?.taxRate || 10}%)
                      </span>
                      <span className="text-xl font-bold font-serif italic tabular-nums text-ink-900">${incomeTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                   </div>
                   <div className="flex justify-between items-center py-8 bg-ink-900 text-white px-10 rounded-[40px] shadow-2xl mt-12 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative z-10">
                         <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Liability Lock-In</p>
                         <h4 className="text-lg font-bold italic font-serif text-pink-400">Total Projected Liability</h4>
                      </div>
                      <span className="text-4xl font-bold font-serif italic tabular-nums relative z-10">${totalTaxRef.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                   </div>
                </div>

                <div className="bg-pink-50/50 p-8 rounded-[40px] border border-pink-100 flex gap-6 italic">
                   <ShieldCheck className="w-10 h-10 text-pink-500 shrink-0" />
                   <div>
                      <p className="text-sm font-bold text-ink-900 mb-2 font-serif underline decoration-pink-200">Official Strategic Feedback</p>
                      <p className="text-xs text-ink-500 leading-relaxed font-medium">As a digital business owner, your leverage is in your deductions. Great job logging your {dailyLogs.length} activity sessions. Keep tracking every mile and sample purchase to minimize your taxable footprint.</p>
                   </div>
                </div>

                <button className="w-full py-6 bg-ink-900 text-white rounded-3xl font-bold flex items-center justify-center gap-4 shadow-xl shadow-pink-100 hover:scale-[1.02] active:scale-95 transition-all">
                  <Download className="w-6 h-6 bg-pink-500/20 text-pink-400 rounded-lg p-1" /> 
                  <div className="text-left">
                     <p className="text-sm font-serif italic">Download Tax Ledger // PDF</p>
                     <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Form Schedule C Compatible</p>
                  </div>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Award = ({ className }: { className?: string }) => <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"/><circle cx="12" cy="8" r="7"/><path d="M8.21 13.89L7 23l5-3.5 5 3.5-1.21-9.12"/></svg>;
