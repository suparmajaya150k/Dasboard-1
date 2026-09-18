import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { googleSignIn, logout as googleLogout, DEFAULT_PIN, db } from '@/lib/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Loader2, CheckCircle2, User as UserIcon, Lock, Image as ImageIcon } from 'lucide-react';

interface SettingsProps {
  user: User | null;
  onGoogleSignIn: () => Promise<void>;
  onGoogleSignOut: () => void;
  isLoggingIn: boolean;
}

export function Settings({ user, onGoogleSignIn, onGoogleSignOut, isLoggingIn }: SettingsProps) {
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [appsScriptUrl, setAppsScriptUrl] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSavingPin, setIsSavingPin] = useState(false);
  const [isSavingUrl, setIsSavingUrl] = useState(false);

  useEffect(() => {
    setAvatarUrl(localStorage.getItem('app_avatar') || '');
    setAppsScriptUrl(localStorage.getItem('apps_script_url') || 'https://script.google.com/macros/s/AKfycbzbGGLUoqoCe4Yyi87-GIqDtVbXTZ56qOy4Nk947Eiv9Gzr7lddI4q8I4jBMUPDKstMug/exec');
  }, []);

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsSavingPin(true);

    try {
      const currentPin = localStorage.getItem('app_pin') || DEFAULT_PIN;
      if (pin !== currentPin) {
        setError('PIN saat ini salah');
        setIsSavingPin(false);
        return;
      }
      if (newPin !== confirmPin) {
        setError('Konfirmasi PIN baru tidak cocok');
        setIsSavingPin(false);
        return;
      }
      if (newPin.length < 4) {
        setError('PIN baru minimal harus 4 digit');
        setIsSavingPin(false);
        return;
      }

      const docRef = doc(db, 'settings', 'app_config');
      await setDoc(docRef, {
        pin: newPin,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      localStorage.setItem('app_pin', newPin);
      setMessage('PIN berhasil diperbarui dan disinkronkan ke seluruh perangkat!');
      setPin('');
      setNewPin('');
      setConfirmPin('');
    } catch (err: any) {
      console.error('Error updating PIN:', err);
      setError('Gagal menyinkronkan PIN ke Firebase: ' + err.message);
    } finally {
      setIsSavingPin(false);
    }
  };

  const handleUpdateUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsSavingUrl(true);

    try {
      if (!appsScriptUrl.trim().startsWith('https://script.google.com/')) {
        setError('Google Apps Script URL harus diawali dengan https://script.google.com/');
        setIsSavingUrl(false);
        return;
      }

      const docRef = doc(db, 'settings', 'app_config');
      await setDoc(docRef, {
        appsScriptUrl: appsScriptUrl.trim(),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      localStorage.setItem('apps_script_url', appsScriptUrl.trim());
      setMessage('Google Apps Script URL berhasil diperbarui dan disinkronkan ke seluruh perangkat!');
    } catch (err: any) {
      console.error('Error updating URL:', err);
      setError('Gagal menyinkronkan URL ke Firebase: ' + err.message);
    } finally {
      setIsSavingUrl(false);
    }
  };

  const handleUpdateAvatar = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('app_avatar', avatarUrl);
    setMessage('Profile picture updated successfully');
    setTimeout(() => window.location.reload(), 1000); // Reload to apply avatar everywhere
  };

  return (
    <div className="flex-1 overflow-auto p-8 custom-scrollbar">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Settings</h2>
          <p className="text-sm text-slate-500 mt-1">Manage your PIN, Profile Picture, and Google Workspace connection.</p>
        </div>

        {message && (
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 flex items-center gap-3">
            <CheckCircle2 size={20} />
            <p className="text-sm font-medium">{message}</p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100">
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* PIN Settings */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                <Lock size={20} />
              </div>
              <h3 className="font-bold text-slate-800">Change PIN</h3>
            </div>
            <form onSubmit={handleUpdatePin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Current PIN</label>
                <input 
                  type="password" 
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter current PIN"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">New PIN</label>
                <input 
                  type="password" 
                  value={newPin}
                  onChange={e => setNewPin(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter new PIN"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Confirm New PIN</label>
                <input 
                  type="password" 
                  value={confirmPin}
                  onChange={e => setConfirmPin(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Confirm new PIN"
                />
              </div>
              <button 
                type="submit" 
                disabled={isSavingPin}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-75"
              >
                {isSavingPin ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    <span>Updating & Syncing...</span>
                  </>
                ) : (
                  <span>Update PIN</span>
                )}
              </button>
            </form>
          </div>
 
          <div className="space-y-6">
            {/* Profile Picture Settings */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                  <ImageIcon size={20} />
                </div>
                <h3 className="font-bold text-slate-800">Profile Picture</h3>
              </div>
              <form onSubmit={handleUpdateAvatar} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Image URL</label>
                  <input 
                    type="url" 
                    value={avatarUrl}
                    onChange={e => setAvatarUrl(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com/avatar.png"
                  />
                </div>
                <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2 rounded-xl transition-colors">
                  Save Picture
                </button>
              </form>
            </div>
 
            {/* Google Apps Script Integration */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">Google Apps Script API</h3>
                  <p className="text-xs text-slate-500">Koneksi otomatis tanpa perlu Login Google</p>
                </div>
              </div>
 
              <div className="space-y-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Status Integration:</span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Aktif (Public Endpoint)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 pt-1">Web ini mengambil data langsung dari Google Sheets via Apps Script Web App tanpa OAuth / Login.</p>
                </div>
 
                <form onSubmit={handleUpdateUrl} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Apps Script Web App URL</label>
                    <input 
                      type="text" 
                      value={appsScriptUrl}
                      onChange={e => setAppsScriptUrl(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={isSavingUrl}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-75 text-white font-medium py-2 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    {isSavingUrl ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        <span>Syncing to all devices...</span>
                      </>
                    ) : (
                      <span>Save & Sync URL</span>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
