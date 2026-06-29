/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Edit, Trash2, ArrowUpDown, Filter,
  AlertTriangle, Clock, RefreshCw, X, Download, HelpCircle, Save,
  Database, ShieldAlert, Copy, Check
} from 'lucide-react';
import { dbService } from '../lib/supabase';
import { Medicine, Category, Supplier, Profile } from '../types';

interface MedicinesProps {
  currentUser: Profile;
  filterFromDashboard: 'all' | 'low' | 'expiring';
  setFilterFromDashboard: (filter: 'all' | 'low' | 'expiring') => void;
}

const getErrorMessage = (err: any): string => {
  if (!err) return 'Unknown error';
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && 'message' in err) return String(err.message);
  if (typeof err === 'object' && 'error_description' in err) return String(err.error_description);
  return typeof err === 'string' ? err : JSON.stringify(err);
};

export default function Medicines({ currentUser, filterFromDashboard, setFilterFromDashboard }: MedicinesProps) {
  const [loading, setLoading] = useState(true);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Filtering states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);

  // Active item selection
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formGeneric, setFormGeneric] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formPurchasePrice, setFormPurchasePrice] = useState(0);
  const [formSellingPrice, setFormSellingPrice] = useState(0);
  const [formStock, setFormStock] = useState(0);
  const [formThreshold, setFormThreshold] = useState(5);
  const [formBatch, setFormBatch] = useState('');
  const [formExpiry, setFormExpiry] = useState('');
  const [formSupplier, setFormSupplier] = useState('');

  // Restock form
  const [restockQty, setRestockQty] = useState(10);
  const [restockNote, setRestockNote] = useState('Distributor inventory load');

  // Category inline add
  const [newCatName, setNewCatName] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showDiagnostic, setShowDiagnostic] = useState(false);

  const TODAY_STR = '2026-06-25';
  const today = new Date(TODAY_STR);
  const thirtyDaysLater = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));

  const loadAll = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      let medsData: Medicine[] = [];
      let catsData: Category[] = [];
      let supsData: Supplier[] = [];

      try {
        medsData = await dbService.getMedicines();
      } catch (err) {
        console.error('Failed to load medicines:', err);
        setErrorMsg(prev => (prev ? prev + ' \n' : '') + 'Medicines fetch: ' + getErrorMessage(err));
      }

      try {
        catsData = await dbService.getCategories();
      } catch (err) {
        console.error('Failed to load categories:', err);
        setErrorMsg(prev => (prev ? prev + ' \n' : '') + 'Categories fetch: ' + getErrorMessage(err));
      }

      try {
        supsData = await dbService.getSuppliers();
      } catch (err) {
        console.error('Failed to load suppliers:', err);
        setErrorMsg(prev => (prev ? prev + ' \n' : '') + 'Suppliers fetch: ' + getErrorMessage(err));
      }

      setMedicines(medsData);
      setCategories(catsData);
      setSuppliers(supsData);
    } catch (err) {
      console.error('Failed to load database elements:', err);
      setErrorMsg(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const openAddModal = () => {
    setFormName('');
    setFormGeneric('');
    setFormCompany('');
    setFormCategory(categories[0]?.id || '');
    setFormPurchasePrice(0);
    setFormSellingPrice(0);
    setFormStock(0);
    setFormThreshold(5);
    setFormBatch('');
    setFormExpiry('');
    setFormSupplier(suppliers[0]?.id || '');
    setShowAddModal(true);
  };

  const openEditModal = (med: Medicine) => {
    setSelectedMedicine(med);
    setFormName(med.name);
    setFormGeneric(med.generic_name || '');
    setFormCompany(med.company || '');
    setFormCategory(med.category_id || '');
    setFormPurchasePrice(med.purchase_price);
    setFormSellingPrice(med.selling_price);
    setFormStock(med.stock);
    setFormThreshold(med.low_stock_threshold);
    setFormBatch(med.batch_number || '');
    setFormExpiry(med.expiry_date || '');
    setFormSupplier(med.supplier_id || '');
    setShowEditModal(true);
  };

  const openRestockModal = (med: Medicine) => {
    setSelectedMedicine(med);
    setRestockQty(10);
    setRestockNote('Distributor inventory load');
    setShowRestockModal(true);
  };

  const handleAddMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await dbService.addMedicine({
        name: formName.trim(),
        generic_name: formGeneric.trim() || undefined,
        company: formCompany.trim() || undefined,
        category_id: formCategory || undefined,
        purchase_price: Number(formPurchasePrice),
        selling_price: Number(formSellingPrice),
        stock: Number(formStock),
        low_stock_threshold: Number(formThreshold),
        batch_number: formBatch.trim() || undefined,
        expiry_date: formExpiry || undefined,
        supplier_id: formSupplier || undefined
      });
      setShowAddModal(false);
      loadAll();
    } catch (err) {
      alert('Error adding medicine: ' + getErrorMessage(err));
    }
  };

  const handleEditMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedicine) return;
    try {
      await dbService.updateMedicine(selectedMedicine.id, {
        name: formName.trim(),
        generic_name: formGeneric.trim() || undefined,
        company: formCompany.trim() || undefined,
        category_id: formCategory || undefined,
        purchase_price: Number(formPurchasePrice),
        selling_price: Number(formSellingPrice),
        stock: Number(formStock),
        low_stock_threshold: Number(formThreshold),
        batch_number: formBatch.trim() || undefined,
        expiry_date: formExpiry || undefined,
        supplier_id: formSupplier || undefined
      });
      setShowEditModal(false);
      loadAll();
    } catch (err) {
      alert('Error updating medicine: ' + getErrorMessage(err));
    }
  };

  const handleDeleteMedicine = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action is irreversible on the inventory.`)) return;
    try {
      await dbService.deleteMedicine(id);
      loadAll();
    } catch (err) {
      alert('Error deleting medicine: ' + getErrorMessage(err));
    }
  };

  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedicine) return;
    try {
      await dbService.restockMedicine(selectedMedicine.id, Number(restockQty), restockNote);
      setShowRestockModal(false);
      loadAll();
    } catch (err) {
      alert('Error restocking medicine: ' + getErrorMessage(err));
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      const added = await dbService.addCategory(newCatName.trim());
      setCategories([...categories, added]);
      setFormCategory(added.id);
      setShowAddCategoryModal(false);
      setNewCatName('');
    } catch (err) {
      alert('Error adding category: ' + getErrorMessage(err));
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    let headers = 'ID,Name,Generic Name,Company,Category,Selling Price,Stock,Low Stock Level,Batch,Expiry,Supplier\n';
    if (currentUser.role === 'owner') {
      headers = 'ID,Name,Generic Name,Company,Category,Purchase Price,Selling Price,Stock,Low Stock Level,Batch,Expiry,Supplier\n';
    }

    const rows = filteredMedicines.map(m => {
      const catName = categories.find(c => c.id === m.category_id)?.name || 'N/A';
      const supName = suppliers.find(s => s.id === m.supplier_id)?.name || 'N/A';
      
      const commonFields = [
        `"${m.id}"`,
        `"${m.name}"`,
        `"${m.generic_name || ''}"`,
        `"${m.company || ''}"`,
        `"${catName}"`,
        m.selling_price,
        m.stock,
        m.low_stock_threshold,
        `"${m.batch_number || ''}"`,
        `"${m.expiry_date || ''}"`,
        `"${supName}"`
      ];

      if (currentUser.role === 'owner') {
        commonFields.splice(5, 0, m.purchase_price);
      }

      return commonFields.join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + headers + rows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `pharm_inventory_export_${TODAY_STR}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter medicines based on search term, category and dashboard triggers
  const filteredMedicines = medicines.filter(med => {
    // Search filter
    const query = searchTerm.toLowerCase();
    const matchesSearch = 
      med.name.toLowerCase().includes(query) ||
      (med.generic_name && med.generic_name.toLowerCase().includes(query)) ||
      (med.company && med.company.toLowerCase().includes(query)) ||
      (med.batch_number && med.batch_number.toLowerCase().includes(query));

    // Category filter
    const matchesCategory = selectedCategory === 'all' || med.category_id === selectedCategory;

    // Dashboard alert filters
    let matchesDashboard = true;
    if (filterFromDashboard === 'low') {
      matchesDashboard = med.stock <= med.low_stock_threshold;
    } else if (filterFromDashboard === 'expiring') {
      if (!med.expiry_date) {
        matchesDashboard = false;
      } else {
        const exp = new Date(med.expiry_date);
        matchesDashboard = exp >= today && exp <= thirtyDaysLater;
      }
    }

    return matchesSearch && matchesCategory && matchesDashboard;
  });

  return (
    <div className="space-y-6 font-sans text-gray-900 dark:text-slate-100">
      
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
      
      {/* Search and Action bars */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-white dark:bg-slate-900 p-4 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-xs">
        
        {/* Filters */}
        <div className="flex flex-1 flex-col sm:flex-row gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-3 w-4.5 h-4.5 text-gray-400" />
            <input
              id="med-search-input"
              type="text"
              placeholder="Search by Brand Name, Formula, Company, Batch..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 transition-all text-gray-900 dark:text-white"
            />
          </div>

          {/* Category drop */}
          <div className="relative">
            <select
              id="category-filter"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3.5 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-sm focus:outline-hidden text-gray-700 dark:text-slate-300 font-medium cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Expiry / Low stock active triggers info badge */}
          {filterFromDashboard !== 'all' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-xs font-semibold rounded-lg border border-rose-100 dark:border-rose-900/40">
              <AlertTriangle className="w-4 h-4" />
              Showing: {filterFromDashboard === 'low' ? 'Low Stock Alerts' : 'Expiring Medicines'}
              <button 
                id="clear-dashboard-filter-btn"
                onClick={() => setFilterFromDashboard('all')} 
                className="hover:text-rose-800 dark:hover:text-rose-200 underline text-[10px] ml-1 uppercase font-bold cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}

        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3">
          <button
            id="export-inventory-btn"
            onClick={handleExportCSV}
            className="px-4 py-2.5 border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/60 rounded-xl text-sm font-medium text-gray-700 dark:text-slate-300 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            id="open-add-med-modal"
            onClick={openAddModal}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-emerald-600/10 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4.5 h-4.5" />
            Add Medicine
          </button>
        </div>

      </div>

      {/* Grid or Table listing */}
      <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        
        {loading ? (
          <div className="p-20 text-center flex flex-col items-center justify-center">
            <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
            <p className="text-xs text-gray-500 mt-2">Inventory Loading...</p>
          </div>
        ) : filteredMedicines.length === 0 ? (
          <div className="p-16 text-center">
            <HelpCircle className="w-12 h-12 text-gray-300 mx-auto" />
            <h4 className="font-bold text-base text-gray-900 dark:text-white mt-4">No Medicines Found</h4>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              No inventory entries match your search query or selected active filters. Add a new medicine or change filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-slate-950/20 text-gray-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-gray-100 dark:border-slate-800">
                  <th className="px-6 py-4">Brand / Generic</th>
                  <th className="px-6 py-4">Category / Co.</th>
                  <th className="px-6 py-4">Stock Level</th>
                  {currentUser.role === 'owner' && <th className="px-6 py-4">Cost Price</th>}
                  <th className="px-6 py-4">Retail Price</th>
                  <th className="px-6 py-4">Batch / Expiry</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60 text-sm">
                {filteredMedicines.map(med => {
                  const catName = categories.find(c => c.id === med.category_id)?.name || 'General';
                  
                  // Stock alerts
                  const isLow = med.stock <= med.low_stock_threshold;
                  const isOut = med.stock === 0;

                  // Expiry alerts
                  let isExpiringSoon = false;
                  if (med.expiry_date) {
                    const exp = new Date(med.expiry_date);
                    isExpiringSoon = exp >= today && exp <= thirtyDaysLater;
                  }

                  return (
                    <tr 
                      key={med.id} 
                      className="hover:bg-gray-50/50 dark:hover:bg-slate-900/40 transition-colors"
                      id={`med-row-${med.id}`}
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                            {med.name}
                            {isOut && <span className="text-[10px] font-bold px-1.5 py-0.25 bg-red-500/10 text-red-500 rounded-md">OUT OF STOCK</span>}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{med.generic_name || 'N/A'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-700 dark:text-slate-300">{catName}</p>
                          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{med.company || 'N/A'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className={`font-semibold font-mono text-[15px] ${isLow ? 'text-rose-500' : 'text-gray-900 dark:text-white'}`}>
                            {med.stock} pcs
                          </p>
                          {isLow && !isOut && (
                            <span className="text-[10px] text-rose-500 font-semibold flex items-center gap-0.5 mt-0.5">
                              <AlertTriangle className="w-3 h-3" />
                              Low limit: {med.low_stock_threshold}
                            </span>
                          )}
                        </div>
                      </td>
                      
                      {/* Cost Price - restricted to OWNER only */}
                      {currentUser.role === 'owner' && (
                        <td className="px-6 py-4 font-semibold font-mono text-gray-700 dark:text-slate-300">
                          ৳{Number(med.purchase_price).toFixed(2)}
                        </td>
                      )}

                      <td className="px-6 py-4 font-bold font-mono text-emerald-600 dark:text-emerald-400 text-[15px]">
                        ৳{Number(med.selling_price).toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-mono text-xs text-gray-600 dark:text-slate-400">{med.batch_number || 'No batch'}</p>
                          <p className={`text-xs font-mono mt-0.5 ${isExpiringSoon ? 'text-amber-500 font-semibold' : 'text-gray-400 dark:text-slate-500'}`}>
                            {med.expiry_date || 'N/A'}
                            {isExpiringSoon && (
                              <span className="text-[10px] bg-amber-500/10 text-amber-500 px-1 py-0.25 rounded-md ml-1 font-sans font-bold">EXPIRING</span>
                            )}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2.5">
                          <button
                            id={`med-restock-btn-${med.id}`}
                            onClick={() => openRestockModal(med)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-semibold text-xs hover:bg-emerald-100 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                          >
                            Restock
                          </button>
                          <button
                            id={`med-edit-btn-${med.id}`}
                            onClick={() => openEditModal(med)}
                            className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400 cursor-pointer"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          
                          {/* DELETE medicine: Owner-only check */}
                          {currentUser.role === 'owner' && (
                            <button
                              id={`med-delete-btn-${med.id}`}
                              onClick={() => handleDeleteMedicine(med.id, med.name)}
                              className="p-1.5 rounded-lg border border-red-200 dark:border-red-950/40 hover:bg-red-50 dark:hover:bg-red-950/25 text-red-500 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* ADD MEDICINE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-gray-950 dark:text-white">Add New Medicine</h3>
              <button 
                id="close-add-modal-btn"
                onClick={() => setShowAddModal(false)} 
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddMedicine} className="grid grid-cols-2 gap-4 text-xs font-sans">
              <div className="col-span-2">
                <label className="block font-bold text-gray-500 uppercase tracking-wide mb-1">Brand Medicine Name *</label>
                <input
                  id="form-name-input"
                  type="text"
                  required
                  placeholder="e.g. Napa Extra"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-lg bg-transparent text-sm focus:outline-hidden focus:ring-1 focus:ring-emerald-500 text-gray-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-500 uppercase tracking-wide mb-1">Generic / Formula *</label>
                <input
                  id="form-generic-input"
                  type="text"
                  placeholder="e.g. Paracetamol + Caffeine"
                  value={formGeneric}
                  onChange={(e) => setFormGeneric(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-lg bg-transparent text-sm focus:outline-hidden text-gray-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-500 uppercase tracking-wide mb-1">Company / Maker</label>
                <input
                  id="form-company-input"
                  type="text"
                  placeholder="e.g. Beximco"
                  value={formCompany}
                  onChange={(e) => setFormCompany(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-lg bg-transparent text-sm focus:outline-hidden text-gray-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-500 uppercase tracking-wide mb-1 flex justify-between items-center">
                  Category *
                  <button 
                    id="add-inline-category-btn"
                    type="button" 
                    onClick={() => setShowAddCategoryModal(true)} 
                    className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline font-bold"
                  >
                    + Add New
                  </button>
                </label>
                <select
                  id="form-category-input"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-sm focus:outline-hidden text-gray-950 dark:text-white"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-500 uppercase tracking-wide mb-1">Supplier / Distributor</label>
                <select
                  id="form-supplier-input"
                  value={formSupplier}
                  onChange={(e) => setFormSupplier(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-sm focus:outline-hidden text-gray-950 dark:text-white"
                >
                  <option value="">No Supplier Assigned</option>
                  {suppliers.map(sup => (
                    <option key={sup.id} value={sup.id}>{sup.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-500 uppercase tracking-wide mb-1">Purchase Cost (৳) *</label>
                <input
                  id="form-purchase-price-input"
                  type="number"
                  step="0.01"
                  required
                  min="0"
                  value={formPurchasePrice}
                  onChange={(e) => setFormPurchasePrice(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-lg bg-transparent text-sm focus:outline-hidden text-gray-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-500 uppercase tracking-wide mb-1">Selling Price (Retail ৳) *</label>
                <input
                  id="form-selling-price-input"
                  type="number"
                  step="0.01"
                  required
                  min="0"
                  value={formSellingPrice}
                  onChange={(e) => setFormSellingPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-lg bg-transparent text-sm focus:outline-hidden text-gray-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-500 uppercase tracking-wide mb-1">Stock Quantity *</label>
                <input
                  id="form-stock-input"
                  type="number"
                  required
                  min="0"
                  value={formStock}
                  onChange={(e) => setFormStock(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-lg bg-transparent text-sm focus:outline-hidden text-gray-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-500 uppercase tracking-wide mb-1">Low Stock Limit *</label>
                <input
                  id="form-threshold-input"
                  type="number"
                  required
                  min="1"
                  value={formThreshold}
                  onChange={(e) => setFormThreshold(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-lg bg-transparent text-sm focus:outline-hidden text-gray-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-500 uppercase tracking-wide mb-1">Batch Number</label>
                <input
                  id="form-batch-input"
                  type="text"
                  placeholder="e.g. B-101"
                  value={formBatch}
                  onChange={(e) => setFormBatch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-lg bg-transparent text-sm focus:outline-hidden text-gray-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-500 uppercase tracking-wide mb-1">Expiry Date</label>
                <input
                  id="form-expiry-input"
                  type="date"
                  value={formExpiry}
                  onChange={(e) => setFormExpiry(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-sm focus:outline-hidden text-gray-950 dark:text-white"
                />
              </div>

              <div className="col-span-2 pt-3 flex justify-end gap-3 border-t border-gray-100 dark:border-slate-800">
                <button
                  id="cancel-add-med-btn"
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg text-sm text-gray-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  id="submit-add-med-btn"
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-sm shadow-md"
                >
                  Save Medicine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MEDICINE MODAL */}
      {showEditModal && selectedMedicine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-gray-950 dark:text-white">Edit Medicine: {selectedMedicine.name}</h3>
              <button 
                id="close-edit-modal-btn"
                onClick={() => setShowEditModal(false)} 
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleEditMedicine} className="grid grid-cols-2 gap-4 text-xs font-sans">
              <div className="col-span-2">
                <label className="block font-bold text-gray-500 uppercase tracking-wide mb-1">Brand Medicine Name *</label>
                <input
                  id="edit-form-name-input"
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-lg bg-transparent text-sm focus:outline-hidden focus:ring-1 focus:ring-emerald-500 text-gray-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-500 uppercase tracking-wide mb-1">Generic / Formula *</label>
                <input
                  id="edit-form-generic-input"
                  type="text"
                  value={formGeneric}
                  onChange={(e) => setFormGeneric(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-lg bg-transparent text-sm focus:outline-hidden text-gray-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-500 uppercase tracking-wide mb-1">Company / Maker</label>
                <input
                  id="edit-form-company-input"
                  type="text"
                  value={formCompany}
                  onChange={(e) => setFormCompany(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-lg bg-transparent text-sm focus:outline-hidden text-gray-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-500 uppercase tracking-wide mb-1">Category *</label>
                <select
                  id="edit-form-category-input"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-sm focus:outline-hidden text-gray-950 dark:text-white"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-500 uppercase tracking-wide mb-1">Supplier / Distributor</label>
                <select
                  id="edit-form-supplier-input"
                  value={formSupplier}
                  onChange={(e) => setFormSupplier(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-sm focus:outline-hidden text-gray-950 dark:text-white"
                >
                  <option value="">No Supplier Assigned</option>
                  {suppliers.map(sup => (
                    <option key={sup.id} value={sup.id}>{sup.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-500 uppercase tracking-wide mb-1">Purchase Cost (৳) *</label>
                <input
                  id="edit-form-purchase-price-input"
                  type="number"
                  step="0.01"
                  required
                  min="0"
                  value={formPurchasePrice}
                  onChange={(e) => setFormPurchasePrice(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-lg bg-transparent text-sm focus:outline-hidden text-gray-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-500 uppercase tracking-wide mb-1">Selling Price (Retail ৳) *</label>
                <input
                  id="edit-form-selling-price-input"
                  type="number"
                  step="0.01"
                  required
                  min="0"
                  value={formSellingPrice}
                  onChange={(e) => setFormSellingPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-lg bg-transparent text-sm focus:outline-hidden text-gray-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-500 uppercase tracking-wide mb-1">Stock Quantity *</label>
                <input
                  id="edit-form-stock-input"
                  type="number"
                  required
                  min="0"
                  value={formStock}
                  onChange={(e) => setFormStock(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-lg bg-transparent text-sm focus:outline-hidden text-gray-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-500 uppercase tracking-wide mb-1">Low Stock Limit *</label>
                <input
                  id="edit-form-threshold-input"
                  type="number"
                  required
                  min="1"
                  value={formThreshold}
                  onChange={(e) => setFormThreshold(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-lg bg-transparent text-sm focus:outline-hidden text-gray-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-500 uppercase tracking-wide mb-1">Batch Number</label>
                <input
                  id="edit-form-batch-input"
                  type="text"
                  value={formBatch}
                  onChange={(e) => setFormBatch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-lg bg-transparent text-sm focus:outline-hidden text-gray-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-500 uppercase tracking-wide mb-1">Expiry Date</label>
                <input
                  id="edit-form-expiry-input"
                  type="date"
                  value={formExpiry}
                  onChange={(e) => setFormExpiry(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-sm focus:outline-hidden text-gray-950 dark:text-white"
                />
              </div>

              <div className="col-span-2 pt-3 flex justify-end gap-3 border-t border-gray-100 dark:border-slate-800">
                <button
                  id="cancel-edit-med-btn"
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg text-sm text-gray-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  id="submit-edit-med-btn"
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-sm shadow-md"
                >
                  Apply Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESTOCK ACTION MODAL */}
      {showRestockModal && selectedMedicine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-800 pb-2">
              <h3 className="font-bold text-base text-gray-950 dark:text-white flex items-center gap-1.5">
                <RefreshCw className="w-4 h-4 text-emerald-500" />
                Restock: {selectedMedicine.name}
              </h3>
              <button 
                id="close-restock-modal-btn"
                onClick={() => setShowRestockModal(false)} 
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRestock} className="space-y-4 text-xs font-sans">
              <div>
                <p className="text-gray-500 dark:text-slate-400">Current stock: <strong className="text-gray-900 dark:text-white font-mono">{selectedMedicine.stock} pcs</strong></p>
              </div>

              <div>
                <label className="block font-bold text-gray-500 uppercase tracking-wide mb-1">Quantity to ADD *</label>
                <input
                  id="restock-qty-input"
                  type="number"
                  required
                  min="1"
                  value={restockQty}
                  onChange={(e) => setRestockQty(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-lg bg-transparent text-sm font-mono text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-500 uppercase tracking-wide mb-1">Restocking Note / Invoice</label>
                <input
                  id="restock-note-input"
                  type="text"
                  placeholder="e.g. Bought from Beximco directly"
                  value={restockNote}
                  onChange={(e) => setRestockNote(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-lg bg-transparent text-sm text-gray-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-gray-100 dark:border-slate-800">
                <button
                  id="cancel-restock-btn"
                  type="button"
                  onClick={() => setShowRestockModal(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg text-sm text-gray-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  id="submit-restock-btn"
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-sm shadow-md"
                >
                  Confirm Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INLINE CATEGORY ADD SUB-MODAL */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl w-full max-w-xs p-5 shadow-2xl space-y-4">
            <h4 className="font-bold text-sm text-gray-900 dark:text-white">Create New Category</h4>
            <form onSubmit={handleAddCategory} className="space-y-3.5 text-xs">
              <input
                id="new-category-name-input"
                type="text"
                required
                placeholder="e.g. Inhalers, Eye Drops"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-lg text-sm bg-transparent text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  id="cancel-inline-category-btn"
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
                  className="px-3 py-1.5 border border-gray-200 dark:border-slate-800 rounded-lg text-gray-500"
                >
                  Cancel
                </button>
                <button
                  id="submit-inline-category-btn"
                  type="submit"
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg"
                >
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
