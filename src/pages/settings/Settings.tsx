import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Sliders, Bell, Eye, DollarSign, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ui/Toast';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';

export function Settings() {
  const { profile, refreshProfile } = useAuth();
  const toast = useToast();

  const [currency, setCurrency] = useState('USD');
  const [theme, setTheme] = useState('dark');
  const [emailNotif, setEmailNotif] = useState(true);
  const [realtimeNotif, setRealtimeNotif] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const savedCurrency = localStorage.getItem('gp_currency') || 'USD';
    const savedTheme = localStorage.getItem('gp_theme') || 'dark';
    setCurrency(savedCurrency);
    setTheme(savedTheme);
  }, []);

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    
    // Save to localStorage
    localStorage.setItem('gp_currency', currency);
    localStorage.setItem('gp_theme', theme);
    
    setTimeout(() => {
      setSaveLoading(false);
      toast.success('Workspace preferences updated successfully!');
    }, 800);
  };

  if (!profile) return null;

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-2xl mx-auto w-full text-left animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-purple-400" />
          Settings Console
        </h2>
        <p className="text-slate-400 text-xs mt-0.5">
          Configure default sharing preferences, client themes, and workspace parameters.
        </p>
      </div>

      <form onSubmit={handleSavePreferences} className="space-y-6">
        {/* Localization & Display */}
        <GlassCard glowColor="purple" hoverGlow={false} className="p-6 space-y-4">
          <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            <Sliders className="w-4 h-4 text-purple-400" />
            Display & Currencies
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Currency settings */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Default Workspace Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-4 py-3 rounded-xl glass-input text-white text-xs focus:border-purple-500/50 focus:outline-none"
              >
                <option value="USD" className="bg-slate-900 text-white">USD ($) — United States Dollar</option>
                <option value="EUR" className="bg-slate-900 text-white">EUR (€) — Euro</option>
                <option value="GBP" className="bg-slate-900 text-white">GBP (£) — British Pound Sterling</option>
              </select>
            </div>

            {/* Display themes */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Interface Color Palette
              </label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="w-full px-4 py-3 rounded-xl glass-input text-white text-xs focus:border-purple-500/50 focus:outline-none"
              >
                <option value="dark" className="bg-slate-900 text-white">Dark Premium (Navy Radial Glow)</option>
                <option value="vision" className="bg-slate-900 text-white">Vision Pro Glassmorphism</option>
              </select>
            </div>
          </div>
        </GlassCard>

        {/* Notifications */}
        <GlassCard glowColor="none" hoverGlow={false} className="p-6 space-y-4">
          <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            <Bell className="w-4 h-4 text-indigo-400" />
            Notifications Parameters
          </h3>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/8 transition-colors cursor-pointer">
              <div>
                <span className="text-xs font-bold text-white block">Email Summaries</span>
                <span className="text-[10px] text-slate-500 mt-0.5">Receive transaction logs directly in your email inbox</span>
              </div>
              <input
                type="checkbox"
                checked={emailNotif}
                onChange={(e) => setEmailNotif(e.target.checked)}
                className="w-4.5 h-4.5 accent-purple-500 rounded border-white/10"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/8 transition-colors cursor-pointer">
              <div>
                <span className="text-xs font-bold text-white block">Realtime Push Triggers</span>
                <span className="text-[10px] text-slate-500 mt-0.5">Show web notification toasts when a friend settles</span>
              </div>
              <input
                type="checkbox"
                checked={realtimeNotif}
                onChange={(e) => setRealtimeNotif(e.target.checked)}
                className="w-4.5 h-4.5 accent-purple-500 rounded border-white/10"
              />
            </label>
          </div>
        </GlassCard>

        {/* Security Summary */}
        <GlassCard glowColor="emerald" hoverGlow={false} className="p-4 flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div className="text-[10px] text-slate-400 leading-normal">
            Your connection settings are protected. All database updates utilize SSL security tokens.
          </div>
        </GlassCard>

        <div className="flex justify-end pt-4">
          <Button type="submit" variant="primary" loading={saveLoading} className="px-6">
            Save Preferences
          </Button>
        </div>
      </form>
    </div>
  );
}
export default Settings;
