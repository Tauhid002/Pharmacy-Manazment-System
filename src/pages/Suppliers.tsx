/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Truck, Search, PlusCircle, Coins, ArrowRightLeft, Clock,
  DollarSign, ChevronRight, X, AlertCircle, CheckCircle, FileText,
  Mail, Phone, ShieldAlert
} from 'lucide-react';
import { dbService } from '../lib/supabase';
import { Supplier, Profile } from '../types';

interface SuppliersProps {
  currentUser: Profile;
}

const getErrorMessage = (err: any): string => {
  if (!err) return 'Unknown error';
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && 'message' in err) return String(err.message);
  if (typeof err === 'object' && 'error_description' in err) return String(err.error_description);
  return typeof err === 'string' ? err : JSON.stringify(err);
};

export default function Suppliers({ currentUser }: SuppliersProps) {
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals & form fields
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // Add form fields
  const [supName, setSupName] = useState('');
  const [supContact, setSupContact] = useState('');
  const [supEmail, setSupEmail] = useState('');

  // Payment form fields
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payNote, setPayNote] = useState('Distributor dues partial payoff');

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const data = await dbService.getSuppliers();
      setSuppliers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const handleAddSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim()) return;
    try {
      await dbService.addSupplier(
        supName.trim(),
        supContact.trim() || undefined,
        supEmail.trim() || undefined
      );
      setShowAddModal(false);
      setSupName('');
      setSupContact('');
      setSupEmail('');
      loadSuppliers();
    } catch (err) {
      alert('Failed to add distributor: ' + getErrorMessage(err));
    }
  };

  const handlePaySupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier || payAmount <= 0) return;
    try {
      await dbService.paySupplier(selectedSupplier.id, Number(payAmount), payNote);
      setShowPayModal(false);
      setPayAmount(0);
      setSelectedSupplier(null);
      loadSuppliers();
    } catch (err) {
      alert('Failed to clear payable: ' + getErrorMessage(err));
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.contact_person && s.contact_person.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalOwed = suppliers.reduce((sum, s) => sum + Number(s.total_owed), 0);

  // RENDER LIMITED/READ-ONLY STAFF PERSPECTIVE
  if (currentUser.role !== 'owner') {
    return (
      <div className="space-y-6 font-sans">
        
        {/* Banner */}
        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200/60 text-blue-800 dark:text-blue-400 flex gap-3 text-xs font-semibold">
          <ShieldAlert className="w-5 h-5 shrink-0 text-blue-500" />
          <div>
            <p className="font-bold">Staff Directory Directory View</p>
            <p className="font-normal mt-0.5">As a Staff account, you have read-only access to Supplier contacts for logistical restocking orders. Financial payables, supply debts, and invoice adjustments are restricted to Owner roles.</p>
          </div>
        </div>

        {/* Search & list */}
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-xs space-y-4">
          <h3 className="font-bold text-sm uppercase tracking-wider text-gray-400">Restock Contact Directory</h3>
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4.5 h-4.5 text-gray-400" />
            <input
              id="staff-sup-search"
              type="text"
              placeholder="Search distributor name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-sm focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredSuppliers.map(sup => (
              <div key={sup.id} className="p-4 border border-gray-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20 rounded-xl space-y-2">
                <h4 className="font-bold text-sm text-gray-900 dark:text-white">{sup.name}</h4>
                <div className="space-y-1 text-xs text-gray-500">
                  <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-emerald-500" /> {sup.contact_person || 'No phone logged'}</p>
                  <p className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-emerald-500" /> {sup.email || 'No email logged'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    );
  }

  // FULL OWNER VIEW
  return (
    <div className="space-y-6 font-sans text-gray-900 dark:text-slate-100">
      
      {/* Stat indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Outstanding Distributor Payables</p>
            <h4 className="text-2xl font-bold font-mono text-gray-950 dark:text-white">৳{totalOwed.toLocaleString()}</h4>
            <p className="text-[10px] text-gray-400">Outstanding supply debts to settle</p>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <Coins className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Registered Distributors</p>
            <h4 className="text-2xl font-bold font-mono text-gray-950 dark:text-white">{suppliers.length}</h4>
            <p className="text-[10px] text-gray-400">Active supplier partnerships on record</p>
          </div>
          <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
            <Truck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        
        <div className="p-4 flex flex-col sm:flex-row justify-between items-center border-b border-gray-100 dark:border-slate-800 gap-3">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-gray-400" />
            <input
              id="owner-sup-search"
              type="text"
              placeholder="Search supplier list..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-xs"
            />
          </div>
          <button
            id="register-supplier-trigger"
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            Register Supplier
          </button>
        </div>

        {loading ? (
          <p className="text-xs text-center py-10 text-gray-400">Loading Suppliers...</p>
        ) : filteredSuppliers.length === 0 ? (
          <p className="text-xs text-center py-10 text-gray-400">No supplier partnerships matches search criteria.</p>
        ) : (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-slate-950/20 text-gray-400 font-bold uppercase tracking-wider border-b border-gray-100 dark:border-slate-800">
                  <th className="px-6 py-4">Distributor Company</th>
                  <th className="px-6 py-4">Phone / Contact</th>
                  <th className="px-6 py-4">Email Address</th>
                  <th className="px-6 py-4">Total Payable Owed</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60 text-sm">
                {filteredSuppliers.map(sup => (
                  <tr key={sup.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-900/40" id={`sup-row-${sup.id}`}>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">{sup.name}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Supplier ID: #{sup.id.substring(0,8)}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-slate-300 font-mono">
                      {sup.contact_person || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-slate-300">
                      {sup.email || 'N/A'}
                    </td>
                    <td className="px-6 py-4 font-bold font-mono text-rose-500">
                      ৳{Number(sup.total_owed).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {sup.total_owed > 0 ? (
                        <button
                          id={`pay-supplier-btn-${sup.id}`}
                          onClick={() => {
                            setSelectedSupplier(sup);
                            setPayAmount(sup.total_owed);
                            setPayNote('Cleared supply order debts');
                            setShowPayModal(true);
                          }}
                          className="px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/20 text-rose-500 font-bold text-xs rounded-lg hover:bg-rose-100 cursor-pointer"
                        >
                          Clear Payable
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wide bg-emerald-500/10 px-2 py-0.5 rounded-md">Paid Up</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* ADD SUPPLIER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-800 pb-2">
              <h3 className="font-bold text-base text-gray-950 dark:text-white">Register Partner Supplier</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSupplierSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-500 uppercase tracking-wide mb-1">Company / distributor Name *</label>
                <input
                  id="add-sup-name"
                  type="text"
                  required
                  placeholder="e.g. Beximco Pharma Distributors"
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-lg text-sm bg-transparent"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-500 uppercase tracking-wide mb-1">Phone / Mobile Contact</label>
                <input
                  id="add-sup-contact"
                  type="text"
                  placeholder="e.g. +88017XXXXXXXX"
                  value={supContact}
                  onChange={(e) => setSupContact(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-lg text-sm bg-transparent"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-500 uppercase tracking-wide mb-1">Email Address</label>
                <input
                  id="add-sup-email"
                  type="email"
                  placeholder="e.g. orders@beximco.com"
                  value={supEmail}
                  onChange={(e) => setSupEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-lg text-sm bg-transparent"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  id="submit-register-sup-btn"
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-md cursor-pointer"
                >
                  Register Partner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAY SUPPLIER DEBT MODAL */}
      {showPayModal && selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-800 pb-2">
              <h3 className="font-bold text-base text-gray-950 dark:text-white">Clear Supplier Debt: {selectedSupplier.name}</h3>
              <button onClick={() => setShowPayModal(false)} className="p-1 rounded-lg text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePaySupplierSubmit} className="space-y-4 text-xs">
              <div className="p-3 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 text-rose-800 rounded-lg font-mono">
                Running debts: ৳{Number(selectedSupplier.total_owed).toLocaleString()}
              </div>

              <div>
                <label className="block font-bold text-gray-500 uppercase tracking-wide mb-1">Payable Paid Cash Amount (৳) *</label>
                <input
                  id="pay-supplier-amount-input"
                  type="number"
                  required
                  step="0.01"
                  min="0.01"
                  max={selectedSupplier.total_owed}
                  value={payAmount || ''}
                  onChange={(e) => setPayAmount(Math.min(selectedSupplier.total_owed, parseFloat(e.target.value) || 0))}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-lg text-sm font-mono bg-transparent"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-500 uppercase tracking-wide mb-1">Receipt Note / Voucher</label>
                <input
                  id="pay-supplier-note-input"
                  type="text"
                  placeholder="e.g. Bank draft payment confirmation"
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
                  id="submit-pay-supplier-btn"
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-md cursor-pointer"
                >
                  Record Voucher Paid
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
