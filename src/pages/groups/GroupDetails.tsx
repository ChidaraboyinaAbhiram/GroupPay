import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus,
  Sliders,
  UserPlus,
  LogOut,
  ChevronRight,
  FileText,
  CheckSquare,
  AlertCircle,
  FileImage,
  ArrowRight,
  TrendingUp,
  Copy
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ui/Toast';
import { useRealtime } from '../../hooks/useRealtime';
import { Loading } from '../../components/ui/Loading';
import { GlassCard } from '../../components/ui/GlassCard';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import {
  getGroupMembers,
  getGroupExpenses,
  getGroupSettlements,
  inviteMemberByShareId,
  leaveGroup,
  createSettlement
} from '../../services/api';
import { supabase } from '../../services/supabase';
import { formatCurrency, getInitials, getAvatarColor, formatRelativeTime } from '../../utils/helpers';
import { Group, Expense, Settlement, Profile } from '../../types';

interface GroupLedgerBalance {
  [userId: string]: {
    profile: Profile;
    balance: number;
  };
}

interface SuggestedTransfer {
  from: Profile;
  to: Profile;
  amount: number;
}

export function GroupDetails() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const toast = useToast();

  // Loading flags
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [settleLoading, setSettleLoading] = useState(false);

  // Group Details States
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [memberBalances, setMemberBalances] = useState<GroupLedgerBalance>({});
  const [suggestedTransfers, setSuggestedTransfers] = useState<SuggestedTransfer[]>([]);

  // Invite Member Modal State
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteShareId, setInviteShareId] = useState('');

  // Settle Up Modal State
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [settlePayerId, setSettlePayerId] = useState('');
  const [settlePayeeId, setSettlePayeeId] = useState('');
  const [settleAmount, setSettleAmount] = useState('');

  // Load group details
  const loadGroupDetails = useCallback(async () => {
    if (!groupId || !profile) return;
    try {
      // Fetch group general metadata
      const { data: gData, error: gError } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (gError) throw gError;

      const [mList, expList, setList] = await Promise.all([
        getGroupMembers(groupId),
        getGroupExpenses(groupId),
        getGroupSettlements(groupId)
      ]);

      setGroup(gData);
      setMembers(mList);
      setExpenses(expList);
      setSettlements(setList);

      // Calculate member balance ledgers
      const ledger = calculateMemberBalances(mList, expList, setList);
      setMemberBalances(ledger);

      // Run debt minimization suggestions
      calculateSuggestedTransfers(ledger);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load group details.');
      navigate('/groups');
    } finally {
      setLoading(false);
    }
  }, [groupId, profile, navigate, toast]);

  useEffect(() => {
    loadGroupDetails();
  }, [loadGroupDetails]);

  // Realtime listeners
  useRealtime('expenses', () => loadGroupDetails(), `group_id=eq.${groupId}`);
  useRealtime('expense_participants', () => loadGroupDetails());
  useRealtime('settlements', () => loadGroupDetails(), `group_id=eq.${groupId}`);
  useRealtime('group_members', () => loadGroupDetails(), `group_id=eq.${groupId}`);

  const calculateMemberBalances = (
    mList: Profile[],
    expList: Expense[],
    setList: Settlement[]
  ): GroupLedgerBalance => {
    const ledger: GroupLedgerBalance = {};
    
    // Initialize ledger
    mList.forEach((m) => {
      ledger[m.id] = { profile: m, balance: 0 };
    });

    // 1. Process expenses
    expList.forEach((exp) => {
      const payerId = exp.paid_by;
      if (ledger[payerId]) {
        // Credit the payer the total amount
        ledger[payerId].balance += exp.amount;
      }

      exp.participants?.forEach((part) => {
        const partId = part.user_id;
        if (ledger[partId]) {
          // Debit each participant their share
          ledger[partId].balance -= part.amount;
        }
      });
    });

    // 2. Process settlements
    setList.forEach((s) => {
      const payerId = s.payer_id;
      const payeeId = s.payee_id;

      if (ledger[payerId]) {
        ledger[payerId].balance += s.amount;
      }
      if (ledger[payeeId]) {
        ledger[payeeId].balance -= s.amount;
      }
    });

    // Clean rounding issues
    Object.keys(ledger).forEach((id) => {
      ledger[id].balance = Math.round(ledger[id].balance * 100) / 100;
    });

    return ledger;
  };

  // Greedy Debt Simplifier Algorithm
  const calculateSuggestedTransfers = (ledger: GroupLedgerBalance) => {
    const debtors: { profile: Profile; balance: number }[] = [];
    const creditors: { profile: Profile; balance: number }[] = [];

    Object.values(ledger).forEach(({ profile, balance }) => {
      if (balance < -0.01) {
        debtors.push({ profile, balance: Math.abs(balance) });
      } else if (balance > 0.01) {
        creditors.push({ profile, balance });
      }
    });

    // Sort descending
    debtors.sort((a, b) => b.balance - a.balance);
    creditors.sort((a, b) => b.balance - a.balance);

    const transfers: SuggestedTransfer[] = [];
    let dIndex = 0;
    let cIndex = 0;

    while (dIndex < debtors.length && cIndex < creditors.length) {
      const debtor = debtors[dIndex];
      const creditor = creditors[cIndex];

      const amountToTransfer = Math.min(debtor.balance, creditor.balance);
      
      if (amountToTransfer > 0.01) {
        transfers.push({
          from: debtor.profile,
          to: creditor.profile,
          amount: Math.round(amountToTransfer * 100) / 100
        });
      }

      debtor.balance -= amountToTransfer;
      creditor.balance -= amountToTransfer;

      if (debtor.balance < 0.01) dIndex++;
      if (creditor.balance < 0.01) cIndex++;
    }

    setSuggestedTransfers(transfers);
  };

  // Invite Member Form
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteShareId.trim() || !groupId) return;

    setActionLoading(true);
    try {
      const user = await inviteMemberByShareId(groupId, inviteShareId.trim().toUpperCase());
      toast.success(`"${user.name}" invited successfully!`);
      setInviteShareId('');
      setInviteModalOpen(false);
      loadGroupDetails();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Invitation failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Leave Group
  const handleLeaveGroup = async () => {
    if (!groupId) return;
    const userBal = memberBalances[profile?.id || '']?.balance || 0;
    
    if (Math.abs(userBal) > 0.02) {
      toast.error('You cannot leave the group until your balance is fully settled!');
      return;
    }

    if (!window.confirm('Are you sure you want to leave this group?')) return;

    try {
      await leaveGroup(groupId);
      toast.success('You have left the group.');
      navigate('/groups');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to leave group.');
    }
  };

  // Settlement Form Submit
  const handleSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId || !settlePayerId || !settlePayeeId || !settleAmount) return;

    const amount = parseFloat(settleAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }

    setSettleLoading(true);
    try {
      await createSettlement({
        group_id: groupId,
        payer_id: settlePayerId,
        payee_id: settlePayeeId,
        amount
      });

      toast.success('Settlement transaction recorded!');
      setSettleModalOpen(false);
      setSettleAmount('');
      loadGroupDetails();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to record settlement.');
    } finally {
      setSettleLoading(false);
    }
  };

  const openQuickSettle = (transfer: SuggestedTransfer) => {
    setSettlePayerId(transfer.from.id);
    setSettlePayeeId(transfer.to.id);
    setSettleAmount(transfer.amount.toString());
    setSettleModalOpen(true);
  };

  if (loading) {
    return <Loading fullPage message="Syncing group transaction ledgers..." />;
  }

  if (!group) return null;

  const userBalance = memberBalances[profile?.id || '']?.balance || 0;

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-7xl mx-auto w-full text-left">
      {/* Title Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-white/5">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-purple-400">Deep Dive View</span>
          <h2 className="text-2xl font-bold text-white mt-1">Group: {group.name}</h2>
          <div className="flex flex-wrap items-center gap-3 mt-1.5">
            <span className="text-[10px] text-slate-400 bg-white/5 border border-white/8 px-2.5 py-1 rounded-xl flex items-center gap-1.5">
              <span>Group ID: <span className="font-bold text-slate-300 font-mono">{group.id}</span></span>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(group.id);
                  toast.success('Group ID copied to clipboard!');
                }}
                className="text-purple-400 hover:text-purple-300 transition-colors focus:outline-none cursor-pointer"
                title="Copy Group ID"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </span>
          </div>
          <p className="text-slate-400 text-xs mt-2.5 leading-relaxed max-w-xl">
            {group.description || 'No description provided.'}
          </p>
        </div>
        
        {/* Buttons Control Panel */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="glass"
            size="sm"
            onClick={() => setInviteModalOpen(true)}
            icon={<UserPlus className="w-3.5 h-3.5" />}
          >
            Invite Member
          </Button>
          <Button
            variant="glass"
            size="sm"
            onClick={() => setSettleModalOpen(true)}
            icon={<CheckSquare className="w-3.5 h-3.5" />}
          >
            Settle Up
          </Button>
          <Button variant="danger" size="sm" onClick={handleLeaveGroup} icon={<LogOut className="w-3.5 h-3.5" />}>
            Leave Group
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: members list, debt minimizer suggestions */}
        <div className="space-y-6">
          {/* Members list */}
          <GlassCard glowColor="purple" hoverGlow={false}>
            <h3 className="text-sm font-bold text-white tracking-tight mb-4">Group Members</h3>
            <div className="space-y-3">
              {members.map((m) => {
                const bal = memberBalances[m.id]?.balance || 0;
                return (
                  <div key={m.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${getAvatarColor(m.name)} flex items-center justify-center text-white text-[10px] font-bold`}>
                        {getInitials(m.name)}
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-white block">{m.name}</span>
                        <span className="text-[9px] text-slate-500">{m.share_id}</span>
                      </div>
                    </div>
                    <span className={`text-xs font-bold ${bal > 0 ? 'text-emerald-400' : bal < 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                      {bal > 0 ? `+${formatCurrency(bal)}` : bal < 0 ? formatCurrency(bal) : '0.00'}
                    </span>
                  </div>
                );
              })}
            </div>
          </GlassCard>

          {/* Suggested settlements balancing */}
          <GlassCard glowColor="emerald" hoverGlow={false}>
            <h3 className="text-sm font-bold text-white tracking-tight mb-2">Suggested Settlements</h3>
            <p className="text-[10px] text-slate-500 mb-4 leading-relaxed">
              Greedy balances minimization engine calculates fewer money transfers to resolve group debts.
            </p>

            <div className="space-y-3">
              {suggestedTransfers.length > 0 ? (
                suggestedTransfers.map((t, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between"
                  >
                    <div className="flex flex-col gap-1 text-[11px]">
                      <span className="text-rose-300 font-semibold">{t.from.name}</span>
                      <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-medium my-0.5">
                        <span>owes</span>
                        <ArrowRight className="w-3 h-3" />
                      </div>
                      <span className="text-emerald-400 font-semibold">{t.to.name}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-white block">{formatCurrency(t.amount)}</span>
                      {(t.from.id === profile?.id || t.to.id === profile?.id) && (
                        <button
                          onClick={() => openQuickSettle(t)}
                          className="text-[9px] text-purple-400 hover:text-purple-300 hover:underline mt-1 font-semibold"
                        >
                          Transact now
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 text-center py-4">All debts are cleared! 🎉</p>
              )}
            </div>
          </GlassCard>
        </div>

        {/* Right Columns: Shared Expenses & Settlements Histories */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-white tracking-tight">Group Expense Records</h3>
            {userBalance !== 0 && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                userBalance > 0
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}>
                {userBalance > 0 ? `You are owed ${formatCurrency(userBalance)}` : `You owe ${formatCurrency(Math.abs(userBalance))}`}
              </span>
            )}
          </div>

          <div className="space-y-4">
            {expenses.length > 0 ? (
              expenses.map((exp) => {
                const isPayer = exp.paid_by === profile?.id;
                const userPart = exp.participants?.find((p) => p.user_id === profile?.id);
                const userShare = userPart?.amount || 0;

                return (
                  <div
                    key={exp.id}
                    className="glass-card p-5 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-white/5 hover:bg-white/5 transition-all"
                  >
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="w-10 h-10 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      
                      <div className="min-w-0">
                        <h5 className="text-sm font-bold text-white leading-tight truncate">{exp.title}</h5>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          Paid by <span className="text-slate-200 font-semibold">{isPayer ? 'You' : exp.payer?.name}</span> • Split type: <span className="capitalize">{exp.split_type}</span>
                        </p>
                        
                        {/* Display notes or linked attachment receipt URL */}
                        <div className="flex flex-wrap items-center gap-3 mt-2">
                          {exp.notes && (
                            <span className="text-[10px] text-slate-500 italic max-w-sm truncate">
                              "{exp.notes}"
                            </span>
                          )}
                          {exp.receipt_url && (
                            <a
                              href={exp.receipt_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 font-semibold hover:underline"
                            >
                              <FileImage className="w-3 h-3" /> View Receipt
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right ml-14 md:ml-0 flex-shrink-0">
                      <span className="text-sm font-bold text-white block">{formatCurrency(exp.amount)}</span>
                      <span className="text-[9px] text-slate-500 block mt-0.5">{formatRelativeTime(exp.created_at)}</span>
                      
                      <div className="mt-2">
                        {isPayer ? (
                          <span className="text-[9px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            You get back {formatCurrency(exp.amount - userShare)}
                          </span>
                        ) : userShare > 0 ? (
                          <span className="text-[9px] text-rose-400 font-semibold bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                            You owe {formatCurrency(userShare)}
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-400 font-medium bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                            Not involved
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="glass-card py-16 text-center text-xs text-slate-500 border-dashed border-white/10">
                No expenses in this group yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invite Member Modal */}
      <Modal isOpen={inviteModalOpen} onClose={() => setInviteModalOpen(false)} title="Invite Member to Group" size="sm">
        <form onSubmit={handleInviteSubmit} className="space-y-4 text-left">
          <Input
            label="User Share ID"
            placeholder="e.g. ABHI7281, USR4832"
            value={inviteShareId}
            onChange={e => setInviteShareId(e.target.value)}
            required
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
            <Button variant="ghost" onClick={() => setInviteModalOpen(false)} type="button">
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={actionLoading}>
              Invite Member
            </Button>
          </div>
        </form>
      </Modal>

      {/* Settle Up Modal */}
      <Modal isOpen={settleModalOpen} onClose={() => setSettleModalOpen(false)} title="Record Group Settlement" size="md">
        <form onSubmit={handleSettleSubmit} className="space-y-4 text-left">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Payer (Who Paid)</label>
              <select
                value={settlePayerId}
                onChange={e => setSettlePayerId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl glass-input text-white text-sm focus:border-purple-500/50 focus:outline-none"
                required
              >
                <option value="" disabled>-- Select Payer --</option>
                {members.map(m => (
                  <option key={m.id} value={m.id} className="bg-slate-900 text-white">{m.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Payee (Who Received)</label>
              <select
                value={settlePayeeId}
                onChange={e => setSettlePayeeId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl glass-input text-white text-sm focus:border-purple-500/50 focus:outline-none"
                required
              >
                <option value="" disabled>-- Select Payee --</option>
                {members.map(m => (
                  <option key={m.id} value={m.id} className="bg-slate-900 text-white">{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          <Input
            label="Amount ($)"
            type="number"
            step="0.01"
            min="0.01"
            value={settleAmount}
            onChange={e => setSettleAmount(e.target.value)}
            required
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
            <Button variant="ghost" onClick={() => setSettleModalOpen(false)} type="button">
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={settleLoading}>
              Record Settlement
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
export default GroupDetails;
