import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Layers, Mail, Lock } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export function Login() {
  const navigate = useNavigate();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      
      toast.success('Logged in successfully!');
      navigate('/');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Invalid email or password.');
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

          <h2 className="text-2xl font-semibold text-center mb-1 text-white">Welcome back</h2>
          <p className="text-slate-400 text-xs text-center mb-6">Enter your credentials to access your dashboard</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="name@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail className="w-4 h-4 text-slate-500" />}
              required
            />

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs text-purple-400 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock className="w-4 h-4 text-slate-500" />}
                required
              />
            </div>

            <Button type="submit" className="w-full py-3 mt-4" loading={loading}>
              Sign In
            </Button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="text-purple-400 font-semibold hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
export default Login;
