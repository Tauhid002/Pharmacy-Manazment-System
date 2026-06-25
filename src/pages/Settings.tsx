/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Settings, Save, FileText, Database, ShieldCheck, Printer, CheckCircle
} from 'lucide-react';
import { Profile } from '../types';

interface SettingsProps {
  currentUser: Profile;
  onOpenConfig: () => void;
}

export default function SettingsPage({ currentUser, onOpenConfig }: SettingsProps) {
  // Store details
  const [storeName, setStoreName] = useState('PharmaManager Digital');
  const [storeAddress, setStoreAddress] = useState('12/A Dhanmondi, Dhaka, Bangladesh');
  const [storeMobile, setStoreMobile] = useState('01711223344');
  const [storeSlogan, setStoreSlogan] = useState('Your Trusted Health Companion');
  
  // Printing formats
  const [paperFormat, setPaperFormat] = useState('thermal-80');
  const [autoPrint, setAutoPrint] = useState(true);

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load existing settings if any
    const savedName = localStorage.getItem('pharm_store_name');
    const savedAddress = localStorage.getItem('pharm_store_address');
    const savedMobile = localStorage.getItem('pharm_store_mobile');
    const savedSlogan = localStorage.getItem('pharm_store_slogan');

    if (savedName) setStoreName(savedName);
    if (savedAddress) setStoreAddress(savedAddress);
    if (savedMobile) setStoreMobile(savedMobile);
    if (savedSlogan) setStoreSlogan(savedSlogan);
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('pharm_store_name', storeName.trim());
    localStorage.setItem('pharm_store_address', storeAddress.trim());
    localStorage.setItem('pharm_store_mobile', storeMobile.trim());
    localStorage.setItem('pharm_store_slogan', storeSlogan.trim());

    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6 font-sans text-gray-900 dark:text-slate-100 max-w-2xl">
      
      {/* Toast Confirmation */}
      {saved && (
        <div className="p-4 bg-emerald-600 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg animate-in fade-in slide-in-from-top-3">
          <CheckCircle className="w-4 h-4" />
          Settings changes compiled and saved to local store successfully!
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/20">
          <h3 className="font-bold text-sm uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
            <Settings className="w-4.5 h-4.5 text-emerald-500" />
            Pharmacy Customization & Invoice Branding
          </h3>
          <p className="text-xs text-gray-400 mt-1">Configure physical receipt layouts, address details, and currency indicators.</p>
        </div>

        {/* Fields */}
        <div className="p-6 space-y-5 text-xs font-sans">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div>
              <label className="block font-bold text-gray-500 uppercase tracking-wide mb-1.5">Pharmacy Store Name</label>
              <input
                id="set-store-name"
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-lg text-sm bg-transparent"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-500 uppercase tracking-wide mb-1.5">Store Slogan / Header Note</label>
              <input
                id="set-store-slogan"
                type="text"
                required
                value={storeSlogan}
                onChange={(e) => setStoreSlogan(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-lg text-sm bg-transparent"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-gray-500 uppercase tracking-wide mb-1.5">Physical Shop Address</label>
              <input
                id="set-store-address"
                type="text"
                required
                value={storeAddress}
                onChange={(e) => setStoreAddress(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-lg text-sm bg-transparent"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-500 uppercase tracking-wide mb-1.5">Mobile Contact Helpline</label>
              <input
                id="set-store-mobile"
                type="text"
                required
                value={storeMobile}
                onChange={(e) => setStoreMobile(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-lg text-sm bg-transparent"
              />
            </div>

          </div>

          {/* Printing options */}
          <div className="pt-4 border-t border-gray-100 dark:border-slate-800/80 space-y-4">
            <h4 className="font-bold text-sm text-gray-950 dark:text-white flex items-center gap-1.5">
              <Printer className="w-4 h-4 text-emerald-500" />
              Thermal Invoice Printers
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-gray-500 uppercase tracking-wide mb-1.5">Paper Receipt Format</label>
                <select
                  id="set-paper-format"
                  value={paperFormat}
                  onChange={(e) => setPaperFormat(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-lg text-sm bg-white dark:bg-slate-900"
                >
                  <option value="thermal-80">Standard Thermal (80mm rolls)</option>
                  <option value="thermal-58">Compact Thermal (58mm rolls)</option>
                  <option value="a4">Standard A4/A5 Ledger Page</option>
                </select>
              </div>

              <div className="flex items-center justify-between pt-5">
                <div>
                  <span className="font-bold text-gray-700 dark:text-slate-300 block">Auto-generate Receipt PDF</span>
                  <span className="text-[10px] text-gray-400">Launch layout receipt immediately on sale</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoPrint(!autoPrint)}
                  className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    autoPrint ? 'bg-emerald-600' : 'bg-gray-200 dark:bg-slate-800'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      autoPrint ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Database link quick overview */}
          <div className="pt-4 border-t border-gray-100 dark:border-slate-800/80 space-y-3">
            <h4 className="font-bold text-sm text-gray-950 dark:text-white flex items-center gap-1.5">
              <Database className="w-4 h-4 text-emerald-500" />
              Backend Connection Synchronizations
            </h4>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/20 border border-gray-100 dark:border-slate-800/60 flex items-center justify-between">
              <div>
                <p className="font-bold text-gray-900 dark:text-white">Supabase Connection Link</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Toggle live database synchronizations for medicines and sales records</p>
              </div>
              <button
                type="button"
                onClick={onOpenConfig}
                className="px-3.5 py-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 font-semibold rounded-lg text-gray-700 dark:text-slate-300 cursor-pointer"
              >
                Configure Link
              </button>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-800/80 bg-gray-50/50 dark:bg-slate-950/20 flex justify-end">
          <button
            id="save-settings-btn"
            type="submit"
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4.5 h-4.5" />
            Save Customizations
          </button>
        </div>

      </form>

    </div>
  );
}
