/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import SupabaseConfig from './SupabaseConfig';

// Import Pages
import Dashboard from '../pages/Dashboard';
import Medicines from '../pages/Medicines';
import Sales from '../pages/Sales';
import Customers from '../pages/Customers';
import Dues from '../pages/Dues';
import Suppliers from '../pages/Suppliers';
import Reports from '../pages/Reports';
import Staff from '../pages/Staff';
import SettingsPage from '../pages/Settings';
import Login from '../pages/Login';

import { dbService } from '../lib/supabase';
import { Profile, DBConfig } from '../types';
import ProtectedRoute from './ProtectedRoute';

export default function AppLayout() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  
  // State management for database credential logs
  const [dbConfig, setDbConfig] = useState<DBConfig>({
    url: '',
    anonKey: '',
    useLive: false
  });

  // State management for current active profile
  const [currentUser, setCurrentUser] = useState<Profile>({
    id: 'usr-101',
    full_name: 'Palok Mahamud',
    email: 'palokmahamud@gmail.com',
    role: 'owner',
    is_active: true,
    created_at: '2026-06-25T05:00:00Z'
  });

  // State management for auth checking loading spinner
  const [authLoading, setAuthLoading] = useState(true);
  const [isLiveAuthenticated, setIsLiveAuthenticated] = useState(false);

  // Medicine filter shortcut triggered from Dashboard alerts
  const [medicineFilter, setMedicineFilter] = useState<'all' | 'low' | 'expiring'>('all');

  // Dark theme toggles
  const [darkMode, setDarkMode] = useState(true);

  const checkLiveAuth = async () => {
    setAuthLoading(true);
    try {
      const user = await dbService.getCurrentUser();
      setCurrentUser(user);
      setIsLiveAuthenticated(true);
    } catch (err) {
      console.warn('Live mode is active, but no active Supabase session exists:', err);
      setIsLiveAuthenticated(false);
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    // Sync current visual theme
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    // Load config on mount
    const savedConfig = dbService.getConfig();
    setDbConfig(savedConfig);

    if (savedConfig.useLive) {
      checkLiveAuth();
    } else {
      // Initial mock user sync for local demo mode
      const user = dbService.getCurrentMockUser();
      setCurrentUser(prevUser => {
        if (prevUser.id !== user.id || prevUser.role !== user.role || prevUser.full_name !== user.full_name) {
          return user;
        }
        return prevUser;
      });
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser.role === 'staff' && ['reports', 'staff'].includes(activeTab)) {
      setActiveTab('dashboard');
    }
  }, [currentUser.role, activeTab]);

  const handleUpdateConfig = (newConfig: DBConfig) => {
    dbService.updateConfig(newConfig);
    setDbConfig(newConfig);
    // Reload components
    window.location.reload();
  };

  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <ProtectedRoute allowedRoles={['owner', 'staff']}>
            <Dashboard 
              currentUser={currentUser} 
              setActiveTab={setActiveTab} 
              setMedicineFilter={setMedicineFilter} 
            />
          </ProtectedRoute>
        );
      case 'medicines':
        return (
          <ProtectedRoute allowedRoles={['owner', 'staff']}>
            <Medicines 
              currentUser={currentUser}
              filterFromDashboard={medicineFilter}
              setFilterFromDashboard={setMedicineFilter}
            />
          </ProtectedRoute>
        );
      case 'sales':
        return (
          <ProtectedRoute allowedRoles={['owner', 'staff']}>
            <Sales currentUser={currentUser} />
          </ProtectedRoute>
        );
      case 'customers':
        return (
          <ProtectedRoute allowedRoles={['owner', 'staff']}>
            <Customers currentUser={currentUser} />
          </ProtectedRoute>
        );
      case 'dues':
        return (
          <ProtectedRoute allowedRoles={['owner', 'staff']}>
            <Dues currentUser={currentUser} />
          </ProtectedRoute>
        );
      case 'suppliers':
        return (
          <ProtectedRoute allowedRoles={['owner', 'staff']}>
            <Suppliers currentUser={currentUser} />
          </ProtectedRoute>
        );
      case 'reports':
        return (
          <ProtectedRoute allowedRoles={['owner']}>
            <Reports currentUser={currentUser} />
          </ProtectedRoute>
        );
      case 'staff':
        return (
          <ProtectedRoute allowedRoles={['owner']}>
            <Staff currentUser={currentUser} />
          </ProtectedRoute>
        );
      case 'settings':
        return (
          <ProtectedRoute allowedRoles={['owner', 'staff']}>
            <SettingsPage 
              currentUser={currentUser} 
              onOpenConfig={() => setShowConfigModal(true)} 
            />
          </ProtectedRoute>
        );
      default:
        return (
          <div className="text-center py-20 text-gray-500">
            Page tab "{activeTab}" is currently under construction.
          </div>
        );
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center font-sans text-slate-800 dark:text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-xs font-mono tracking-wider text-gray-400">CONNECTING SECURE SESSION...</p>
        </div>
      </div>
    );
  }

  if (dbConfig.useLive && !isLiveAuthenticated) {
    return <Login onLoginSuccess={checkLiveAuth} />;
  }

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200 flex text-slate-800 dark:text-slate-100 font-sans`}>
      
      {/* Sidebar Navigation */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          setActiveTab(tab);
          // Always clear secondary dashboard filters when switching pages manually
          if (tab !== 'medicines') setMedicineFilter('all');
        }} 
        userRole={currentUser.role}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />

      {/* Main Panel Frame */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        
        {/* Top Header */}
        <Header 
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          activeTab={activeTab}
          currentUser={currentUser}
          dbConfig={dbConfig}
          onOpenConfig={() => setShowConfigModal(true)}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />

        {/* Dynamic Main Page Content */}
        <main className="flex-1 p-4 md:p-6 max-w-[1600px] w-full mx-auto animate-in fade-in duration-200">
          {renderActivePage()}
        </main>

      </div>

      {/* DATABASE CONNECTION MODAL WRAPPER */}
      <SupabaseConfig 
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        config={dbConfig}
        onUpdateConfig={handleUpdateConfig}
      />

    </div>
  );
}
