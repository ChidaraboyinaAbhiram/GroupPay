import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeftRight, Clock, User, ArrowUpRight, ArrowDownLeft, TrendingUp } from 'lucide-react';
import { getAllExpensesAndSettlements } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency, formatRelativeTime } from '../../utils/helpers';
import { Settlement } from '../../types';
import { Loading } from '../../components/ui/Loading';
import { GlassCard } from '../../components/ui/GlassCard';
import { ListSkeleton } from '../../components/ui/Skeleton';

export function Settlements() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [stats, setStats] = useState({ totalSettled: 0, youPaid: 0, youReceived: 0 });

  useEffect(() => {
    async function loadSettlements() {
      if (!profile) return;
      try {
        const { settlements: list } = await getAllExpensesAndSettlements();
        setSettlements(list);

        let total = 0;
        let paid = 0;
        let received = 0;

        list.forEach((s) => {
          total += s.amount;
          if (s.payer_id === profile.id) {
            paid += s.amount;
          } else if (s.payee_id === profile.id) {
            received += s.amount;
          }
        });

        setStats({ totalSettled: total, youPaid: paid, youReceived: received });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadSettlements();
  }, [profile]);

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-4xl mx-auto w-full text-left">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <ArrowLeftRight className="w-6 h-6 text-purple-400" />
          Settlements Logs
        </h2>
        <p className="text-slate-400 text-xs mt-0.5">
          Review historical debt settlement entries recorded inside friends ledgers and group pools.
        </p>
      </div>

      {/* Stats summaries */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassCard glowColor="purple" hoverGlow={false} className="p-5 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Volume Resolved</span>
          <h3 className="text-xl font-extrabold text-white mt-2">{formatCurrency(stats.totalSettled)}</h3>
          <p className="text-[9px] text-slate-500 mt-1">Sum of all transaction ledger clearings</p>
        </GlassCard>
        <GlassCard glowColor="emerald" hoverGlow={false} className="p-5 flex flex-col justify-between">
          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            Paid out
          </span>
          <h3 className="text-xl font-extrabold text-emerald-400 mt-2">{formatCurrency(stats.youPaid)}</h3>
          <p className="text-[9px] text-slate-500 mt-1">Transfers sent by you</p>
        </GlassCard>
        <GlassCard glowColor="blue" hoverGlow={false} className="p-5 flex flex-col justify-between">
          <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider flex items-center gap-1">
            <ArrowDownLeft className="w-3.5 h-3.5" />
            Received
          </span>
          <h3 className="text-xl font-extrabold text-blue-400 mt-2">{formatCurrency(stats.youReceived)}</h3>
          <p className="text-[9px] text-slate-500 mt-1">Settled payments received by you</p>
        </GlassCard>
      </div>

      {/* Roster of Settlements */}
      {loading ? (
        <ListSkeleton rows={4} />
      ) : settlements.length > 0 ? (
        <div className="space-y-3">
          {settlements.map((s, idx) => {
            const isUserPayer = s.payer_id === profile?.id;
            const isUserPayee = s.payee_id === profile?.id;

            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.04 }}
                className="glass-card p-4 flex items-center justify-between gap-4 border-white/5 hover:bg-white/5 transition-all"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                    isUserPayer 
                      ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                      : isUserPayee 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                      : 'bg-white/5 border-white/10 text-slate-400'
                  }`}>
                    {isUserPayer ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                  </div>

                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white leading-tight">
                      {isUserPayer ? (
                        <span>You settled with <span className="text-purple-300">{s.payee?.name}</span></span>
                      ) : isUserPayee ? (
                        <span><span className="text-purple-300">{s.payer?.name}</span> settled with You</span>
                      ) : (
                        <span>{s.payer?.name} paid {s.payee?.name}</span>
                      )}
                    </h4>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1 font-medium">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {formatRelativeTime(s.created_at)}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-sm font-bold block ${isUserPayer ? 'text-rose-400' : isUserPayee ? 'text-emerald-400' : 'text-slate-300'}`}>
                    {isUserPayer ? '-' : '+'}{formatCurrency(s.amount)}
                  </span>
                  <span className="text-[8px] uppercase font-mono text-slate-500 tracking-wider">
                    {s.group_id ? 'Group Settled' : 'Direct Settled'}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="glass-card py-20 text-center text-xs text-slate-500 border-dashed border-white/10 rounded-3xl">
          No settlements history has been recorded yet.
        </div>
      )}
    </div>
  );
}
export default Settlements;
