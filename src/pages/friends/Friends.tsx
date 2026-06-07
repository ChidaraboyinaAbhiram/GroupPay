import { useEffect, useState } from 'react';
import { Search, UserPlus, Trash2, CheckSquare, Loader2, AlertCircle, Copy } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ui/Toast';
import { useRealtime } from '../../hooks/useRealtime';
import { supabase } from '../../services/supabase';
import { Loading } from '../../components/ui/Loading';
import { GlassCard } from '../../components/ui/GlassCard';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { formatCurrency, getInitials, getAvatarColor } from '../../utils/helpers';
import {
  getFriends,
  sendFriendRequest,
  removeFriend,
  getAllExpensesAndSettlements,
  createSettlement
} from '../../services/api';
import { Friend, Profile, Expense, Settlement } from '../../types';

export function Friends() {
  const { profile } = useAuth();
  const toast = useToast();

  // Loading States
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Connection data
  const [friendsList, setFriendsList] = useState<Friend[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedUser, setSearchedUser] = useState<Profile | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Financial LEDGER with each friend
  const [friendBalances, setFriendBalances] = useState<{ [friendId: string]: number }>({});

  // Quick Settlement Modal State
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [targetFriend, setTargetFriend] = useState<Profile | null>(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [isPayer, setIsPayer] = useState(true); // true = current user paid friend, false = friend paid current user
  const [settleLoading, setSettleLoading] = useState(false);

  // Fetch initial data
  const loadFriendsData = async () => {
    if (!profile) return;
    try {
      const [fList, { expenses, settlements }] = await Promise.all([
        getFriends(),
        getAllExpensesAndSettlements()
      ]);

      setFriendsList(fList);
      calculateBilateralBalances(fList, expenses, settlements, profile.id);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load friend connections.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFriendsData();
  }, [profile]);

  // Realtime listeners
  useRealtime('friends', () => {
    loadFriendsData();
  });
  useRealtime('expenses', () => {
    loadFriendsData();
  });
  useRealtime('settlements', () => {
    loadFriendsData();
  });

  const calculateBilateralBalances = (
    fList: Friend[],
    expList: Expense[],
    setList: Settlement[],
    currentUserId: string
  ) => {
    const balances: { [friendId: string]: number } = {};
    
    // Initialize
    fList.forEach(f => {
      const fId = f.friend_profile?.id;
      if (fId) balances[fId] = 0;
    });

    // Process expenses
    expList.forEach(exp => {
      const payerId = exp.paid_by;
      const isUserPayer = payerId === currentUserId;

      exp.participants?.forEach(part => {
        const partId = part.user_id;

        if (isUserPayer && partId !== currentUserId && balances[partId] !== undefined) {
          balances[partId] += part.amount;
        } else if (partId === currentUserId && payerId !== currentUserId && balances[payerId] !== undefined) {
          balances[payerId] -= part.amount;
        }
      });
    });

    // Process settlements
    setList.forEach(settle => {
      const payerId = settle.payer_id;
      const payeeId = settle.payee_id;

      if (payerId === currentUserId && balances[payeeId] !== undefined) {
        balances[payeeId] += settle.amount;
      } else if (payeeId === currentUserId && balances[payerId] !== undefined) {
        balances[payerId] -= settle.amount;
      }
    });

    // Clean rounding discrepancies
    Object.keys(balances).forEach(id => {
      balances[id] = Math.round(balances[id] * 100) / 100;
    });

    setFriendBalances(balances);
  };

  // Search User by Share ID
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setHasSearched(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('share_id', searchQuery.trim().toUpperCase())
        .maybeSingle();

      if (error) throw error;
      setSearchedUser(data);
    } catch (err: any) {
      console.error(err);
      toast.error('Error searching profiles.');
    } finally {
      setSearching(false);
    }
  };

  // Send request / Add Friend
  const handleAddFriend = async (friendId: string) => {
    if (!profile) return;
    setActionLoading(friendId);
    try {
      // Direct friendship insert
      const { error } = await supabase
        .from('friends')
        .insert({
          user_id: profile.id,
          friend_id: friendId,
          status: 'accepted'
        });

      if (error) {
        if (error.code === '23505') throw new Error('You are already friends.');
        throw error;
      }

      toast.success('Friend connection added successfully!');
      setSearchQuery('');
      setSearchedUser(null);
      setHasSearched(false);
      loadFriendsData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to add friend.');
    } finally {
      setActionLoading(null);
    }
  };

  // Delete friend connection
  const handleRemoveFriend = async (friendshipId: string) => {
    if (!window.confirm('Are you sure you want to remove this friend? All balance histories will remain, but the link will disconnect.')) return;
    try {
      await removeFriend(friendshipId);
      toast.success('Friend connection removed.');
      loadFriendsData();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to disconnect friend.');
    }
  };

  // Settle up handler
  const openSettleModal = (friend: Profile) => {
    setTargetFriend(friend);
    const bal = friendBalances[friend.id] || 0;
    setSettleAmount(Math.abs(bal).toString());
    setIsPayer(bal < 0); // If bal is negative, current user owes friend, so current user is payer
    setSettleModalOpen(true);
  };

  const handleSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !targetFriend || !settleAmount) return;

    const amount = parseFloat(settleAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }

    setSettleLoading(true);
    try {
      await createSettlement({
        group_id: null,
        payer_id: isPayer ? profile.id : targetFriend.id,
        payee_id: isPayer ? targetFriend.id : profile.id,
        amount
      });

      toast.success('Settlement transaction recorded successfully!');
      setSettleModalOpen(false);
      setSettleAmount('');
      loadFriendsData();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to record settlement.');
    } finally {
      setSettleLoading(false);
    }
  };

  if (loading) {
    return <Loading fullPage message="Mapping friendships & balances..." />;
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-5xl mx-auto w-full text-left">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Friends Directory</h2>
          <p className="text-slate-400 text-xs mt-0.5">
            Add friends using their Share ID and track individual debt balances.
          </p>
        </div>
        {profile && (
          <div className="bg-white/5 border border-white/8 px-4 py-2 rounded-2xl flex items-center gap-3 text-xs animate-fade-in">
            <span className="text-slate-400 font-semibold">
              Your Share ID: <span className="font-bold text-purple-400 font-mono">{profile.share_id}</span>
            </span>
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(profile.share_id);
                toast.success('Your Share ID copied to clipboard!');
              }}
              className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl border border-white/5 transition-all cursor-pointer focus:outline-none"
              title="Copy Share ID"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Add Friend Form */}
      <GlassCard glowColor="purple" hoverGlow={false}>
        <form onSubmit={handleSearch} className="space-y-4">
          <h3 className="text-sm font-bold text-white tracking-tight">Add Friend Connection</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Search by unique Share ID (e.g. ABHI7281, USR4832)"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                icon={<Search className="w-4 h-4 text-slate-500" />}
                required
              />
            </div>
            <Button type="submit" variant="primary" loading={searching} className="sm:w-auto w-full">
              Search Profile
            </Button>
          </div>
        </form>

        {/* Search Result display */}
        {hasSearched && (
          <div className="mt-4 pt-4 border-t border-white/5 animate-fade-in">
            {searchedUser ? (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${getAvatarColor(searchedUser.name)} flex items-center justify-center text-white text-xs font-bold`}>
                    {getInitials(searchedUser.name)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{searchedUser.name}</h4>
                    <p className="text-[10px] text-slate-400">Share ID: {searchedUser.share_id}</p>
                  </div>
                </div>
                {searchedUser.id === profile?.id ? (
                  <span className="text-[10px] text-slate-500 font-semibold bg-white/5 px-2.5 py-1 rounded-full">
                    You (Self)
                  </span>
                ) : friendsList.some(f => f.friend_profile?.id === searchedUser.id) ? (
                  <span className="text-[10px] text-purple-400 font-semibold bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">
                    Already friends
                  </span>
                ) : (
                  <Button
                    variant="glass"
                    size="sm"
                    loading={actionLoading === searchedUser.id}
                    onClick={() => handleAddFriend(searchedUser.id)}
                    icon={<UserPlus className="w-3.5 h-3.5" />}
                  >
                    Add Friend
                  </Button>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-rose-500/5 border border-rose-500/10 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>No user profile found matching this Share ID.</span>
              </div>
            )}
          </div>
        )}
      </GlassCard>

      {/* Friends List */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white tracking-tight">Active Friends</h3>
        
        {friendsList.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {friendsList.map((f) => {
              const friend = f.friend_profile;
              if (!friend) return null;
              const balance = friendBalances[friend.id] || 0;

              return (
                <GlassCard key={f.id} glowColor={balance > 0 ? 'emerald' : balance < 0 ? 'rose' : 'none'} className="flex flex-col justify-between h-48">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {friend.avatar_url ? (
                        <img src={friend.avatar_url} alt="" className="w-11 h-11 rounded-2xl object-cover" />
                      ) : (
                        <div className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${getAvatarColor(friend.name)} flex items-center justify-center text-white text-xs font-bold`}>
                          {getInitials(friend.name)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white truncate">{friend.name}</h4>
                        <p className="text-[10px] text-slate-400 truncate">{friend.email}</p>
                        <span className="text-[9px] font-semibold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20 block mt-1 w-max">
                          {friend.share_id}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoveFriend(f.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/5 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="pt-3 border-t border-white/5 mt-4 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Balance</span>
                      <span className={`text-xs font-bold ${balance > 0 ? 'text-emerald-400' : balance < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                        {balance > 0 ? `Owes you ${formatCurrency(balance)}` : balance < 0 ? `You owe ${formatCurrency(Math.abs(balance))}` : 'Settle Clear'}
                      </span>
                    </div>

                    {balance !== 0 && (
                      <button
                        onClick={() => openSettleModal(friend)}
                        className="px-2.5 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold border border-emerald-500/20 flex items-center gap-1 transition-all"
                      >
                        <CheckSquare className="w-3 h-3" /> Settle Up
                      </button>
                    )}
                  </div>
                </GlassCard>
              );
            })}
          </div>
        ) : (
          <div className="glass-card py-16 text-center text-xs text-slate-500 border-dashed border-white/10">
            No friends connected yet. Search by Share ID above to add!
          </div>
        )}
      </div>

      {/* Settlement Modal */}
      {targetFriend && (
        <Modal
          isOpen={settleModalOpen}
          onClose={() => setSettleModalOpen(false)}
          title={`Settle Up with ${targetFriend.name}`}
          size="sm"
        >
          <form onSubmit={handleSettleSubmit} className="space-y-4 text-left">
            <p className="text-xs text-slate-400">
              Record a payments transfer to resolve your outstanding balance.
            </p>

            <div className="grid grid-cols-2 gap-2 p-1 bg-black/20 rounded-xl border border-white/5 text-center">
              <button
                type="button"
                onClick={() => setIsPayer(true)}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                  isPayer ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                You paid {targetFriend.name}
              </button>
              <button
                type="button"
                onClick={() => setIsPayer(false)}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                  !isPayer ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {targetFriend.name} paid You
              </button>
            </div>

            <Input
              label="Settlement Amount ($)"
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
                Confirm Transaction
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
export default Friends;
