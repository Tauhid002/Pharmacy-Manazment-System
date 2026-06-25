/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, Search, PlusCircle, Coins, ArrowRightLeft, Clock,
  DollarSign, ChevronRight, X, AlertCircle, CheckCircle, FileText
} from 'lucide-react';
import { dbService } from '../lib/supabase';
import { Customer, DueLedgerEntry, Profile } from '../types';

interface CustomersProps {
  currentUser: Profile;
}

const getErrorMessage = (err: any): string => {
  if (!err) return 'Unknown error';
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && 'message' in err) return String(err.message);
  if (typeof err === 'object' && 'error_description' in err) return String(err.error_description);
  return typeof err === 'string' ? err : JSON.stringify(err);
};

export default function Customers({ currentUser }: CustomersProps) {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Selected customer for tally ledger inspection
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<DueLedgerEntry[]>([]);

  // Record Payment modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentNote, setPaymentNote] = useState('Dues installment cleared');

  // Customer Add Form
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustMobile, setNewCustMobile] = useState('');

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await dbService.getCustomers();
      setCustomers(data);
      if (activeCustomer) {
        // Refresh active customer metrics
        const refreshedActive = data.find(c => c.id === activeCustomer.id);
        if (refreshedActive) setActiveCustomer(refreshedActive);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadLedger = async (customerId: string) => {
    try {
      const data = await dbService.getDueLedger(customerId);
      setLedgerEntries(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleInspectCustomer = async (cust: Customer) => {
    setActiveCustomer(cust);
    await loadLedger(cust.id);
  };

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomer || paymentAmount <= 0) return;
    try {
      await dbService.recordDuePayment(activeCustomer.id, Number(paymentAmount), paymentNote);
      setShowPaymentModal(false);
      setPaymentAmount(0);
      
      // Reload everything
      await loadCustomers();
      await loadLedger(activeCustomer.id);
    } catch (err) {
      alert('Failed to record cash payment: ' + getErrorMessage(err));
    }
  };

  const handleAddCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;
    try {
      const added = await dbService.addCustomer(newCustName.trim(), newCustMobile.trim() || undefined);
      setShowAddModal(false);
      setNewCustName('');
      setNewCustMobile('');
      await loadCustomers();
      handleInspectCustomer(added); // immediately inspect added user
    } catch (err) {
      alert('Error creating customer profile: ' + getErrorMessage(err));
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.mobile && c.mobile.includes(searchTerm))
  );

  const totalStoreDues = customers.reduce((sum, c) => sum + Number(c.total_due), 0);

  return (
    <div className="space-y-6 font-sans text-gray-900 dark:text-slate-100">
      
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Total Oustanding Dues ledger banner */}
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Total Outstanding Tally Dues</p>
            <h4 className="text-2xl font-bold font-mono text-rose-500">৳{totalStoreDues.toLocaleString()}</h4>
            <p className="text-[10px] text-gray-400">Sum of credits across all recorded clients</p>
          </div>
          <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl">
            <Coins className="w-6 h-6" />
          </div>
        </div>

        {/* Client Count */}
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Registered Accounts</p>
            <h4 className="text-2xl font-bold font-mono text-gray-950 dark:text-white">{customers.length}</h4>
            <p className="text-[10px] text-gray-400">Total customers registered in tally khata</p>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Due Debtors Count */}
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Active Credit Debtors</p>
            <h4 className="text-2xl font-bold font-mono text-amber-500">
              {customers.filter(c => c.total_due > 0).length}
            </h4>
            <p className="text-[10px] text-gray-400">Clients currently holding unpaid dues</p>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
            <ArrowRightLeft className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Main split grid: Customer List (Left) vs Ledger Chronicle (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Customer Directory Index (cols 1 to 5) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-xs space-y-4">
          
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wider">Tally Customer Directory</h3>
            <button
              id="directory-add-cust-btn"
              onClick={() => setShowAddModal(true)}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Register Client
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4.5 h-4.5 text-gray-400" />
            <input
              id="cust-directory-search"
              type="text"
              placeholder="Search by client name or mobile..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-sm focus:outline-hidden"
            />
          </div>

          {/* Customer list scrollable column */}
          {loading ? (
            <p className="text-xs text-gray-400 text-center py-10">Directory Syncing...</p>
          ) : filteredCustomers.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-10">No customer profiles match criteria.</p>
          ) : (
            <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
              {filteredCustomers.map(cust => {
                const isActive = activeCustomer?.id === cust.id;
                return (
                  <button
                    id={`inspect-cust-${cust.id}`}
                    key={cust.id}
                    onClick={() => handleInspectCustomer(cust)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                      isActive 
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-950 dark:text-emerald-400 scale-[1.01]' 
                        : 'bg-transparent border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/40 text-gray-900 dark:text-slate-300'
                    }`}
                  >
                    <div>
                      <p className="font-bold text-sm">{cust.name}</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{cust.mobile || 'No Mobile Contact'}</p>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <div>
                        <p className={`font-bold font-mono text-sm ${cust.total_due > 0 ? 'text-rose-500' : 'text-gray-400'}`}>
                          ৳{Number(cust.total_due).toLocaleString()}
                        </p>
                        <span className="text-[9px] text-gray-400 uppercase tracking-wider block mt-0.5">Dues</span>
                      </div>
                      <ChevronRight className={`w-4 h-4 ${isActive ? 'text-emerald-500' : 'text-gray-300'}`} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

        </div>

        {/* Customer Ledger Chronicle (cols 6 to 12) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-xs">
          
          {!activeCustomer ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-20 text-gray-400">
              <Users className="w-12 h-12 opacity-30 mb-3" />
              <h4 className="font-bold text-sm text-gray-900 dark:text-white">No Client Selected</h4>
              <p className="text-xs max-w-xs mt-1">Select any registered pharmacy customer from the ledger directory index to view their full chronological sales and payments ledger chronicle.</p>
            </div>
          ) : (
            <div className="space-y-5 animate-in fade-in duration-200">
              
              {/* Client header card */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-xl bg-slate-50 dark:bg-slate-950/20 border border-gray-100 dark:border-slate-800/80 gap-4">
                <div>
                  <h4 className="font-bold text-base text-gray-950 dark:text-white">{activeCustomer.name}</h4>
                  <p className="text-xs text-gray-400 mt-0.5">Contact: {activeCustomer.mobile || 'No mobile logged'}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block">Running Outstanding Dues</span>
                    <strong className="text-base font-bold font-mono text-rose-500">৳{Number(activeCustomer.total_due).toLocaleString()}</strong>
                  </div>
                  {activeCustomer.total_due > 0 && (
                    <button
                      id="record-payment-trigger"
                      onClick={() => {
                        setPaymentAmount(activeCustomer.total_due);
                        setPaymentNote('Cleared full outstanding dues balance');
                        setShowPaymentModal(true);
                      }}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-md transition-colors cursor-pointer"
                    >
                      Record Payment
                    </button>
                  )}
                </div>
              </div>

              {/* Chronicle Ledger logs */}
              <div className="space-y-3.5">
                <h4 className="font-bold text-xs uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-500" />
                  Chronological Transaction Ledger
                </h4>

                {ledgerEntries.length === 0 ? (
                  <p className="text-xs text-gray-500 dark:text-slate-400 py-12 text-center border border-dashed border-gray-200 dark:border-slate-800 rounded-xl">This customer has clean record logs. No transactions recorded.</p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {ledgerEntries.map(entry => {
                      const isDueAdded = entry.type === 'due_added';
                      return (
                        <div 
                          key={entry.id} 
                          className={`p-3 rounded-xl border flex justify-between items-center text-xs ${
                            isDueAdded 
                              ? 'bg-rose-50/20 dark:bg-rose-950/5 border-rose-100/60 dark:border-rose-950/40 text-rose-800 dark:text-rose-300' 
                              : 'bg-green-50/20 dark:bg-green-950/5 border-green-100/60 dark:border-green-950/40 text-green-800 dark:text-green-300'
                          }`}
                        >
                          <div>
                            <p className="font-bold flex items-center gap-1.5">
                              {isDueAdded ? 'Credit Dues Incurred' : 'Cash Dues Cleared'}
                              <span className={`text-[9px] font-bold px-1.5 py-0.25 rounded-md ${
                                isDueAdded ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400' : 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400'
                              }`}>
                                {isDueAdded ? 'Sale' : 'Receipt'}
                              </span>
                            </p>
                            <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1">
                              {entry.note || 'No transaction note added'} • Date: {new Date(entry.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <strong className="font-bold font-mono text-sm">
                            {isDueAdded ? `+ ৳${Number(entry.amount).toLocaleString()}` : `- ৳${Number(entry.amount).toLocaleString()}`}
                          </strong>
                        </div>
                      );
                    })}
                  </div>
                )}

              </div>

            </div>
          )}

        </div>

      </div>

      {/* RECORD PAYMENT SUB-FORM MODAL */}
      {showPaymentModal && activeCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4 font-sans">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-800 pb-2">
              <h3 className="font-bold text-base text-gray-950 dark:text-white flex items-center gap-1.5">
                <Coins className="w-5 h-5 text-emerald-500 animate-pulse" />
                Clear Due Balance: {activeCustomer.name}
              </h3>
              <button 
                id="close-payment-modal-btn"
                onClick={() => setShowPaymentModal(false)} 
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-4 text-xs">
              <div className="p-3 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-lg text-rose-800 dark:text-rose-300">
                <p>Outstanding balance total: <strong className="font-mono text-sm">৳{Number(activeCustomer.total_due).toLocaleString()}</strong></p>
              </div>

              <div>
                <label className="block font-bold text-gray-500 uppercase tracking-wide mb-1">Cash Payment Received *</label>
                <input
                  id="payment-amount-input"
                  type="number"
                  required
                  step="0.01"
                  min="0.01"
                  max={activeCustomer.total_due}
                  value={paymentAmount || ''}
                  onChange={(e) => setPaymentAmount(Math.min(activeCustomer.total_due, parseFloat(e.target.value) || 0))}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-lg text-sm font-mono focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-500 uppercase tracking-wide mb-1">Payment Note / Memo</label>
                <input
                  id="payment-note-input"
                  type="text"
                  placeholder="e.g. Paid in cash"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-lg text-sm focus:outline-hidden"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-gray-100 dark:border-slate-800">
                <button
                  id="cancel-payment-btn"
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg text-sm text-gray-700"
                >
                  Cancel
                </button>
                <button
                  id="submit-payment-btn"
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-sm shadow-md cursor-pointer"
                >
                  Save Cash Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW CUSTOMER REGISTER OVERLAY */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-800 pb-2">
              <h3 className="font-bold text-base text-gray-950 dark:text-white">Register Tally Customer</h3>
              <button 
                id="close-cust-add-modal"
                onClick={() => setShowAddModal(false)} 
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomerSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-500 uppercase tracking-wide mb-1">Customer Name *</label>
                <input
                  id="cust-add-name"
                  type="text"
                  required
                  placeholder="e.g. Sabbir Ahmed"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-lg text-sm focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-500 uppercase tracking-wide mb-1">Mobile Number (Optional)</label>
                <input
                  id="cust-add-mobile"
                  type="tel"
                  placeholder="e.g. 01712345678"
                  value={newCustMobile}
                  onChange={(e) => setNewCustMobile(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-lg text-sm focus:outline-hidden"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-gray-100 dark:border-slate-800">
                <button
                  id="cancel-add-cust-btn"
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-slate-800 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  id="submit-add-cust-btn"
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-sm shadow-md cursor-pointer"
                >
                  Create Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
