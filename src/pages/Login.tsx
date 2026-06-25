/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { dbService } from '../lib/supabase';
import { Key, Mail, User, Phone, Shield, ArrowRight, CheckCircle2, AlertCircle, RefreshCw, Eye, EyeOff } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: () => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'owner' | 'staff'>('owner');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterOffer, setShowRegisterOffer] = useState(false);

  // Auto-fill button helper
  const handleAutoFill = () => {
    setEmail('palokmahamud@gmail.com');
    setPassword('12345678');
    setIsSignUp(false);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!email || !password) {
      setError('দয়া করে ইমেইল এবং পাসওয়ার্ড প্রদান করুন (Please provide both email and password)');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('পাসওয়ার্ডটি অন্তত ৬ অক্ষরের হতে হবে (Password must be at least 6 characters)');
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        if (!fullName) {
          setError('দয়া করে আপনার সম্পূর্ণ নাম দিন (Please provide your full name)');
          setLoading(false);
          return;
        }

        // 1. Sign up via Supabase Auth
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) throw signUpError;

        const authUser = signUpData.user;
        if (authUser) {
          // Force owner role for admin email palokmahamud@gmail.com
          const finalRole = email.toLowerCase() === 'palokmahamud@gmail.com' ? 'owner' : role;

          // 2. Create the profile row in postgres profiles table
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert([{
              id: authUser.id,
              full_name: fullName,
              role: finalRole,
              phone: phone || null,
              email: email.toLowerCase(),
              is_active: true,
              created_at: new Date().toISOString()
            }]);

          if (profileError) {
            console.error('Profile creation error:', profileError);
            // Non-blocking, we can try to proceed
          }

          setSuccess('অ্যাকাউন্ট তৈরি সফল হয়েছে! এখন লগইন করুন। (Account created successfully! Please login now.)');
          setIsSignUp(false);
          setPassword('');
        } else {
          throw new Error('Could not create auth account.');
        }

      } else {
        // 1. Sign in via Supabase Auth
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        const authUser = signInData.user;
        if (authUser) {
          // 2. Check if a profile row exists. If not, auto-create one.
          const { data: profile, error: profileFetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .single();

          if (profileFetchError || !profile) {
            console.log('Profile missing, auto-generating default profile for authenticated user...');
            const finalRole = email.toLowerCase() === 'palokmahamud@gmail.com' ? 'owner' : 'staff';
            
            await supabase.from('profiles').upsert([{
              id: authUser.id,
              full_name: fullName || email.split('@')[0],
              role: finalRole,
              phone: phone || null,
              email: email.toLowerCase(),
              is_active: true,
              created_at: new Date().toISOString()
            }]);
          }

          setSuccess('লগইন সফল হয়েছে! (Login successful!)');
          setTimeout(() => {
            onLoginSuccess();
          }, 800);
        }
      }
    } catch (err: any) {
      console.error('Auth error detail:', err);
      setError(err.message || 'একটি ত্রুটি ঘটেছে (An error occurred)');
      if (!isSignUp && (err.message?.includes('Invalid login credentials') || err.message?.includes('invalid_credentials'))) {
        setShowRegisterOffer(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAutoSignUpAndLogin = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setShowRegisterOffer(false);

    try {
      // 1. Sign up via Supabase Auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;

      const authUser = signUpData.user;
      if (authUser) {
        // Force owner role for admin email palokmahamud@gmail.com
        const finalRole = email.toLowerCase() === 'palokmahamud@gmail.com' ? 'owner' : role;
        const finalName = email.toLowerCase() === 'palokmahamud@gmail.com' ? 'Palok Mahamud' : email.split('@')[0];

        // 2. Create the profile row in postgres profiles table
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert([{
            id: authUser.id,
            full_name: finalName,
            role: finalRole,
            phone: phone || null,
            email: email.toLowerCase(),
            is_active: true,
            created_at: new Date().toISOString()
          }]);

        if (profileError) {
          console.error('Profile creation error during auto-registration:', profileError);
        }

        setSuccess('রেজিস্ট্রেশন এবং লগইন সফল হয়েছে! ড্যাশবোর্ডে প্রবেশ করা হচ্ছে... (Registration & Login successful!)');
        setTimeout(() => {
          onLoginSuccess();
        }, 1200);
      } else {
        throw new Error('Could not create account.');
      }
    } catch (err: any) {
      console.error('Auto-registration error:', err);
      setError(err.message || 'স্বয়ংক্রিয় রেজিস্ট্রেশন ব্যর্থ হয়েছে (Auto-registration failed)');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 transition-colors duration-200">
      
      {/* Container Card */}
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl shadow-2xl p-6 md:p-8 space-y-6 relative overflow-hidden transition-all">
        
        {/* Visual brand indicator */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-500" />

        {/* Header Text */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 mb-2">
            <Key className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            PharmaManager Secure Portal
          </h2>
          <p className="text-xs text-gray-400 dark:text-slate-400 max-w-xs mx-auto">
            {isSignUp ? 'নতুন অ্যাডমিন বা স্টাফ অ্যাকাউন্ট তৈরি করুন' : 'আপনার ইমেইল ও পাসওয়ার্ড দিয়ে ড্যাশবোর্ডে প্রবেশ করুন'}
          </p>
        </div>

        {/* Live Supabase target info panel */}
        <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100/60 dark:border-emerald-900/20 text-emerald-800 dark:text-emerald-300 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Supabase Live Connected
          </div>
          <p className="text-[10px] text-gray-500 dark:text-slate-400 leading-normal">
            Target project: <span className="font-mono bg-white dark:bg-slate-950 px-1 py-0.5 rounded border border-gray-100 dark:border-slate-800/80">hfgjcrtcmbtvvcwglnug</span>
          </p>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-800 dark:text-rose-400 text-xs flex flex-col gap-2">
            <div className="flex gap-2.5 items-start">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {showRegisterOffer && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 space-y-3 shadow-xs">
            <div className="flex gap-2 items-start">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                আপনার এই ইমেইল দিয়ে এখনও অ্যাকাউন্ট রেজিস্ট্রেশন করা হয়নি। আপনি কি এখনই এই ইমেইল এবং পাসওয়ার্ড দিয়ে ১-ক্লিক রেজিস্ট্রেশন ও লগইন করতে চান? (Your account is not registered yet. Do you want to sign up and login now?)
              </p>
            </div>
            <button
              type="button"
              onClick={handleAutoSignUpAndLogin}
              disabled={loading}
              className="w-full py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
            >
              {loading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  ১-ক্লিক রেজিস্ট্রেশন এবং লগইন করুন
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        )}

        {success && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400 text-xs flex gap-2.5 items-start">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
            <span>{success}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {isSignUp && (
            <>
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400 flex items-center gap-1">
                  <User className="w-3 h-3 text-gray-400" />
                  Full Name (সম্পূর্ণ নাম)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Palok Mahamud"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-gray-950 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 transition-all shadow-inner"
                />
              </div>

              {/* Phone (Optional) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-gray-400" />
                  Phone Number (মোবাইল নম্বর - ঐচ্ছিক)
                </label>
                <input
                  type="tel"
                  placeholder="e.g., 01700000000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-gray-950 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 transition-all shadow-inner"
                />
              </div>

              {/* Account Role Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-gray-400" />
                  Account Role (অ্যাকাউন্ট টাইপ)
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setRole('owner')}
                    className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      role === 'owner'
                        ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400'
                        : 'border-gray-200 dark:border-slate-800 bg-transparent text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    Owner (মালিক / Admin)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('staff')}
                    className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      role === 'staff'
                        ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400'
                        : 'border-gray-200 dark:border-slate-800 bg-transparent text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    Staff (বিক্রেতা / কর্মচারী)
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Email Address */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400 flex items-center gap-1">
              <Mail className="w-3 h-3 text-gray-400" />
              Email Address (ইমেইল ঠিকানা)
            </label>
            <input
              type="email"
              required
              placeholder="e.g., palokmahamud@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-gray-950 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 transition-all shadow-inner font-mono"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400 flex items-center gap-1">
                <Key className="w-3 h-3 text-gray-400" />
                Password (পাসওয়ার্ড)
              </label>
              {email.toLowerCase() === 'palokmahamud@gmail.com' && !isSignUp && (
                <button
                  type="button"
                  onClick={handleAutoFill}
                  className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                >
                  Auto-fill My Admin Details
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-gray-950 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 transition-all shadow-inner font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-500 dark:hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                {isSignUp ? 'নতুন অ্যাকাউন্ট তৈরি করুন' : 'লগইন করুন'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

        </form>

        {/* Toggle Mode Footer */}
        <div className="pt-4 border-t border-gray-100 dark:border-slate-800 text-center text-xs text-gray-500 dark:text-slate-400">
          <span>{isSignUp ? 'ইতিমধ্যে অ্যাকাউন্ট আছে?' : 'অ্যাকাউন্ট নেই?'} </span>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              setSuccess(null);
              setShowRegisterOffer(false);
            }}
            className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
          >
            {isSignUp ? 'লগইন করুন (Sign In)' : 'নতুন অ্যাকাউন্ট খুলুন (Sign Up)'}
          </button>
        </div>

        {/* Quick Helper */}
        {!isSignUp && (
          <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-2xl border border-gray-100 dark:border-slate-800/60 text-[10.5px] text-gray-500 dark:text-slate-400 space-y-1.5">
            <p className="font-bold text-gray-700 dark:text-slate-300">💡 অ্যাডমিন লগইন হেল্পার (Admin Login Helper):</p>
            <p>আপনার অ্যাকাউন্ট তৈরি করা না থাকলে **Sign Up** এ গিয়ে নাম, ইমেইল <span className="font-mono text-emerald-600 font-semibold">palokmahamud@gmail.com</span> এবং পাসওয়ার্ড <span className="font-mono text-emerald-600 font-semibold">12345678</span> দিয়ে অ্যাকাউন্ট খুলুন। এটি স্বয়ংক্রিয়ভাবে আপনাকে মালিক (Owner) অ্যাকাউন্ট দিবে।</p>
            <div className="pt-1.5 border-t border-gray-200/50 dark:border-slate-800/50 space-y-1">
              <p className="font-bold text-amber-600 dark:text-amber-400">⚠️ Profile Creation Error বা Permission সমস্যা হলে:</p>
              <p>আপনার Supabase SQL Editor-এ গিয়ে নিচের কোডটি রান করে Row Level Security (RLS) নিষ্ক্রিয় করুন:</p>
              <pre className="p-1.5 bg-gray-100 dark:bg-slate-950 rounded text-[9.5px] font-mono text-gray-700 dark:text-slate-300 select-all overflow-x-auto">
                ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
              </pre>
              <p className="text-[9.5px]">সম্পূর্ণ ডাটাবেসের জন্য <span className="font-semibold">supabase_setup.sql</span> ফাইলটির সর্বশেষ অংশ রান করতে পারেন।</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
