/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  LayoutDashboard, Pill, ShoppingCart, Users, BookOpen, 
  Truck, BarChart3, UserCog, Settings, Menu, X
} from 'lucide-react';
import { UserRole } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole: UserRole;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function Sidebar({ activeTab, setActiveTab, userRole, isOpen, setIsOpen }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, roles: ['owner', 'staff'] },
    { id: 'medicines', name: 'Medicines & Stock', icon: Pill, roles: ['owner', 'staff'] },
    { id: 'sales', name: 'New Sale', icon: ShoppingCart, roles: ['owner', 'staff'] },
    { id: 'customers', name: 'Customers Ledger', icon: Users, roles: ['owner', 'staff'] },
    { id: 'dues', name: 'Dues Ledger', icon: BookOpen, roles: ['owner', 'staff'] },
    { id: 'suppliers', name: 'Suppliers', icon: Truck, roles: ['owner', 'staff'] },
    { id: 'reports', name: 'Reports & Analytics', icon: BarChart3, roles: ['owner'] },
    { id: 'staff', name: 'Staff Management', icon: UserCog, roles: ['owner'] },
    { id: 'settings', name: 'Settings', icon: Settings, roles: ['owner', 'staff'] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(userRole));

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          id="sidebar-backdrop"
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        id="sidebar-container"
        className={`fixed inset-y-0 left-0 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 w-64 border-r border-slate-200 dark:border-slate-900 transform lg:transform-none lg:opacity-100 transition-all duration-300 ease-in-out z-50 flex flex-col justify-between shadow-xs ${
          isOpen ? 'translate-x-0 opacity-100' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div>
          {/* Header */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 dark:border-slate-900">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-600 rounded-xl text-white shadow-md shadow-emerald-600/10">
                <Pill className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-display font-bold text-base tracking-tight text-slate-900 dark:text-white leading-tight">PharmaManager</h1>
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-mono tracking-wider uppercase font-extrabold block">Digital Ledger</span>
              </div>
            </div>
            <button 
              id="close-sidebar-btn"
              onClick={() => setIsOpen(false)} 
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 lg:hidden transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
 
          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {filteredItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  id={`nav-tab-${item.id}`}
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.75 rounded-xl text-sm font-semibold transition-all duration-200 border cursor-pointer ${
                    isActive 
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-900/30 font-bold shadow-xs scale-[1.01]' 
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50 hover:text-slate-900 dark:hover:text-slate-200 border-transparent'
                  }`}
                >
                  <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`} />
                  {item.name}
                </button>
              );
            })}
          </nav>
        </div>
 
        {/* Footer info */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/20">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <div className="text-left">
              <p className="text-[11px] text-slate-700 dark:text-slate-300 font-bold">Local System Active</p>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">UTC: 2026-06-25</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
