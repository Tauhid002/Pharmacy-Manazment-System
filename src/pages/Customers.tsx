/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, Search, PlusCircle, Coins, ArrowRightLeft, Clock,
  DollarSign, ChevronRight, X, AlertCircle, CheckCircle, FileText, ArrowUpRight
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
  const [sales, setSales] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  // Custom spreadsheet view and currency configurations
  const [viewMode, setViewMode] = useState<'tally' | 'spreadsheet'>('tally');
  const [filterType, setFilterType] = useState<'all' | 'due' | 'cash'>('all');
  const [currency, setCurrency] = useState<'BDT' | 'USD' | 'EUR' | 'INR'>('BDT');

  const getCurrencySymbol = () => {
    switch(currency) {
      case 'BDT': return '৳';
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'INR': return '₹';
      default: return '৳';
    }
  };

  const formatCurrencyValue = (valInBDT: number) => {
    let rate = 1;
    switch(currency) {
      case 'USD': rate = 1 / 117; break;
      case 'EUR': rate = 1 / 125; break;
      case 'INR': rate = 1 / 1.4; break;
      default: rate = 1;
    }
    const converted = valInBDT * rate;
    return `${getCurrencySymbol()}${converted.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  const loadCustomers = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      let custsData: Customer[] = [];
      let salesData: any[] = [];

      try {
        custsData = await dbService.getCustomers();
      } catch (err) {
        console.error('Error fetching customers:', err);
        setErrorMsg(prev => (prev ? prev + ' \n' : '') + 'Customers fetch: ' + getErrorMessage(err));
      }

      try {
        salesData = await dbService.getSales();
      } catch (err) {
        console.error('Error fetching sales:', err);
        setErrorMsg(prev => (prev ? prev + ' \n' : '') + 'Sales fetch: ' + getErrorMessage(err));
      }

      setCustomers(custsData);
      setSales(salesData);
      if (activeCustomer) {
        // Refresh active customer metrics
        const refreshedActive = custsData.find(c => c.id === activeCustomer.id);
        if (refreshedActive) setActiveCustomer(refreshedActive);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(getErrorMessage(err));
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

  interface SpreadsheetRow {
    id: string;
    name: string;
    mobile: string;
    total_billed: number;
    paid_amount: number;
    due_amount: number;
    isWalkIn: boolean;
    date?: string;
  }

  const spreadsheetRows: SpreadsheetRow[] = [];

  // 1. Add Registered Customers
  customers.forEach(cust => {
    const customerSales = sales.filter(s => s.customer_id === cust.id);
    const totalBilled = customerSales.reduce((sum, s) => sum + Number(s.total_price), 0);
    const due = Number(cust.total_due);
    const paid = Math.max(0, totalBilled - due);
    
    // Find latest sale date if any
    let latestDate = undefined;
    if (customerSales.length > 0) {
      const sortedSales = [...customerSales].sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime());
      latestDate = sortedSales[0].sale_date;
    }

    spreadsheetRows.push({
      id: cust.id,
      name: cust.name,
      mobile: cust.mobile || 'N/A',
      total_billed: totalBilled,
      paid_amount: paid,
      due_amount: due,
      isWalkIn: false,
      date: latestDate
    });
  });

  // 2. Add Walk-in / Unregistered Sales as separate rows
  sales.forEach(sale => {
    const isRegistered = sale.customer_id && customers.some(c => c.id === sale.customer_id);
    if (!isRegistered) {
      const totalBilled = Number(sale.total_price);
      const due = Number(sale.due_amount);
      const paid = Number(sale.paid_amount);
      
      spreadsheetRows.push({
        id: `walk-in-${sale.id}`,
        name: `Walk-in Customer (Invoice #${sale.id.substring(sale.id.length - 8).toUpperCase()})`,
        mobile: 'N/A',
        total_billed: totalBilled,
        paid_amount: paid,
        due_amount: due,
        isWalkIn: true,
        date: sale.sale_date
      });
    }
  });

  // Sort spreadsheet rows by date (newest first), or if date is missing, push to bottom
  const sortedSpreadsheetRows = [...spreadsheetRows].sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return dateB - dateA;
  });

  const filteredSpreadsheetRows = sortedSpreadsheetRows.filter(row => {
    const matchesSearch = row.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          row.mobile.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          row.id.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (filterType === 'due') {
      return row.due_amount > 0;
    } else if (filterType === 'cash') {
      return row.due_amount === 0;
    }
    return true;
  });

  const handleDownloadCSV = () => {
    const headers = ['Customer Name/Invoice', 'Mobile Number', 'Date', 'Type', 'Total Billed Amount (Medicine Price)', 'Paid Amount', 'Due Amount'];
    const csvRows = [headers.join(',')];
    
    filteredSpreadsheetRows.forEach(row => {
      const dateStr = row.date ? new Date(row.date).toLocaleDateString() : 'N/A';
      const typeStr = row.isWalkIn ? 'Walk-in Sale' : 'Ledger Account';
      const rowData = [
        `"${row.name.replace(/"/g, '""')}"`,
        `"${row.mobile}"`,
        `"${dateStr}"`,
        `"${typeStr}"`,
        `"${formatCurrencyValue(row.total_billed)}"`,
        `"${formatCurrencyValue(row.paid_amount)}"`,
        `"${formatCurrencyValue(row.due_amount)}"`
      ];
      csvRows.push(rowData.join(','));
    });
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `all_customers_ledger_${filterType}_${currency}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

      {/* Tab Switcher / View Mode Selection */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-800">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('tally')}
            className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
              viewMode === 'tally'
                ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-600/15'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
            }`}
          >
            📂 Interactive Tally Ledger
          </button>
          <button
            onClick={() => setViewMode('spreadsheet')}
            className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
              viewMode === 'spreadsheet'
                ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-600/15'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
            }`}
          >
            📊 All Customers Ledger Table
          </button>
        </div>

        {viewMode === 'spreadsheet' && (
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Currency selector */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Currency:</span>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as any)}
                className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 font-bold"
              >
                <option value="BDT">৳ BDT (Default)</option>
                <option value="USD">$ USD</option>
                <option value="EUR">€ EUR</option>
                <option value="INR">₹ INR</option>
              </select>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold ${
                  filterType === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('due')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold ${
                  filterType === 'due'
                    ? 'bg-rose-500 text-white'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                }`}
              >
                Dues
              </button>
              <button
                onClick={() => setFilterType('cash')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold ${
                  filterType === 'cash'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                }`}
              >
                Cash/Nogod
              </button>
            </div>

            {/* Download */}
            <button
              onClick={handleDownloadCSV}
              className="px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer shadow-md shadow-emerald-600/10"
            >
              <FileText className="w-3.5 h-3.5" />
              Download Excel/CSV
            </button>
          </div>
        )}
      </div>

      {viewMode === 'tally' ? (
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
      ) : (
        /* Highly Polished Excel-like Grid Spreadsheet View */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs overflow-hidden space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">Spreadsheet Summary</h3>
              <p className="text-xs text-slate-500 mt-0.5">Showing total billing, paid and remaining dues for all customer profiles matching "{searchTerm || 'all'}"</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100 dark:border-slate-800">
                  <th className="p-4">Customer Name / Invoice</th>
                  <th className="p-4">Contact Number</th>
                  <th className="p-4">Transaction Date</th>
                  <th className="p-4">Account Type</th>
                  <th className="p-4 text-right">Medicine Price (Total Billed)</th>
                  <th className="p-4 text-right">Paid Amount</th>
                  <th className="p-4 text-right">Due Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredSpreadsheetRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">No customers found.</td>
                  </tr>
                ) : (
                  filteredSpreadsheetRows.map(row => {
                    return (
                      <tr key={row.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/20 transition-colors">
                        <td className="p-4 font-bold text-slate-900 dark:text-white text-sm">{row.name}</td>
                        <td className="p-4 font-medium text-slate-500 dark:text-slate-400 font-mono">{row.mobile}</td>
                        <td className="p-4 font-medium text-slate-500 dark:text-slate-400 font-mono">
                          {row.date ? new Date(row.date).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="p-4">
                          {row.isWalkIn ? (
                            <span className="inline-block text-[9px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md">
                              Walk-in Sale
                            </span>
                          ) : (
                            <span className="inline-block text-[9px] font-bold px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 rounded-md">
                              Ledger Account
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right font-bold font-mono text-slate-900 dark:text-white">{formatCurrencyValue(row.total_billed)}</td>
                        <td className="p-4 text-right font-bold font-mono text-emerald-600 dark:text-emerald-400">{formatCurrencyValue(row.paid_amount)}</td>
                        <td className="p-4 text-right font-bold font-mono text-rose-500">{formatCurrencyValue(row.due_amount)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
