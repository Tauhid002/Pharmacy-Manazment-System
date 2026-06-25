/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Menu, Sun, Moon, Database, Shield, ShieldCheck, 
  RefreshCw, CheckCircle, HelpCircle, Key, UserCheck, LogOut
} from 'lucide-react';
import { Profile, DBConfig } from '../types';
import { dbService } from '../lib/supabase';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  activeTab: string;
  currentUser: Profile;
  dbConfig: DBConfig;
  onOpenConfig: () => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
}

export default function Header({
  sidebarOpen,
  setSidebarOpen,
  activeTab,
  currentUser,
  dbConfig,
  onOpenConfig,
  darkMode,
  setDarkMode
}: HeaderProps) {
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const profiles = dbService.getMockProfiles();

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Dashboard Overview';
      case 'medicines': return 'Medicine & Stock Inventory';
      case 'sales': return 'New Sales Checkout';
      case 'customers': return 'Customer Ledger (Tally Khata)';
      case 'dues': return 'Outstanding Dues Ledger';
      case 'suppliers': return 'Supplier & Distributor Logs';
      case 'reports': return 'Reports & Financial Analytics';
      case 'staff': return 'Staff Account Manager';
      case 'settings': return 'System Settings';
      default: return 'Pharmacy Manager';
    }
  };

  const handleRoleChange = (userId: string) => {
    dbService.setMockUser(userId);
    setShowRoleMenu(false);
  };

  const handleSignOut = async () => {
    try {
      await dbService.signOut();
      window.location.reload();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <header className="h-16 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-30 px-4 md:px-6 flex items-center justify-between transition-colors duration-200">
      {/* Left side */}
      <div className="flex items-center gap-3">
        <button
          id="mobile-sidebar-toggle"
          onClick={() => setSidebarOpen(true)}
          className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 lg:hidden text-gray-500 dark:text-slate-400"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="font-sans font-bold text-lg md:text-xl text-gray-950 dark:text-white tracking-tight leading-none">
          {getPageTitle()}
        </h2>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 md:gap-3.5">
        
        {/* Supabase Status Badge */}
        <button
          id="db-connector-badge"
          onClick={onOpenConfig}
          className={`flex items-center gap-1.5 px-2.5 py-1.25 rounded-full text-[11px] font-medium transition-all ${
            dbConfig.useLive
              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40 hover:scale-[1.02]'
              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/40 hover:scale-[1.02]'
          }`}
          title="Click to view database connection config"
        >
          <Database className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">
            {dbConfig.useLive ? 'Supabase Live' : 'Demo Local DB'}
          </span>
          <span className="inline sm:hidden">
            {dbConfig.useLive ? 'Supabase' : 'Demo'}
          </span>
        </button>

        {/* Role Quick Switcher */}
        <div className="relative">
          <button
            id="role-switcher-badge"
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className={`flex items-center gap-1.5 px-2.5 py-1.25 rounded-full text-[11px] font-medium cursor-pointer transition-all ${
              currentUser.role === 'owner'
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/40 hover:bg-amber-100/50'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200/50'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="capitalize">{currentUser.full_name} ({currentUser.role})</span>
          </button>

          {/* Role Dropdown */}
          {showRoleMenu && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowRoleMenu(false)} 
              />
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-1 font-sans text-sm animate-in fade-in slide-in-from-top-2 duration-150">
                {dbConfig.useLive ? (
                  <div className="space-y-1 p-2">
                    <div className="px-2 py-2 border-b border-gray-100 dark:border-slate-700">
                      <p className="text-xs font-bold text-gray-950 dark:text-white truncate">{currentUser.full_name}</p>
                      <p className="text-[10px] text-gray-500 dark:text-slate-400 truncate mt-0.5">{currentUser.email}</p>
                      <span className="inline-flex mt-1.5 text-[9px] bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/40 dark:border-amber-900/30 px-1.5 py-0.5 rounded-sm capitalize font-bold">
                        Role: {currentUser.role}
                      </span>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-2 py-1.75 mt-1 rounded-lg text-left text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out (লগআউট)
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="px-3 py-2 border-b border-gray-100 dark:border-slate-700 text-xs text-gray-500 dark:text-slate-400">
                      Quick Switch Role (Simulation)
                    </div>
                    <div className="space-y-0.5 p-1">
                      {profiles.map(profile => (
                        <button
                          id={`switch-to-user-${profile.id}`}
                          key={profile.id}
                          onClick={() => handleRoleChange(profile.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors ${
                            profile.id === currentUser.id 
                              ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-medium' 
                              : 'text-gray-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold">{profile.full_name}</span>
                            <span className="text-[10px] text-gray-400 dark:text-slate-500 capitalize">{profile.role}</span>
                          </div>
                          {profile.id === currentUser.id && <UserCheck className="w-3.5 h-3.5" />}
                        </button>
                      ))}
                    </div>
                    {!dbConfig.useLive && (
                      <div className="p-2.5 mt-1 bg-slate-50 dark:bg-slate-900/50 rounded-lg text-[10px] text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800/50">
                        Allows you to easily inspect both Owner full metrics and restricted Staff views.
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Light / Dark Mode Toggle */}
        <button
          id="theme-toggle-btn"
          onClick={() => setDarkMode(!darkMode)}
          className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400 transition-all cursor-pointer"
          title="Toggle visual theme"
        >
          {darkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
        </button>
      </div>
    </header>
  );
}
