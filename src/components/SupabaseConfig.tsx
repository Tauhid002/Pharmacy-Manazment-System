/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  X, Database, HelpCircle, CheckCircle, AlertCircle, 
  Copy, Check, Info, RefreshCw, Key
} from 'lucide-react';
import { dbService } from '../lib/supabase';
import { DBConfig } from '../types';

interface SupabaseConfigProps {
  isOpen: boolean;
  onClose: () => void;
  config: DBConfig;
  onUpdateConfig: (newConfig: DBConfig) => void;
}

export default function SupabaseConfig({ isOpen, onClose, config, onUpdateConfig }: SupabaseConfigProps) {
  const [url, setUrl] = useState(config.url);
  const [anonKey, setAnonKey] = useState(config.anonKey);
  const [useLive, setUseLive] = useState(config.useLive);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    setUrl(config.url);
    setAnonKey(config.anonKey);
    setUseLive(config.useLive);
  }, [config, isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig({
      url: url.trim(),
      anonKey: anonKey.trim(),
      useLive: useLive && !!(url.trim() && anonKey.trim())
    });
    onClose();
  };

  const triggerCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const sqlSetupScript = `-- Run this in your Supabase SQL Editor to create RPC functions
-- process a full sale atomically
create or replace function public.create_sale(...) ...`;

  return (
    <div id="db-config-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
      <div 
        className="fixed inset-0" 
        onClick={onClose} 
      />
      
      <div 
        id="db-config-modal"
        className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl relative z-10 flex flex-col animate-in scale-in duration-200"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between bg-gray-50 dark:bg-slate-950/20">
          <div className="flex items-center gap-2.5 text-gray-900 dark:text-white">
            <Database className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold text-lg tracking-tight">Supabase Connection Panel</h3>
          </div>
          <button 
            id="close-config-modal-btn"
            onClick={onClose} 
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-400 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Info banner */}
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300 flex gap-3 text-sm">
            <Info className="w-5 h-5 shrink-0 text-emerald-500" />
            <div>
              <p className="font-bold text-sm">এখানে আপনার Supabase Credentials দিয়ে কানেক্ট করুন</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
                নিচের ইনপুট বক্সগুলোতে আপনার Supabase URL এবং Anon Key বসিয়ে "Save Database Config" বাটনে ক্লিক করলেই সরাসরি আপনার নিজের Supabase ডাটাবেজের সাথে লাইভ কানেকশন তৈরি হয়ে যাবে।
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-emerald-500" />
                  লাইভ কানেকশন অন করুন (Enable Live Connection)
                </label>
                <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">আপনার নিজস্ব ডাটাবেজ ব্যবহার করতে এটি চালু রাখুন</p>
              </div>
              <button
                id="toggle-use-live-btn"
                type="button"
                onClick={() => setUseLive(!useLive)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  useLive ? 'bg-emerald-600' : 'bg-gray-200 dark:bg-slate-800'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    useLive ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="p-4 rounded-xl border border-gray-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">
                    Supabase Project URL (ইউআরএল বক্স)
                  </label>
                  <input
                    id="supabase-url-input"
                    type="url"
                    placeholder="https://your-project.supabase.co"
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value);
                      if (!useLive) setUseLive(true);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 transition-all font-mono shadow-inner"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">
                    Supabase Public Anon Key (অ্যানন কি বক্স)
                  </label>
                  <input
                    id="supabase-anon-key-input"
                    type="text"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={anonKey}
                    onChange={(e) => {
                      setAnonKey(e.target.value);
                      if (!useLive) setUseLive(true);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 transition-all font-mono shadow-inner"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
            <h4 className="text-xs font-bold text-gray-900 dark:text-slate-200 uppercase tracking-wider mb-3">
              Developer Utilities
            </h4>
            <div className="flex flex-wrap gap-3">
              <button
                id="reset-demo-db-btn"
                type="button"
                onClick={() => {
                  if (confirm('Are you sure you want to reset your local demo database to factory seeds? This deletes all custom local sales and dues.')) {
                    dbService.resetDemoDatabase();
                  }
                }}
                className="px-3.5 py-2 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-xs font-medium text-gray-700 dark:text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset Demo Seeds (ডেমো রিসেট)
              </button>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-gray-100 dark:border-slate-800/60">
            <h5 className="text-xs font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-emerald-500" />
              How to setup your Supabase database:
            </h5>
            <ol className="list-decimal list-inside text-xs text-gray-600 dark:text-slate-400 space-y-2 mt-1">
              <li>Open your **Supabase Dashboard** and create a free project.</li>
              <li>Go to **SQL Editor**, click **New Query**, and create your tables or compiled RPC procedures.</li>
              <li>Copy your **Project URL** and **API Anon Key** from your Project Settings {`->`} API.</li>
              <li>Paste them in the boxes above, keep the switch turned ON, and click **Save**.</li>
            </ol>
          </div>

        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/20 flex justify-end gap-3">
          <button
            id="cancel-config-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg border border-gray-200 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-800 text-sm font-medium text-gray-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            id="save-config-btn"
            type="button"
            onClick={handleSave}
            className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-lg shadow-emerald-500/10 transition-colors cursor-pointer"
          >
            Save Database Config
          </button>
        </div>

      </div>
    </div>
  );
}
