import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers, Mail, ArrowLeft } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export function ForgotPassword() {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`
      });
      if (error) throw error;
      
      setSent(true);
      toast.success('Password reset link has been sent to your email!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error triggering password reset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 pt-20 bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950">
      <div className="w-full max-w-md relative">
        {/* Glow blur backgrounds */}
        <div className="absolute -top-20 -left-20 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl" />

        <div className="glass-panel p-8 rounded-3xl shadow-2xl relative border-white/10 text-left">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10 shadow-inner">
              <Layers className="w-6 h-6 text-purple-400 animate-pulse" />
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                GroupPay
              </span>
            </div>
          </div>

          <h2 className="text-2xl font-semibold text-center mb-1 text-white">Reset Password</h2>
          <p className="text-slate-400 text-xs text-center mb-6">
            Enter your email address to receive a password recovery link
          </p>

          {sent ? (
            <div className="space-y-6 text-center">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs leading-relaxed">
                Check your inbox! We've sent a password recovery link to{' '}
                <span className="font-semibold text-white">{email}</span>.
              </div>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-xs text-purple-400 hover:text-purple-300 font-semibold hover:underline"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="name@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="w-4 h-4 text-slate-500" />}
                required
              />

              <Button type="submit" className="w-full py-3 mt-4" loading={loading}>
                Send Reset Link
              </Button>

              <div className="text-center mt-6">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white font-medium hover:underline"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
export default ForgotPassword;
