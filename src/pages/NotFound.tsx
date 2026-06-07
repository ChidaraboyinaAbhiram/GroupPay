import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, HelpCircle, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { GlassCard } from '../components/ui/GlassCard';

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#070a13] text-slate-100 relative overflow-hidden">
      {/* Background ambient blob */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-purple-600/10 blur-[100px] pointer-events-none" />

      <GlassCard glowColor="purple" hoverGlow={false} className="max-w-md w-full text-center p-8 space-y-6 relative z-10">
        <motion.div
          initial={{ scale: 0.8, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 120, damping: 15 }}
          className="w-16 h-16 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-2xl flex items-center justify-center mx-auto"
        >
          <HelpCircle className="w-8 h-8" />
        </motion.div>

        <div className="space-y-2">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-4xl font-extrabold text-white tracking-tight leading-none"
          >
            404
          </motion.h1>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="text-base font-bold text-slate-300"
          >
            Page Not Found
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="text-xs text-slate-400 leading-relaxed"
          >
            The path you are looking for does not exist or has been moved. Check the web URL or return to dashboard.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="pt-2"
        >
          <Button
            variant="primary"
            onClick={() => navigate('/')}
            className="w-full"
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            Back to Safety
          </Button>
        </motion.div>
      </GlassCard>
    </div>
  );
}
export default NotFound;
