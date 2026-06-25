/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  UserPlus, Search, UserCheck, ShieldAlert, Award, Shield,
  X, RefreshCw, Key, ToggleLeft, ToggleRight, Trash2
} from 'lucide-react';
import { dbService } from '../lib/supabase';
import { Profile } from '../types';

interface StaffProps {
  currentUser: Profile;
}

const getErrorMessage = (err: any): string => {
  if (!err) return 'Unknown error';
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && 'message' in err) return String(err.message);
  if (typeof err === 'object' && 'error_description' in err) return String(err.error_description);
  return typeof err === 'string' ? err : JSON.stringify(err);
};

export default function Staff({ currentUser }: StaffProps) {
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals & fields
  const [showAddModal, setShowAddModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<'owner' | 'staff'>('staff');

  const loadStaff = async () => {
    if (currentUser.role !== 'owner') {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await dbService.getProfiles();
      setStaffList(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, [currentUser]);

  // Block staff from accessing
  if (currentUser.role !== 'owner') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center font-sans space-y-4">
        <div className="p-4 bg-rose-500/10 text-rose-500 rounded-full animate-pulse">
          <ShieldAlert className="w-12 h-12" />
        </div>
        <h3 className="font-bold text-lg text-gray-900 dark:text-white">Staff Management Access Restricted</h3>
        <p className="text-xs text-gray-400 dark:text-slate-400 max-w-sm">
          You are currently logged in as a <span className="font-semibold capitalize text-emerald-500">{currentUser.role}</span>. Staff credentials, account registrations, and operational activity controls are restricted to the primary pharmacy Owner/Admin.
        </p>
      </div>
    );
  }

  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) return;
    try {
      await dbService.registerStaff(
        formName.trim(),
        formEmail.trim(),
        formRole
      );
      setShowAddModal(false);
      setFormName('');
      setFormEmail('');
      setFormRole('staff');
      await loadStaff();
    } catch (err) {
      alert('Failed to register staff account: ' + getErrorMessage(err));
    }
  };

  const handleToggleActive = async (profileId: string, currentStatus: boolean) => {
    if (profileId === currentUser.id) {
      alert('You cannot deactivate your own administrative owner profile!');
      return;
    }
    try {
      await dbService.toggleStaffStatus(profileId, !currentStatus);
      await loadStaff();
    } catch (err) {
      alert('Error updating account status: ' + getErrorMessage(err));
    }
  };

  const filteredStaff = staffList.filter(s => 
    s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 font-sans text-gray-900 dark:text-slate-100">
      
      {/* Description Header */}
      <div className="p-5 bg-emerald-500/5 border border-emerald-500/15 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-sm uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Employee Accounts & Privileges</h3>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">As the Admin/Owner, you can register credentials and suspend/reactivate staff logins. Non-admin roles will lose report menus.</p>
        </div>
        <button
          id="add-staff-member-trigger"
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/10 flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          Add Staff Account
        </button>
      </div>

      {/* Directory Table Grid */}
      <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        
        <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-gray-400" />
            <input
              id="staff-table-search"
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-xs"
            />
          </div>
          <span className="text-xs font-mono font-bold text-emerald-500">{filteredStaff.length} employees loaded</span>
        </div>

        {loading ? (
          <p className="text-xs text-center py-10 text-gray-400 animate-pulse">Syncing profiles...</p>
        ) : filteredStaff.length === 0 ? (
          <p className="text-xs text-center py-10 text-gray-400">No active accounts matched search.</p>
        ) : (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-slate-950/20 text-gray-400 font-bold uppercase tracking-wider border-b border-gray-100 dark:border-slate-800">
                  <th className="px-6 py-4">Employee Full Name</th>
                  <th className="px-6 py-4">Email Address</th>
                  <th className="px-6 py-4">Privilege Role</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60 text-sm">
                {filteredStaff.map(staff => {
                  const isActive = staff.is_active !== false; // default true
                  const isCurrent = staff.id === currentUser.id;

                  return (
                    <tr key={staff.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-900/40" id={`staff-row-${staff.id}`}>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                            {staff.full_name}
                            {isCurrent && <span className="text-[9px] px-1.5 py-0.25 bg-emerald-500/10 text-emerald-500 rounded-md font-sans">You</span>}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">Joined: {new Date(staff.created_at).toLocaleDateString()}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-slate-300 font-mono">
                        {staff.email}
                      </td>
                      <td className="px-6 py-4">
                        {staff.role === 'owner' ? (
                          <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500 font-semibold text-[10px] uppercase flex items-center gap-1 w-max">
                            <Award className="w-3 h-3" /> Owner Admin
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-semibold text-[10px] uppercase flex items-center gap-1 w-max">
                            <UserCheck className="w-3 h-3" /> Staff Cashier
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                          isActive ? 'bg-green-500/10 text-green-500' : 'bg-rose-500/10 text-rose-500'
                        }`}>
                          {isActive ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {!isCurrent ? (
                          <button
                            id={`toggle-staff-status-${staff.id}`}
                            onClick={() => handleToggleActive(staff.id, isActive)}
                            className={`p-1.5 rounded-lg border transition-all ${
                              isActive 
                                ? 'border-rose-200 dark:border-rose-950/40 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20' 
                                : 'border-green-200 dark:border-green-950/40 text-green-500 hover:bg-green-50 dark:hover:bg-green-950/20'
                            }`}
                            title={isActive ? "Deactivate employee login" : "Activate employee login"}
                          >
                            {isActive ? <ToggleRight className="w-5 h-5 text-rose-500" /> : <ToggleLeft className="w-5 h-5 text-green-500" />}
                          </button>
                        ) : (
                          <span className="text-gray-400 text-xs">Unmodifiable</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* ADD STAFF MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-800 pb-2">
              <h3 className="font-bold text-base text-gray-950 dark:text-white flex items-center gap-1.5">
                <UserPlus className="w-5 h-5 text-emerald-500 animate-pulse" />
                Register Staff Account
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStaffSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-500 uppercase tracking-wide mb-1">Employee Full Name *</label>
                <input
                  id="add-staff-name"
                  type="text"
                  required
                  placeholder="e.g. Tanzir Rahman"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-lg text-sm bg-transparent"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-500 uppercase tracking-wide mb-1">Login Email Address *</label>
                <input
                  id="add-staff-email"
                  type="email"
                  required
                  placeholder="e.g. tanzir@gmail.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-lg text-sm bg-transparent"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-500 uppercase tracking-wide mb-1">Authorization Privilege Role *</label>
                <select
                  id="add-staff-role"
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as 'owner' | 'staff')}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-lg text-sm bg-white dark:bg-slate-900"
                >
                  <option value="staff">Staff Cashier (Limited financial reports/deletion)</option>
                  <option value="owner">Owner Admin (Full administrative access)</option>
                </select>
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
                  id="submit-staff-account"
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-md cursor-pointer"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
