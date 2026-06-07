import React, { useState } from 'react';
import { Copy, Check, User, Mail, LogOut, CheckCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ui/Toast';
import { GlassCard } from '../../components/ui/GlassCard';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { updateProfile } from '../../services/api';
import { getInitials, getAvatarColor } from '../../utils/helpers';

export function Profile() {
  const { profile, refreshProfile, signOut } = useAuth();
  const toast = useToast();

  const [copied, setCopied] = useState(false);
  const [name, setName] = useState(profile?.name || '');
  const [loading, setLoading] = useState(false);

  const handleCopy = async () => {
    if (!profile) return;
    try {
      await navigator.clipboard.writeText(profile.share_id);
      setCopied(true);
      toast.success('Share ID copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
      toast.error('Failed to copy Share ID.');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await updateProfile({ name: name.trim() });
      await refreshProfile();
      toast.success('Profile updated successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to update profile details.');
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-2xl mx-auto w-full text-left">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Profile Configurations</h2>
        <p className="text-slate-400 text-xs mt-0.5">
          Manage your account configurations, view credentials, and copy your invite code.
        </p>
      </div>

      {/* Share ID Card */}
      <GlassCard glowColor="purple">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-tr ${getAvatarColor(profile.name)} flex items-center justify-center text-white text-xl font-bold`}>
              {getInitials(profile.name)}
            </div>
            <div>
              <h3 className="font-bold text-white text-base leading-tight">{profile.name}</h3>
              <p className="text-slate-400 text-xs mt-0.5">{profile.email}</p>
            </div>
          </div>

          <div className="bg-black/20 px-4 py-3 rounded-2xl border border-white/5 flex items-center justify-between gap-4 w-full sm:w-auto">
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Your Share ID</span>
              <span className="text-sm font-bold text-purple-400 tracking-wider font-mono">{profile.share_id}</span>
            </div>
            <button
              onClick={handleCopy}
              className="p-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl border border-white/5 transition-all focus:outline-none"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Edit Details */}
      <GlassCard glowColor="none" hoverGlow={false}>
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <h3 className="text-sm font-bold text-white tracking-tight">Edit Profile Details</h3>
          
          <Input
            label="Full Name"
            value={name}
            onChange={e => setName(e.target.value)}
            icon={<User className="w-4 h-4 text-slate-500" />}
            required
          />

          <Input
            label="Email Address"
            value={profile.email}
            icon={<Mail className="w-4 h-4 text-slate-500" />}
            disabled
            helperText="Your email address is managed through authentication security."
          />

          <div className="flex justify-end pt-4 border-t border-white/5">
            <Button type="submit" variant="primary" loading={loading}>
              Save Changes
            </Button>
          </div>
        </form>
      </GlassCard>

      {/* Log Out Box */}
      <GlassCard glowColor="rose" className="border-rose-500/20 hover:border-rose-500/30">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h4 className="text-sm font-bold text-white tracking-tight">Sign Out Account</h4>
            <p className="text-[10px] text-slate-500 mt-1">Disconnect from the current active session in this web browser.</p>
          </div>
          <Button variant="danger" size="sm" onClick={signOut} icon={<LogOut className="w-3.5 h-3.5" />}>
            Sign Out
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}
export default Profile;
