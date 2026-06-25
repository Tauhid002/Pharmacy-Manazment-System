/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';
import { dbService } from '../lib/supabase';
import { Profile, UserRole } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchUser = async () => {
      try {
        const user = await dbService.getCurrentUser();
        if (active) {
          setCurrentUser(user);
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || 'Access Denied');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchUser();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
        <p className="text-xs text-gray-500 mt-2 font-mono">Verifying credentials & privileges...</p>
      </div>
    );
  }

  if (error || !currentUser) {
    return (
      <div className="p-10 text-center bg-white dark:bg-slate-900 border border-red-100 dark:border-red-950/40 rounded-2xl max-w-md mx-auto my-12 shadow-xl space-y-4">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="font-bold text-lg text-gray-900 dark:text-white">Authentication Required</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          You must be logged in to view this section. Use the Database Connection Panel to connect your live database or use the simulation switcher.
        </p>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return (
      <div className="p-10 text-center bg-white dark:bg-slate-900 border border-amber-100 dark:border-amber-950/40 rounded-2xl max-w-md mx-auto my-12 shadow-xl space-y-4 font-sans">
        <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto" />
        <h3 className="font-bold text-lg text-gray-900 dark:text-white">Access Level Restricted</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          You are currently logged in as <span className="font-bold text-amber-600 dark:text-amber-400 capitalize">{currentUser.role}</span>. This administrative workspace is restricted to authorized roles only.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
