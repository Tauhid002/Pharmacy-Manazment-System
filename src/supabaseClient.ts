/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';

const getInitialConfig = () => {
  const saved = typeof window !== 'undefined' ? localStorage.getItem('pharmacy_db_config') : null;
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // Ignore
    }
  }
  
  const envUrl = 'https://hfgjcrtcmbtvvcwglnug.supabase.co';
  const envKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmZ2pjcnRjbWJ0dnZjd2dsbnVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzODQ3NTcsImV4cCI6MjA5Nzk2MDc1N30.4zCO8jkTIdRl-ptP4BbsEIxsJU1zPL3-DypVoMinI94';
  
  return {
    url: envUrl,
    anonKey: envKey
  };
};

const config = getInitialConfig();
const supabaseUrl = config.url || 'https://placeholder.supabase.co';
const supabaseAnonKey = config.anonKey || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
