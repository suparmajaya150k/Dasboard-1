/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { RevenueDashboard } from '@/components/RevenueDashboard';
import { TargetDashboard } from '@/components/TargetDashboard';
import { Settings } from '@/components/Settings';
import { GoogleRatingDashboard } from '@/components/GoogleRatingDashboard';
import { initAuth, googleSignIn, logout as googleLogout, getAccessToken, DEFAULT_PIN, db } from '@/lib/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { fetchRevenueData, fetchTargetData, fetchDataFromAppsScript, DailyRevenue } from '@/lib/sheets';
import { fetchGoogleReviews, GoogleReview } from '@/lib/reviews';
import { User } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function App() {
  const [pinAuthenticated, setPinAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [hasGoogleToken, setHasGoogleToken] = useState(false);
  const [isSyncingConfig, setIsSyncingConfig] = useState(true);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeMenu, setActiveMenu] = useState('revenue');
  
  const [revenueData, setRevenueData] = useState<DailyRevenue[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [targetData, setTargetData] = useState<any>(null);

  const [reviews, setReviews] = useState<GoogleReview[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [isSampleReviews, setIsSampleReviews] = useState<boolean>(false);
  const [reviewsPermissionNotice, setReviewsPermissionNotice] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to Firestore for real-time config (PIN and Apps Script Web App URL)
    const docRef = doc(db, 'settings', 'app_config');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.pin) {
          localStorage.setItem('app_pin', data.pin);
        }
        if (data.appsScriptUrl) {
          localStorage.setItem('apps_script_url', data.appsScriptUrl);
          // If already authenticated, refresh the data to use the newly synced URL
          if (pinAuthenticated) {
            loadData();
            loadReviews();
          }
        }
      } else {
        // Initialize default configuration in Firestore if it doesn't exist
        setDoc(docRef, {
          pin: DEFAULT_PIN,
          appsScriptUrl: 'https://script.google.com/macros/s/AKfycbzbGGLUoqoCe4Yyi87-GIqDtVbXTZ56qOy4Nk947Eiv9Gzr7lddI4q8I4jBMUPDKstMug/exec',
          updatedAt: new Date().toISOString()
        }).catch(err => console.error('Error creating default config in Firestore:', err));
      }
      setIsSyncingConfig(false);
    }, (error) => {
      console.error('Error listening to shared settings in Firestore:', error);
      setIsSyncingConfig(false);
    });

    return () => unsubscribe();
  }, [pinAuthenticated]);

  useEffect(() => {
    // When PIN is authenticated, automatically attempt to load data from Apps Script & Reviews
    if (pinAuthenticated) {
      loadData();
      loadReviews();
    }
  }, [pinAuthenticated]);

  useEffect(() => {
    // Also listen for Google Auth state in case user logs in via Google
    const unsubscribe = initAuth(
      (user, token) => {
        setUser(user);
        if (pinAuthenticated && !revenueData.length) {
          loadData(token);
        }
      },
      () => {
        setUser(null);
      }
    );
    return () => unsubscribe();
  }, [pinAuthenticated]);

  const loadData = async (token?: string) => {
    try {
      setIsLoadingData(true);
      setError(null);
      
      // 1. Try Google Apps Script Web App first (no login needed!)
      try {
        const { revenue, target } = await fetchDataFromAppsScript();
        setRevenueData(revenue);
        setTargetData(target);
        setHasGoogleToken(true);
        return;
      } catch (scriptErr: any) {
        console.warn('Apps Script load failed, checking for Google OAuth token:', scriptErr.message);
        
        // 2. Fallback to direct Google Sheets API if token is provided
        const activeToken = token || await getAccessToken();
        if (activeToken) {
          const [revData, tgtData] = await Promise.all([
            fetchRevenueData(activeToken),
            fetchTargetData(activeToken)
          ]);
          setRevenueData(revData);
          setTargetData(tgtData);
          setHasGoogleToken(true);
          return;
        }

        // If no token and Apps Script failed, throw the Apps Script error
        throw scriptErr;
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load data');
      setHasGoogleToken(false);
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadReviews = async (token?: string) => {
    try {
      setIsLoadingReviews(true);
      setReviewsError(null);
      const activeToken = token || (user ? await getAccessToken() : undefined);
      const result = await fetchGoogleReviews(activeToken || undefined);
      setReviews(result.reviews);
      setIsSampleReviews(result.isSampleData);
      setReviewsPermissionNotice(result.permissionError || null);
    } catch (err: any) {
      console.error('Error loading Google Reviews:', err);
      setReviewsError(err.message || 'Gagal memuat data ulasan Google Maps');
    } finally {
      setIsLoadingReviews(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPin = localStorage.getItem('app_pin') || DEFAULT_PIN;
    if (pinInput === correctPin) {
      setPinAuthenticated(true);
      setPinError('');
    } else {
      setPinError('Incorrect PIN');
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setHasGoogleToken(true);
        loadData(result.accessToken);
      }
    } catch (err) {
      console.error('Login failed:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = () => {
    setPinAuthenticated(false);
    setPinInput('');
  };

  if (!pinAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
        <div className="bg-white border border-slate-200 p-8 rounded-2xl max-w-md w-full shadow-sm flex flex-col items-center text-center">
          <div className="w-20 h-20 mb-6">
            <img src="https://imgur.com/9EiNqyh.png" alt="Optik 150k" className="w-full h-full object-contain drop-shadow-sm" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Optik 150k Dashboard</h1>
          <p className="text-slate-500 mb-8 text-sm">Enter your PIN to access operational data.</p>
          
          <form onSubmit={handleLogin} className="w-full max-w-xs space-y-4">
            <input
              type="password"
              placeholder="Enter PIN"
              value={pinInput}
              onChange={e => setPinInput(e.target.value)}
              className="w-full text-center tracking-widest px-4 py-3 text-lg border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow bg-slate-50 focus:bg-white"
              autoFocus
            />
            {pinError && <p className="text-red-500 text-sm font-medium">{pinError}</p>}
            <button 
              type="submit"
              className="w-full flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 px-4 rounded-xl shadow-sm transition-colors"
            >
              Sign In
            </button>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest pt-4">Default PIN is 123456</p>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans text-slate-900">
      <Sidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen}
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        onLogout={handleSignOut}
        userName={user?.displayName || user?.email || null}
      />
      
      <div className={cn("flex-1 overflow-hidden flex flex-col", activeMenu !== 'revenue' && 'hidden')}>
        {isLoadingData ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-blue-500 mb-4" size={40} />
            <p className="text-slate-500 text-sm">Loading revenue data from Google Sheets...</p>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-lg mx-auto">
            <div className="bg-amber-50 text-amber-600 p-4 rounded-full mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="12" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Gagal Memuat Data</h2>
            <p className="text-slate-600 mb-6 text-sm bg-slate-100 p-4 rounded-xl border border-slate-200 text-left leading-relaxed">{error}</p>
            <div className="flex gap-3">
              <button 
                onClick={() => loadData()}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm transition-colors flex items-center gap-2"
              >
                <span>Coba Lagi</span>
              </button>
            </div>
          </div>
        ) : (
          <RevenueDashboard data={revenueData} />
        )}
      </div>

      <div className={cn("flex-1 overflow-hidden flex flex-col", activeMenu !== 'target' && 'hidden')}>
        <TargetDashboard 
          revenueData={revenueData} 
          targetData={targetData} 
        />
      </div>

      <div className={cn("flex-1 overflow-auto flex flex-col", activeMenu !== 'rating' && 'hidden')}>
        <GoogleRatingDashboard 
          reviews={reviews}
          isLoading={isLoadingReviews}
          onRefresh={loadReviews}
          error={reviewsError}
          isSampleData={isSampleReviews}
          permissionError={reviewsPermissionNotice}
        />
      </div>

      <div className={cn("flex-1 overflow-hidden flex flex-col", activeMenu !== 'settings' && 'hidden')}>
        <Settings 
          user={user}
          onGoogleSignIn={handleGoogleSignIn}
          onGoogleSignOut={googleLogout}
          isLoggingIn={isLoggingIn}
        />
      </div>
    </div>
  );
}
