import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderPlus, Loader2, AlertCircle, TrendingUp } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ui/Toast';
import { useRealtime } from '../../hooks/useRealtime';
import { Loading } from '../../components/ui/Loading';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { getGroups, createGroup, getAllExpensesAndSettlements } from '../../services/api';
import { formatCurrency, getInitials, getAvatarColor } from '../../utils/helpers';
import { Group, Expense, Settlement } from '../../types';

export function Groups() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);

  // Create group form modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // Group aggregates
  const [groupPools, setGroupPools] = useState<{ [groupId: string]: number }>({});
  const [groupBalances, setGroupBalances] = useState<{ [groupId: string]: number }>({});

  const loadGroupsData = async () => {
    if (!profile) return;
    try {
      const [gList, { expenses: expList, settlements: setList }] = await Promise.all([
        getGroups(),
        getAllExpensesAndSettlements()
      ]);

      setGroups(gList);
      setExpenses(expList);
      setSettlements(setList);

      calculateGroupAggregates(gList, expList, setList, profile.id);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load group portfolios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroupsData();
  }, [profile]);

  // Realtime listeners
  useRealtime('groups', () => loadGroupsData());
  useRealtime('group_members', () => loadGroupsData());
  useRealtime('expenses', () => loadGroupsData());
  useRealtime('settlements', () => loadGroupsData());

  const calculateGroupAggregates = (
    gList: Group[],
    expList: Expense[],
    setList: Settlement[],
    currentUserId: string
  ) => {
    const pools: { [id: string]: number } = {};
    const balances: { [id: string]: number } = {};

    gList.forEach(g => {
      pools[g.id] = 0;
      balances[g.id] = 0;
    });

    // 1. Calculate Group Pool Accumulations (Sum of all expenses in each group)
    expList.forEach(exp => {
      if (exp.group_id && pools[exp.group_id] !== undefined) {
        pools[exp.group_id] += exp.amount;
      }
    });

    // 2. Calculate User Net Balances per Group
    // User gets credited for what they paid, debited for their participant share
    expList.forEach(exp => {
      if (!exp.group_id || balances[exp.group_id] === undefined) return;

      const payerId = exp.paid_by;
      const isUserPayer = payerId === currentUserId;

      exp.participants?.forEach(part => {
        const partId = part.user_id;

        if (isUserPayer && partId !== currentUserId) {
          // Current user paid, and participant owes current user
          balances[exp.group_id!] += part.amount;
        } else if (!isUserPayer && partId === currentUserId) {
          // Someone else paid, and current user owes payer
          balances[exp.group_id!] -= part.amount;
        }
      });
    });

    // Adjust for settlements within groups
    setList.forEach(settle => {
      if (!settle.group_id || balances[settle.group_id] === undefined) return;

      const payerId = settle.payer_id;
      const payeeId = settle.payee_id;

      if (payerId === currentUserId) {
        // Current user paid payee (reduced debt to group member)
        balances[settle.group_id] += settle.amount;
      } else if (payeeId === currentUserId) {
        // Payee received from payer (reduced payer's debt to current user)
        balances[settle.group_id] -= settle.amount;
      }
    });

    // Clean decimals
    gList.forEach(g => {
      pools[g.id] = Math.round(pools[g.id] * 100) / 100;
      balances[g.id] = Math.round(balances[g.id] * 100) / 100;
    });

    setGroupPools(pools);
    setGroupBalances(balances);
  };

  const handleCreateGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    setCreateLoading(true);
    try {
      const group = await createGroup(newGroupName.trim(), newGroupDesc.trim() || null);
      toast.success(`Group "${group.name}" created successfully!`);
      setNewGroupName('');
      setNewGroupDesc('');
      setCreateModalOpen(false);
      loadGroupsData();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to create group.');
    } finally {
      setCreateLoading(false);
    }
  };

  if (loading) {
    return <Loading fullPage message="Assembling group portfolios..." />;
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-5xl mx-auto w-full text-left">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Your Groups Showcase</h2>
          <p className="text-slate-400 text-xs mt-0.5">
            Manage shared expense hubs and view automated balance settlements.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setCreateModalOpen(true)}
          icon={<FolderPlus className="w-4 h-4" />}
        >
          Provision Group
        </Button>
      </div>

      {groups.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((g) => {
            const pool = groupPools[g.id] || 0;
            const balance = groupBalances[g.id] || 0;
            const members = g.members || [];

            return (
              <GlassCard
                key={g.id}
                glowColor={balance > 0 ? 'emerald' : balance < 0 ? 'rose' : 'none'}
                className="flex flex-col justify-between h-48 cursor-pointer"
                onClick={() => navigate(`/groups/${g.id}`)}
              >
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-white text-base group-hover:text-purple-400 transition-colors">
                      {g.name}
                    </h3>
                    <span className="text-[9px] bg-purple-500/20 text-purple-300 font-semibold px-2 py-0.5 rounded-full border border-purple-500/30">
                      Active Hub
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs mt-1.5 leading-relaxed truncate">
                    {g.description || 'No description provided.'}
                  </p>
                  <p className="text-slate-400 text-[10px] mt-1">
                    Group Pool Accumulation:{' '}
                    <span className="text-slate-200 font-semibold">{formatCurrency(pool)}</span>
                  </p>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-white/5 mt-4">
                  {/* Members Avatars list */}
                  <div className="flex -space-x-2 overflow-hidden">
                    {members.slice(0, 4).map((m) => (
                      <div
                        key={m.id}
                        title={m.name}
                        className={`inline-block h-6.5 w-6.5 rounded-full ring-2 ring-slate-950 bg-gradient-to-tr ${getAvatarColor(
                          m.name
                        )} flex items-center justify-center text-white text-[8px] font-bold`}
                      >
                        {getInitials(m.name)}
                      </div>
                    ))}
                    {members.length > 4 && (
                      <div className="inline-block h-6.5 w-6.5 rounded-full ring-2 ring-slate-950 bg-slate-800 flex items-center justify-center text-white text-[8px] font-bold">
                        +{members.length - 4}
                      </div>
                    )}
                  </div>

                  <span
                    className={`text-xs font-bold ${
                      balance > 0 ? 'text-emerald-400' : balance < 0 ? 'text-rose-400' : 'text-slate-400'
                    }`}
                  >
                    {balance > 0
                      ? `You receive ${formatCurrency(balance)}`
                      : balance < 0
                      ? `You owe ${formatCurrency(Math.abs(balance))}`
                      : 'Settled'}
                  </span>
                </div>
              </GlassCard>
            );
          })}
        </div>
      ) : (
        <div className="glass-card py-20 text-center text-xs text-slate-500 border-dashed border-white/10">
          You are not a member of any groups yet. Click "Provision Group" above to create one!
        </div>
      )}

      {/* Create Group Modal */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Provision New Group" size="md">
        <form onSubmit={handleCreateGroupSubmit} className="space-y-4 text-left">
          <Input
            label="Group Name"
            placeholder="e.g. Iceland Expedition 2026, HQ Suite Logistics"
            value={newGroupName}
            onChange={e => setNewGroupName(e.target.value)}
            required
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Group Description
            </label>
            <textarea
              value={newGroupDesc}
              onChange={e => setNewGroupDesc(e.target.value)}
              placeholder="e.g. Shared expenses for summer cabin trip"
              className="w-full h-20 px-4 py-3 rounded-xl glass-input text-white text-xs placeholder:text-slate-600 focus:border-purple-500/50 focus:outline-none resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
            <Button variant="ghost" onClick={() => setCreateModalOpen(false)} type="button">
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={createLoading}>
              Provision Group
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
export default Groups;
