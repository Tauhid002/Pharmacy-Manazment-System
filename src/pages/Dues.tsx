/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Search, Coins, ArrowRightLeft, FileSpreadsheet,
  AlertTriangle, CheckCircle, Clock, X, HelpCircle
} from 'lucide-react';
import { dbService } from '../lib/supabase';
import { Customer, Profile } from '../types';

interface DuesProps {
  currentUser: Profile;
}

const getErrorMessage = (err: any): string => {
  if (!err) return 'Unknown error';
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && 'message' in err) return String(err.message);
  if (typeof err === 'object' && 'error_description' in err) return String(err.error_description);
  return typeof err === 'string' ? err : JSON.stringify(err);
};

export default function Dues({ currentUser }: DuesProps) {
  const [loading, setLoading] = useState(true);
  const [debtors, setDebtors] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Recording Payment
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedDebtor, setSelectedDebtor] = useState<Customer | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payNote, setPayNote] = useState('Outstanding tally balance installment');

  const loadDebtors = async () => {
    setLoading(true);
    try {
      const allCustomers = await dbService.getCustomers();
      // Filter only those with due balance
      const withDues = allCustomers.filter(c => Number(c.total_due) > 0);
      setDebtors(withDues);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDebtors();
  }, []);

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebtor || payAmount <= 0) return;
    try {
      await dbService.recordDuePayment(selectedDebtor.id, Number(payAmount), payNote);
      setShowPayModal(false);
      setPayAmount(0);
      setSelectedDebtor(null);
      await loadDebtors();
    } catch (err) {
      alert('Error saving payment: ' + getErrorMessage(err));
    }
  };

  const filteredDebtors = debtors.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.mobile && d.mobile.includes(searchTerm))
  );

  const sumDues = debtors.reduce((sum, d) => sum + Number(d.total_due), 0);

  return (
    <div className="space-y-6 font-sans text-gray-900 dark:text-slate-100">
      
      {/* Stat Bar */}
      <div className="p-6 bg-rose-500/5 border border-rose-500/15 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl">
            <Coins className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-base text-gray-900 dark:text-white">Active Outstanding Dues Worksheet</h3>
            <p className="text-xs text-gray-400 mt-0.5">Showing only registered customers with unpaid balances.</p>
          </div>
        </div>
        <div className="text-left sm:text-right">
          <span className="text-[10px] text-gray-400 uppercase tracking-wide block">Aggregate Outstanding</span>
          <strong className="text-2xl font-bold font-mono text-rose-500">৳{sumDues.toLocaleString()}</strong>
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        
        <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-gray-400" />
            <input
              id="dues-debtor-search"
              type="text"
              placeholder="Search outstanding accounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-xs"
            />
          </div>
          <span className="text-xs font-mono text-rose-500 font-bold px-2.5 py-0.5 bg-rose-500/10 rounded-full">{filteredDebtors.length} active debtors</span>
        </div>

        {loading ? (
          <p className="text-xs text-center py-10 text-gray-400 animate-pulse">Syncing outstanding ledger...</p>
        ) : filteredDebtors.length === 0 ? (
          <div className="p-16 text-center text-gray-400">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h4 className="font-bold text-sm text-gray-900 dark:text-white">All Dues Cleared!</h4>
            <p className="text-xs max-w-xs mx-auto mt-1">Excellent! No customer accounts currently have unpaid dues on their digital tally card.</p>
          </div>
        ) : (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-slate-950/20 text-gray-400 font-bold uppercase tracking-wider border-b border-gray-100 dark:border-slate-800">
                  <th className="px-6 py-4">Customer Name</th>
                  <th className="px-6 py-4">Mobile Contact</th>
                  <th className="px-6 py-4">Outstanding Credit</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60 text-sm">
                {filteredDebtors.map(debtor => (
                  <tr key={debtor.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-900/40" id={`debtor-row-${debtor.id}`}>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">{debtor.name}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Debtor ID: #{debtor.id.substring(0,8)}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-gray-600 dark:text-slate-300">
                      {debtor.mobile || 'No contact phone'}
                    </td>
                    <td className="px-6 py-4 font-bold font-mono text-rose-500">
                      ৳{Number(debtor.total_due).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        id={`clear-debtor-btn-${debtor.id}`}
                        onClick={() => {
                          setSelectedDebtor(debtor);
                          setPayAmount(debtor.total_due);
                          setPayNote('Cleared entire outstanding dues balance');
                          setShowPayModal(true);
                        }}
                        className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/20 text-rose-500 hover:bg-rose-100 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                      >
                        Record Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* QUICK RECORD DUE INSTALMENT RECEIVED MODAL */}
      {showPayModal && selectedDebtor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-800 pb-2">
              <h3 className="font-bold text-base text-gray-950 dark:text-white flex items-center gap-1.5">
                <Coins className="w-5 h-5 text-emerald-500" />
                Record Dues Collected: {selectedDebtor.name}
              </h3>
              <button onClick={() => setShowPayModal(false)} className="p-1 rounded-lg text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-4 text-xs">
              <div className="p-3 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 text-rose-800 rounded-lg font-mono">
                Running due debt: ৳{Number(selectedDebtor.total_due).toLocaleString()}
              </div>

              <div>
                <label className="block font-bold text-gray-500 uppercase tracking-wide mb-1">Dues Amount Collected (৳) *</label>
                <input
                  id="debtor-payment-amount"
                  type="number"
                  required
                  step="0.01"
                  min="0.01"
                  max={selectedDebtor.total_due}
                  value={payAmount || ''}
                  onChange={(e) => setPayAmount(Math.min(selectedDebtor.total_due, parseFloat(e.target.value) || 0))}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-lg text-sm font-mono bg-transparent"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-500 uppercase tracking-wide mb-1">Receipt Note / Memo</label>
                <input
                  id="debtor-payment-note"
                  type="text"
                  placeholder="e.g. Cleared installment via bKash"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-lg text-sm bg-transparent"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  id="submit-debtor-payment"
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-md cursor-pointer"
                >
                  Save Cash Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
