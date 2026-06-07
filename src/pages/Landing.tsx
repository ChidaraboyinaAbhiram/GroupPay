import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Layers, ArrowRight, CheckCircle, Users, Activity, Shield, PieChart } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { GlassCard } from '../components/ui/GlassCard';

export function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleCTA = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  const containerVariants: any = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.1 }
    }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 100, damping: 15 }
    }
  };

  const features = [
    {
      icon: <Users className="w-5 h-5 text-purple-400" />,
      title: 'Bilateral & Group Pools',
      desc: 'Create multi-user groups for trips and shared housing, or track balances directly with individual friends.'
    },
    {
      icon: <PieChart className="w-5 h-5 text-emerald-400" />,
      title: 'Flexible Split Models',
      desc: 'Split bills equally, unequally, by percentages, or shares. GroupPay does the exact math adjusting for remainders.'
    },
    {
      icon: <Activity className="w-5 h-5 text-blue-400" />,
      title: 'Greedy Debt Simplification',
      desc: 'Our greedy balance-minimizer runs in the background to calculate the absolute fewest money transfers needed to clear group debts.'
    },
    {
      icon: <Shield className="w-5 h-5 text-rose-400" />,
      title: 'Realtime Sync & Storage',
      desc: 'Updates reflect in real-time using Supabase database subscriptions, with receipt images stored directly in Supabase Storage.'
    }
  ];

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-[#070a13] text-slate-200">
      {/* Background ambient radial glows */}
      <div className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] rounded-full bg-purple-600/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[10%] w-[500px] h-[500px] rounded-full bg-blue-600/5 blur-[100px] pointer-events-none" />

      {/* Navbar Header */}
      <header className="h-16 border-b border-white/5 bg-slate-950/20 backdrop-blur-xl sticky top-0 z-50 flex items-center px-6 lg:px-12 justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="p-1.5 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-lg border border-white/10 shadow-lg">
            <Layers className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="font-bold text-white tracking-tight text-sm">GroupPay</span>
        </div>

        <div className="flex items-center gap-4">
          {!user ? (
            <>
              <button
                onClick={() => navigate('/login')}
                className="text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                Sign In
              </button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/signup')}
              >
                Get Started
              </Button>
            </>
          ) : (
            <Button
              variant="glass"
              size="sm"
              onClick={() => navigate('/dashboard')}
              icon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Go to Dashboard
            </Button>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-16 lg:py-24 space-y-20 relative z-10">
        
        {/* Hero Headline Section */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="text-center space-y-6 max-w-3xl mx-auto"
        >
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-purple-500/20 bg-purple-500/5 text-purple-400 text-[10px] font-semibold tracking-wider uppercase"
          >
            <span>✨ Fully Redesigned Dashboard</span>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-none"
          >
            GroupPay — Smart <br className="hidden sm:block" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-indigo-300 to-blue-400">
              Expense Sharing
            </span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-slate-400 text-sm sm:text-base leading-relaxed"
          >
            A modern, production-grade expense split manager built for LinkedIn showcases and portfolio reviews. Keep track of group trip pools, direct friendships, and simplify debts in real-time.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-3 justify-center pt-4"
          >
            <Button
              variant="primary"
              size="lg"
              onClick={handleCTA}
              icon={<ArrowRight className="w-4.5 h-4.5" />}
              className="px-8 shadow-2xl shadow-purple-600/10"
            >
              Launch Workspace
            </Button>
            <Button
              variant="glass"
              size="lg"
              onClick={() => {
                const el = document.getElementById('features');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Explore Tech Stack
            </Button>
          </motion.div>
        </motion.div>

        {/* Floating Mockup Preview Card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="relative max-w-4xl mx-auto"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 rounded-3xl blur-2xl pointer-events-none -z-10" />
          
          <div className="glass-card p-4 rounded-3xl border-white/10 shadow-2xl overflow-hidden aspect-[16/9] flex flex-col">
            {/* Header mockup */}
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
              </div>
              <div className="h-4 w-40 bg-white/5 rounded-full" />
              <div className="w-4 h-4 bg-white/5 rounded-full" />
            </div>

            {/* Content mockup */}
            <div className="flex-1 grid grid-cols-3 gap-3 pt-3">
              <div className="col-span-2 space-y-3">
                <div className="glass-card p-4 rounded-2xl h-full flex flex-col justify-between border-white/5">
                  <div className="space-y-1">
                    <div className="h-3 w-16 bg-white/5 rounded-full" />
                    <div className="h-6 w-32 bg-white/10 rounded-full" />
                  </div>
                  <div className="h-24 bg-white/5 rounded-xl flex items-end p-2 gap-1.5">
                    <div className="h-1/3 flex-1 bg-purple-500/20 rounded-t" />
                    <div className="h-2/3 flex-1 bg-purple-500/20 rounded-t" />
                    <div className="h-1/2 flex-1 bg-purple-500/20 rounded-t" />
                    <div className="h-3/4 flex-1 bg-purple-500/30 rounded-t" />
                    <div className="h-2/5 flex-1 bg-purple-500/20 rounded-t" />
                    <div className="h-5/6 flex-1 bg-purple-500/40 rounded-t" />
                  </div>
                </div>
              </div>
              <div className="col-span-1 space-y-3 flex flex-col justify-between">
                <div className="glass-card p-3 rounded-2xl flex-1 border-white/5 flex flex-col justify-between">
                  <div className="h-3 w-1/2 bg-white/5 rounded-full" />
                  <div className="space-y-1.5">
                    <div className="h-2 w-full bg-white/5 rounded-full" />
                    <div className="h-2 w-5/6 bg-white/5 rounded-full" />
                  </div>
                  <div className="h-6 w-full bg-purple-500/10 rounded-xl border border-purple-500/20" />
                </div>
                <div className="glass-card p-3 rounded-2xl flex-1 border-white/5 flex flex-col justify-between">
                  <div className="h-3 w-2/3 bg-white/5 rounded-full" />
                  <div className="h-8 w-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 mx-auto" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Features list */}
        <section id="features" className="space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-white">Interactive Features</h2>
            <p className="text-slate-400 text-xs max-w-md mx-auto">
              Production-ready utilities designed to provide an excellent user experience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((f, i) => (
              <GlassCard
                key={i}
                glowColor="purple"
                className="p-6 space-y-3 border-white/5 flex flex-col items-start text-left"
              >
                <div className="p-3 bg-white/5 border border-white/8 rounded-2xl">
                  {f.icon}
                </div>
                <h3 className="font-bold text-white text-base leading-tight mt-2">{f.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
              </GlassCard>
            ))}
          </div>
        </section>

        {/* Tech stacks */}
        <section className="text-center space-y-8 pt-8 border-t border-white/5">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">The Stack</span>
            <h3 className="text-lg font-bold text-white">Production-Grade Technologies</h3>
          </div>
          <div className="flex flex-wrap justify-center gap-2 max-w-xl mx-auto">
            {['React 18', 'TypeScript', 'TailwindCSS v4', 'Framer Motion', 'Supabase DB', 'Supabase Auth', 'Supabase Storage', 'PostgreSQL RLS', 'Recharts', 'Vercel CDN'].map((tech) => (
              <span key={tech} className="px-3.5 py-1.5 rounded-full bg-white/5 border border-white/8 text-[11px] font-semibold text-slate-300">
                {tech}
              </span>
            ))}
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-white/5 text-center text-[10px] text-slate-500 mt-auto">
        <p>© 2026 GroupPay. Built for LinkedIn showcase. Supabase databases active.</p>
      </footer>
    </div>
  );
}
export default Landing;
