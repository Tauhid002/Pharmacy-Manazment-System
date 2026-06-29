/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, AlertTriangle, Clock, Coins, Truck, 
  ShieldCheck, ArrowUpRight, BarChart3, Users, ChevronRight, Pill,
  Database, ShieldAlert, Copy, Check
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';
import { dbService } from '../lib/supabase';
import { Medicine, Sale, Customer, Supplier, Profile } from '../types';

interface DashboardProps {
  currentUser: Profile;
  setActiveTab: (tab: string) => void;
  setMedicineFilter: (filter: 'all' | 'low' | 'expiring') => void;
}

const getErrorMessage = (err: any): string => {
  if (!err) return 'Unknown error';
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && 'message' in err) return String(err.message);
  return String(err);
};

export default function Dashboard({ currentUser, setActiveTab, setMedicineFilter }: DashboardProps) {
  const [loading, setLoading] = useState(true);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [saleItems, setSaleItems] = useState<any[]>([]);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setErrorMsg(null);
      try {
        let medsData: Medicine[] = [];
        let salesData: Sale[] = [];
        let custsData: Customer[] = [];
        let supsData: Supplier[] = [];
        let itemsData: any[] = [];

        try {
          medsData = await dbService.getMedicines();
        } catch (err) {
          console.error('Error fetching medicines:', err);
          setErrorMsg(prev => (prev ? prev + ' \n' : '') + 'Medicines fetch: ' + getErrorMessage(err));
        }

        try {
          salesData = await dbService.getSales();
        } catch (err) {
          console.error('Error fetching sales:', err);
          setErrorMsg(prev => (prev ? prev + ' \n' : '') + 'Sales fetch: ' + getErrorMessage(err));
        }

        try {
          custsData = await dbService.getCustomers();
        } catch (err) {
          console.error('Error fetching customers:', err);
          setErrorMsg(prev => (prev ? prev + ' \n' : '') + 'Customers fetch: ' + getErrorMessage(err));
        }

        try {
          supsData = await dbService.getSuppliers();
        } catch (err) {
          console.error('Error fetching suppliers:', err);
          setErrorMsg(prev => (prev ? prev + ' \n' : '') + 'Suppliers fetch: ' + getErrorMessage(err));
        }

        try {
          itemsData = await dbService.getSaleItems();
        } catch (err) {
          console.error('Error fetching sale items:', err);
          setErrorMsg(prev => (prev ? prev + ' \n' : '') + 'Sale Items fetch: ' + getErrorMessage(err));
        }

        setMedicines(medsData);
        setSales(salesData);
        setCustomers(custsData);
        setSuppliers(supsData);
        setSaleItems(itemsData);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
        setErrorMsg(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-500" />
      </div>
    );
  }

  // Current Date contexts (dynamically calculated)
  const TODAY_STR = new Date().toLocaleDateString('en-CA'); // outputs timezone-safe YYYY-MM-DD
  const today = new Date();
  const thirtyDaysLater = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));

  // Calculations
  const lowStockMeds = medicines.filter(m => m.stock <= m.low_stock_threshold);
  const expiringMeds = medicines.filter(m => {
    if (!m.expiry_date) return false;
    const exp = new Date(m.expiry_date);
    return exp >= today && exp <= thirtyDaysLater;
  });

  // Sales filters:
  // Owner sees everything, Staff sees only their own sales
  const visibleSales = currentUser.role === 'owner' 
    ? sales 
    : sales.filter(s => s.sold_by === currentUser.id);

  // Today's Sales Revenue
  const todaySales = visibleSales.filter(s => s.sale_date.startsWith(TODAY_STR));
  const todaySalesRevenue = todaySales.reduce((sum, s) => sum + Number(s.total_price), 0);
  const todaySalesCount = todaySales.length;

  // Dues & Supplier figures (Owner only for financial numbers, Staff sees indicators or restricted views)
  const totalOutstandingDues = customers.reduce((sum, c) => sum + Number(c.total_due), 0);
  const totalSupplierPayables = suppliers.reduce((sum, s) => sum + Number(s.total_owed), 0);

  // Sales Trend Chart Data
  // Dynamically group visible sales of the last 7 calendar days
  const last7DaysData = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dStr = d.toLocaleDateString('en-CA');
    
    // Filter sales on this specific calendar date
    const daySales = visibleSales.filter(s => s.sale_date.startsWith(dStr));
    const totalForDay = daySales.reduce((sum, s) => sum + Number(s.total_price), 0);
    
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      sales: totalForDay
    };
  });

  // Best selling products dynamic analytics computed directly from the transaction history
  const itemQuantities: { [medId: string]: number } = {};
  saleItems.forEach(item => {
    itemQuantities[item.medicine_id] = (itemQuantities[item.medicine_id] || 0) + Number(item.quantity);
  });

  const bestSellersData = Object.entries(itemQuantities)
    .map(([medId, qty]) => {
      const med = medicines.find(m => m.id === medId);
      return {
        name: med ? med.name : `Med #${medId.substring(0, 5)}`,
        quantity: qty,
        revenue: qty * (med ? med.selling_price : 0)
      };
    })
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  // Fallback placeholder display if no sales transactions exist yet
  if (bestSellersData.length === 0) {
    medicines.slice(0, 5).forEach(med => {
      bestSellersData.push({
        name: med.name,
        quantity: 0,
        revenue: 0
      });
    });
  }

  const COLORS = ['#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1'];

  return (
    <div className="space-y-6 font-sans text-slate-900 dark:text-slate-100">
      
      {/* Supabase Connection Troubleshooter Banner */}
      {(errorMsg || (dbService.getConfig().useLive && medicines.length === 0 && !loading)) && (
        <div className="p-5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl flex flex-col sm:flex-row gap-4 items-start shadow-xs">
          <ShieldAlert className="w-10 h-10 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <h4 className="font-bold text-sm text-amber-900 dark:text-amber-400 flex flex-wrap items-center gap-2">
              <span>Supabase Connection Diagnostic & RLS Checker</span>
              <span className="text-xs bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-md text-amber-700 dark:text-amber-500 font-mono font-normal">
                {dbService.getConfig().useLive ? 'Supabase Live is Enabled' : 'Demo Mode'}
              </span>
            </h4>
            <div className="text-xs text-amber-800/95 dark:text-slate-300 space-y-1">
              <p className="font-semibold">
                লাইভ ডাটাবেজ কানেক্টেড আছে, কিন্তু কোনো তথ্য পাওয়া যাচ্ছে না। এর কারণ সাধারণত নিচের ২টি হতে পারে:
              </p>
              <ul className="list-disc list-inside ml-2 space-y-0.5">
                <li><strong>Row Level Security (RLS)</strong>: Supabase টেবিলে RLS একটিভ থাকলে পারমিশন ছাড়া ডাটা রিড করা যায় না।</li>
                <li><strong>No Seed Data</strong>: ডাটাবেজটি হয়তো সম্পূর্ণ খালি রয়েছে।</li>
              </ul>
            </div>

            <div className="flex flex-wrap gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDiagnostic(!showDiagnostic)}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Database className="w-3.5 h-3.5" />
                {showDiagnostic ? 'Hide SQL Code (SQL কোড লুকান)' : 'Show RLS Fix SQL (RLS ঠিক করার কোড)'}
              </button>
              <button
                type="button"
                onClick={() => {
                  dbService.updateConfig({
                    ...dbService.getConfig(),
                    useLive: false
                  });
                }}
                className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
              >
                Switch to Demo DB (ডেমো ডাটাবেজে ফিরে যান)
              </button>
            </div>

            {showDiagnostic && (
              <div className="mt-3 p-4 bg-slate-900 text-slate-100 border border-slate-800 rounded-xl space-y-3 animate-in fade-in duration-150">
                <p className="text-[11px] text-gray-400 font-mono">
                  নিচের SQL কোডটি কপি করে আপনার Supabase-এর <strong>SQL Editor</strong> এ গিয়ে <strong>New Query</strong> তৈরি করে পেস্ট করে <strong>Run</strong> করুন। এতে RLS বন্ধ হবে এবং ডাটা শো করবে:
                </p>
                <div className="relative">
                  <pre className="text-[10px] font-mono bg-slate-950 p-3 rounded-lg overflow-x-auto max-h-48 text-emerald-400">
{`-- 1. Disable Row Level Security (RLS) for all tables
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE medicines DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE due_ledger DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_purchases DISABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_payments DISABLE ROW LEVEL SECURITY;`}
                  </pre>
                  <button
                    type="button"
                    onClick={() => {
                      const sqlText = `-- Disable RLS for all tables to fix connection\nALTER TABLE profiles DISABLE ROW LEVEL SECURITY;\nALTER TABLE categories DISABLE ROW LEVEL SECURITY;\nALTER TABLE suppliers DISABLE ROW LEVEL SECURITY;\nALTER TABLE medicines DISABLE ROW LEVEL SECURITY;\nALTER TABLE customers DISABLE ROW LEVEL SECURITY;\nALTER TABLE sales DISABLE ROW LEVEL SECURITY;\nALTER TABLE sale_items DISABLE ROW LEVEL SECURITY;\nALTER TABLE due_ledger DISABLE ROW LEVEL SECURITY;\nALTER TABLE stock_logs DISABLE ROW LEVEL SECURITY;\nALTER TABLE supplier_purchases DISABLE ROW LEVEL SECURITY;\nALTER TABLE supplier_payments DISABLE ROW LEVEL SECURITY;`;
                      navigator.clipboard.writeText(sqlText);
                      setCopiedSql(true);
                      setTimeout(() => setCopiedSql(false), 2000);
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-xs flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedSql ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Welcome Banner / Tilted Glass Bento Panel */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div>
          <h3 className="font-display font-bold text-xl text-slate-900 dark:text-white tracking-tight">
            Welcome back, {currentUser.full_name}!
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Logged in as <span className="font-bold text-emerald-600 dark:text-emerald-400 capitalize">{currentUser.role}</span>. Here is your pharmacy dashboard summary for {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-xs">
          <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 font-mono">System Time: {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {/* Bento Grid: Row 1 - KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        
        {/* Today's Sales Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xs flex flex-col justify-between hover:shadow-md hover:border-emerald-500/30 hover:scale-[1.01] transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 px-2 py-0.5 bg-emerald-500/10 rounded-md flex items-center gap-0.5 uppercase tracking-wider font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live
            </span>
          </div>
          <div className="mt-5">
            <p className="text-xs text-slate-400 dark:text-slate-500 font-bold tracking-wider uppercase">Today's Revenue</p>
            <h4 className="text-3xl font-display font-black text-slate-900 dark:text-white mt-1 font-mono">
              ৳{todaySalesRevenue.toLocaleString()}
            </h4>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 font-medium">
              {todaySalesCount} sales transaction{todaySalesCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Low Stock Card */}
        <button
          id="dashboard-card-low-stock"
          onClick={() => {
            setMedicineFilter('low');
            setActiveTab('medicines');
          }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xs flex flex-col justify-between hover:shadow-md hover:border-amber-500/30 hover:scale-[1.01] transition-all duration-300 text-left cursor-pointer border-l-4 border-l-amber-500"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider font-mono">
              Restock
            </span>
          </div>
          <div className="mt-5">
            <p className="text-xs text-slate-400 dark:text-slate-500 font-bold tracking-wider uppercase">Low Stock Alert</p>
            <h4 className="text-3xl font-display font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">
              {lowStockMeds.length}
            </h4>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-semibold flex items-center gap-0.5 underline">
              View stock lists <ChevronRight className="w-3.5 h-3.5" />
            </p>
          </div>
        </button>

        {/* Expiry Warning Card */}
        <button
          id="dashboard-card-expiring"
          onClick={() => {
            setMedicineFilter('expiring');
            setActiveTab('medicines');
          }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xs flex flex-col justify-between hover:shadow-md hover:border-rose-500/30 hover:scale-[1.01] transition-all duration-300 text-left cursor-pointer border-l-4 border-l-rose-500"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 rounded-xl text-rose-600 dark:text-rose-400">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-[10px] text-rose-500 dark:text-rose-400 font-bold uppercase tracking-wider font-mono">
              Expiring &lt;30d
            </span>
          </div>
          <div className="mt-5">
            <p className="text-xs text-slate-400 dark:text-slate-500 font-bold tracking-wider uppercase">Critical Batches</p>
            <h4 className="text-3xl font-display font-black text-rose-600 dark:text-rose-400 mt-1 font-mono">
              {expiringMeds.length}
            </h4>
            <p className="text-xs text-rose-500 dark:text-rose-400 mt-2 font-semibold flex items-center gap-0.5 underline">
              Action Required <ChevronRight className="w-3.5 h-3.5" />
            </p>
          </div>
        </button>

        {/* Outstanding Dues Card */}
        <button
          id="dashboard-card-dues"
          onClick={() => setActiveTab('dues')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xs flex flex-col justify-between hover:shadow-md hover:border-emerald-500/30 hover:scale-[1.01] transition-all duration-300 text-left cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400">
              <Coins className="w-5 h-5" />
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold font-mono">
              Tally Khata
            </span>
          </div>
          <div className="mt-5">
            <p className="text-xs text-slate-400 dark:text-slate-500 font-bold tracking-wider uppercase">Outstanding Dues</p>
            <h4 className="text-3xl font-display font-black text-slate-900 dark:text-white mt-1 font-mono">
              ৳{totalOutstandingDues.toLocaleString()}
            </h4>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-semibold flex items-center gap-0.5 underline">
              Collect Payments <ChevronRight className="w-3.5 h-3.5" />
            </p>
          </div>
        </button>

        {/* Supplier Payable Card */}
        <button
          id="dashboard-card-suppliers"
          onClick={() => setActiveTab('suppliers')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xs flex flex-col justify-between hover:shadow-md hover:border-emerald-500/30 hover:scale-[1.01] transition-all duration-300 text-left cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400">
              <Truck className="w-5 h-5" />
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold font-mono">
              Distributor debts
            </span>
          </div>
          <div className="mt-5">
            <p className="text-xs text-slate-400 dark:text-slate-500 font-bold tracking-wider uppercase">Owed to Suppliers</p>
            <h4 className="text-3xl font-display font-black text-slate-900 dark:text-white mt-1 font-mono">
              {currentUser.role === 'owner' ? `৳${totalSupplierPayables.toLocaleString()}` : '***'}
            </h4>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 font-medium flex items-center gap-0.5">
              {currentUser.role === 'owner' ? 'View supply logs' : 'Owner only view'} <ChevronRight className="w-3.5 h-3.5" />
            </p>
          </div>
        </button>

      </div>

      {/* Bento Grid: Row 2 - Analytics Visualizers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sales Trend Chart Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h4 className="font-display font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span className="p-1 bg-emerald-100 dark:bg-emerald-950/50 rounded-lg text-emerald-600 dark:text-emerald-400">📊</span>
                Revenue Trend Chart
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {currentUser.role === 'owner' ? 'Weekly revenue overview' : 'Your personal checkout sales log'}
              </p>
            </div>
            <div className="text-xs text-slate-400 font-mono font-bold bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">৳ BDT Currency</div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={last7DaysData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:hidden" />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" className="hidden dark:block" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderRadius: '12px', 
                    border: 'none',
                    color: '#fff',
                    fontFamily: 'sans-serif',
                    fontSize: '12px'
                  }} 
                />
                <Area type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Best Sellers Chart Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h4 className="font-display font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span className="p-1 bg-emerald-100 dark:bg-emerald-950/50 rounded-lg text-emerald-600 dark:text-emerald-400">🔥</span>
                Best Sellers by Volume
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Top performing inventory items</p>
            </div>
            <div className="text-xs text-slate-400 font-mono font-bold bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">Qty Units</div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bestSellersData} layout="vertical" margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" className="dark:hidden" />
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1e293b" className="hidden dark:block" />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} tickLine={false} width={80} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderRadius: '12px', 
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px'
                  }} 
                />
                <Bar dataKey="quantity" fill="#10b981" radius={[0, 6, 6, 0]}>
                  {bestSellersData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Bento Grid: Row 3 - Alerts & Insights Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Urgent Restock Alerts Bento Tile */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-xs">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <h4 className="font-display font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
              <AlertTriangle className="w-4.5 h-4.5 text-rose-500" />
              Inventory Shortage Warnings
            </h4>
            <button
              id="dash-link-restock"
              onClick={() => {
                setMedicineFilter('low');
                setActiveTab('medicines');
              }}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
            >
              Restock <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          
          {lowStockMeds.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-6 text-center font-medium">All medicine stocks are healthy.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-56 overflow-y-auto space-y-1 pr-1">
              {lowStockMeds.slice(0, 5).map(med => (
                <div key={med.id} className="py-3 flex items-center justify-between text-xs hover:bg-slate-50/50 dark:hover:bg-slate-800/30 px-2 rounded-xl transition-colors">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{med.name}</span>
                    <span className="text-slate-400 dark:text-slate-500 block text-[10px] mt-0.5">{med.company} ({med.generic_name})</span>
                  </div>
                  <div className="text-right">
                    <span className={`px-2.5 py-1 rounded-full font-bold font-mono text-[11px] ${
                      med.stock === 0 ? 'bg-rose-500/10 text-rose-500 border border-rose-200/20' : 'bg-amber-500/10 text-amber-500 border border-amber-200/20'
                    }`}>
                      Stock: {med.stock}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-1.5">Threshold: {med.low_stock_threshold}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expiring Soon Alerts Bento Tile */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-xs">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <h4 className="font-display font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
              <Clock className="w-4.5 h-4.5 text-amber-500" />
              Medicines Expiring Soon (30 days)
            </h4>
            <button
              id="dash-link-expiring"
              onClick={() => {
                setMedicineFilter('expiring');
                setActiveTab('medicines');
              }}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
            >
              Inspect <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          
          {expiringMeds.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-6 text-center font-medium">No medicines expiring within 30 days.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-56 overflow-y-auto space-y-1 pr-1">
              {expiringMeds.slice(0, 5).map(med => {
                const remainingDays = Math.ceil((new Date(med.expiry_date!).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={med.id} className="py-3 flex items-center justify-between text-xs hover:bg-slate-50/50 dark:hover:bg-slate-800/30 px-2 rounded-xl transition-colors">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white text-sm">{med.name}</span>
                      <span className="text-slate-400 dark:text-slate-500 block text-[10px] mt-0.5">Batch: {med.batch_number || 'N/A'}</span>
                    </div>
                    <div className="text-right">
                      <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-500 font-bold font-mono text-[11px] border border-rose-200/20">
                        {remainingDays} days left
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-1.5">Exp: {med.expiry_date}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
