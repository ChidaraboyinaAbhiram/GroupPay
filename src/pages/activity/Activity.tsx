import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity as ActivityIcon, Clock, Filter, FileText, CheckSquare, Users } from 'lucide-react';
import { getActivityFeed } from '../../services/api';
import { formatRelativeTime } from '../../utils/helpers';
import { Activity as ActivityType } from '../../types';
import { Loading } from '../../components/ui/Loading';
import { GlassCard } from '../../components/ui/GlassCard';
import { ListSkeleton } from '../../components/ui/Skeleton';

export function Activity() {
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<ActivityType[]>([]);
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    async function fetchActivities() {
      try {
        const feed = await getActivityFeed();
        setActivities(feed);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchActivities();
  }, []);

  const filtered = activities.filter(act => {
    if (filterType === 'all') return true;
    if (filterType === 'expenses') return act.type === 'expense_created';
    if (filterType === 'settlements') return act.type === 'settlement_created';
    return true;
  });

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-4xl mx-auto w-full text-left">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <ActivityIcon className="w-6 h-6 text-purple-400" />
          System Activity Stream
        </h2>
        <p className="text-slate-400 text-xs mt-0.5">
          Verify and audit all shared ledger adjustments, additions, and settles.
        </p>
      </div>

      {/* Filter and controls */}
      <GlassCard glowColor="none" hoverGlow={false} className="p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <Filter className="w-4 h-4 text-slate-500" />
          Filter Timeline
        </div>
        <div className="flex gap-2">
          {['all', 'expenses', 'settlements'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize border transition-all ${
                filterType === type
                  ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                  : 'bg-white/5 border-transparent text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Timeline view */}
      {loading ? (
        <ListSkeleton rows={5} />
      ) : filtered.length > 0 ? (
        <div className="relative border-l border-white/5 pl-6 ml-4 space-y-6">
          {filtered.map((act, idx) => {
            const isExp = act.type === 'expense_created';
            
            return (
              <motion.div
                key={act.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                className="relative"
              >
                {/* Timeline node marker */}
                <span className="absolute -left-[35px] top-1.5 w-4.5 h-4.5 rounded-full border-4 border-slate-950 bg-slate-900 flex items-center justify-center">
                  <span className={`w-1.5 h-1.5 rounded-full ${isExp ? 'bg-purple-500' : 'bg-emerald-500'}`} />
                </span>

                <GlassCard glowColor="none" hoverGlow={false} className="p-4 hover:bg-white/5 transition-all">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-xl flex-shrink-0 border ${
                      isExp 
                        ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' 
                        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    }`}>
                      {isExp ? <FileText className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />}
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <h4 className="text-xs font-bold text-white leading-none">{act.title}</h4>
                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(act.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-normal">{act.description}</p>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="glass-card py-20 text-center text-xs text-slate-500 border-dashed border-white/10 rounded-3xl">
          No activity records found for this filter type.
        </div>
      )}
    </div>
  );
}
export default Activity;
