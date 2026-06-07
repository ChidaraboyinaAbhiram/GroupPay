import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  FolderGit2,
  Users,
  PlusCircle,
  UserPlus,
  FolderPlus,
  ArrowRight,
  TrendingUp,
  Clock,
  ChevronRight,
  Pizza,
  Car,
  ShoppingBag,
  Film,
  Coffee,
  DollarSign,
  ClipboardList
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ui/Toast';
import { useRealtime } from '../../hooks/useRealtime';
import { Loading } from '../../components/ui/Loading';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { formatCurrency, getAvatarColor, getInitials, formatRelativeTime } from '../../utils/helpers';
import { getAllExpensesAndSettlements, getGroups, getFriends, getActivityFeed } from '../../services/api';
import { Expense, Settlement, Group, Friend, Profile, Activity } from '../../types';
import { CardSkeleton, ChartSkeleton } from '../../components/ui/Skeleton';

interface BilateralLedger {
  [userId: string]: {
    profile: Profile;
    balance: number;
  };
}

export function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  // Ledger Aggregates
  const [netBalance, setNetBalance] = useState(0);
  const [totalOwed, setTotalOwed] = useState(0);
  const [totalOwe, setTotalOwe] = useState(0);
  const [ledger, setLedger] = useState<BilateralLedger>({});

  // Group aggregates for Groups Overview
  const [groupPools, setGroupPools] = useState<{ [groupId: string]: number }>({});
  const [groupBalances, setGroupBalances] = useState<{ [groupId: string]: number }>({});

  const loadDashboardData = useCallback(async () => {
    if (!profile) return;
    try {
      const [{ expenses: expList, settlements: setList }, gList, fList, actList] = await Promise.all([
        getAllExpensesAndSettlements(),
        getGroups(),
        getFriends(),
        getActivityFeed()
      ]);

      setExpenses(expList);
      setSettlements(setList);
      setGroups(gList);
      setFriends(fList);
      setActivities(actList.slice(0, 5)); // show latest 5

      calculateLedgerBalances(expList, setList, profile.id);
      calculateGroupAggregates(gList, expList, setList, profile.id);
    } catch (err) {
      console.error(err);
      toast.error('Failed to sync dashboard assets.');
    } finally {
      setLoading(false);
    }
  }, [profile, toast]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Realtime subscription hooks
  useRealtime('expenses', () => loadDashboardData());
  useRealtime('expense_participants', () => loadDashboardData());
  useRealtime('settlements', () => loadDashboardData());
  useRealtime('friends', () => loadDashboardData());
  useRealtime('group_members', () => loadDashboardData());

  const calculateLedgerBalances = (
    expList: Expense[],
    setList: Settlement[],
    currentUserId: string
  ) => {
    const tempLedger: BilateralLedger = {};

    expList.forEach((exp) => {
      const payerId = exp.paid_by;
      const isUserPayer = payerId === currentUserId;

      exp.participants?.forEach((part) => {
        const partId = part.user_id;
        if (partId === currentUserId && isUserPayer) return;

        if (isUserPayer) {
          if (part.profile) {
            if (!tempLedger[partId]) tempLedger[partId] = { profile: part.profile, balance: 0 };
            tempLedger[partId].balance += part.amount;
          }
        } else if (partId === currentUserId) {
          if (exp.payer) {
            if (!tempLedger[payerId]) tempLedger[payerId] = { profile: exp.payer, balance: 0 };
            tempLedger[payerId].balance -= part.amount;
          }
        }
      });
    });

    setList.forEach((settle) => {
      const payerId = settle.payer_id;
      const payeeId = settle.payee_id;

      if (payerId === currentUserId) {
        if (settle.payee) {
          if (!tempLedger[payeeId]) tempLedger[payeeId] = { profile: settle.payee, balance: 0 };
          tempLedger[payeeId].balance += settle.amount;
        }
      } else if (payeeId === currentUserId) {
        if (settle.payer) {
          if (!tempLedger[payerId]) tempLedger[payerId] = { profile: settle.payer, balance: 0 };
          tempLedger[payerId].balance -= settle.amount;
        }
      }
    });

    let owed = 0;
    let owe = 0;

    Object.keys(tempLedger).forEach((id) => {
      const rawBal = tempLedger[id].balance;
      const roundedBal = Math.round(rawBal * 100) / 100;
      tempLedger[id].balance = roundedBal;

      if (Math.abs(roundedBal) < 0.01) {
        delete tempLedger[id];
        return;
      }

      if (roundedBal > 0) {
        owed += roundedBal;
      } else {
        owe += Math.abs(roundedBal);
      }
    });

    setLedger(tempLedger);
    setTotalOwed(owed);
    setTotalOwe(owe);
    setNetBalance(owed - owe);
  };

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

    expList.forEach(exp => {
      if (exp.group_id && pools[exp.group_id] !== undefined) {
        pools[exp.group_id] += exp.amount;
      }
    });

    expList.forEach(exp => {
      if (!exp.group_id || balances[exp.group_id] === undefined) return;

      const payerId = exp.paid_by;
      const isUserPayer = payerId === currentUserId;

      exp.participants?.forEach(part => {
        const partId = part.user_id;

        if (isUserPayer && partId !== currentUserId) {
          balances[exp.group_id!] += part.amount;
        } else if (!isUserPayer && partId === currentUserId) {
          balances[exp.group_id!] -= part.amount;
        }
      });
    });

    setList.forEach(settle => {
      if (!settle.group_id || balances[settle.group_id] === undefined) return;

      const payerId = settle.payer_id;
      const payeeId = settle.payee_id;

      if (payerId === currentUserId) {
        balances[settle.group_id] += settle.amount;
      } else if (payeeId === currentUserId) {
        balances[settle.group_id] -= settle.amount;
      }
    });

    gList.forEach(g => {
      pools[g.id] = Math.round(pools[g.id] * 100) / 100;
      balances[g.id] = Math.round(balances[g.id] * 100) / 100;
    });

    setGroupPools(pools);
    setGroupBalances(balances);
  };

  const getCategory = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes('food') || t.includes('pizza') || t.includes('sushi') || t.includes('dinner') || t.includes('lunch') || t.includes('restaurant')) {
      return { icon: '🍕', name: 'Food', color: '#f59e0b', component: <Pizza className="w-5 h-5 text-amber-400" /> };
    }
    if (t.includes('taxi') || t.includes('uber') || t.includes('travel') || t.includes('flight') || t.includes('trip') || t.includes('car')) {
      return { icon: '🚕', name: 'Travel', color: '#3b82f6', component: <Car className="w-5 h-5 text-blue-400" /> };
    }
    if (t.includes('shopping') || t.includes('groceries') || t.includes('market') || t.includes('amazon')) {
      return { icon: '🛒', name: 'Shopping', color: '#10b981', component: <ShoppingBag className="w-5 h-5 text-emerald-400" /> };
    }
    if (t.includes('movie') || t.includes('show') || t.includes('entertainment') || t.includes('netflix') || t.includes('concert')) {
      return { icon: '🎬', name: 'Entertainment', color: '#ec4899', component: <Film className="w-5 h-5 text-pink-400" /> };
    }
    if (t.includes('coffee') || t.includes('espresso') || t.includes('starbucks') || t.includes('tea') || t.includes('cafe')) {
      return { icon: '☕', name: 'Coffee', color: '#8b5cf6', component: <Coffee className="w-5 h-5 text-purple-400" /> };
    }
    return { icon: '💰', name: 'Other', color: '#64748b', component: <DollarSign className="w-5 h-5 text-slate-400" /> };
  };

  const getRelativeDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays === 2) return '2 days ago';
    return `${diffDays} days ago`;
  };

  const getSpendingChartData = () => {
    if (expenses.length === 0) {
      return [
        { name: 'Jan', amount: 120 },
        { name: 'Feb', amount: 280 },
        { name: 'Mar', amount: 200 },
        { name: 'Apr', amount: 550 },
        { name: 'May', amount: 480 },
        { name: 'Jun', amount: 920 }
      ];
    }

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dataMap: { [key: string]: number } = {};

    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      dataMap[months[d.getMonth()]] = 50;
    }

    expenses.forEach(e => {
      const d = new Date(e.created_at);
      const mName = months[d.getMonth()];
      if (dataMap[mName] !== undefined) {
        dataMap[mName] += Number(e.amount);
      }
    });

    return Object.keys(dataMap).map(m => ({
      name: m,
      amount: Math.round(dataMap[m])
    }));
  };

  const getDonutChartData = () => {
    const catMap: { [key: string]: number } = {
      Food: 0,
      Travel: 0,
      Shopping: 0,
      Entertainment: 0,
      Coffee: 0,
      Other: 0
    };

    expenses.forEach(e => {
      const cat = getCategory(e.title);
      const key = cat.name in catMap ? cat.name : 'Other';
      catMap[key] += Number(e.amount);
    });

    const colorsMap: { [key: string]: string } = {
      Food: '#f59e0b',
      Travel: '#3b82f6',
      Shopping: '#10b981',
      Entertainment: '#ec4899',
      Coffee: '#8b5cf6',
      Other: '#64748b'
    };

    return Object.keys(catMap)
      .map(key => ({
        name: key,
        value: Math.round(catMap[key]),
        color: colorsMap[key]
      }))
      .filter(item => item.value > 0);
  };

  const getWeeklyTrendData = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dataMap: { [key: string]: number } = {};

    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      dataMap[days[d.getDay()]] = 0;
    }

    expenses.forEach(e => {
      const d = new Date(e.created_at);
      const dName = days[d.getDay()];
      if (dataMap[dName] !== undefined) {
        dataMap[dName] += Number(e.amount);
      }
    });

    return Object.keys(dataMap).map(d => ({
      name: d,
      amount: Math.round(dataMap[d])
    }));
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto w-full text-left">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2"><CardSkeleton /></div>
          <div><CardSkeleton /></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <CardSkeleton /><CardSkeleton /><CardSkeleton /><CardSkeleton />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2"><ChartSkeleton /></div>
          <div><ChartSkeleton /></div>
        </div>
      </div>
    );
  }

  const spendingData = getSpendingChartData();
  const categoryData = getDonutChartData();
  const weeklyData = getWeeklyTrendData();
  const recentExpenses = expenses.slice(0, 5);
  const outstandingRelations = Object.values(ledger);

  const sparklineData = [
    { value: 100 },
    { value: 130 },
    { value: 120 },
    { value: 180 },
    { value: 150 },
    { value: 240 },
    { value: netBalance >= 0 ? 300 : 100 }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto w-full text-left"
    >
      {/* 1. HERO SECTION & QUICK ACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        
        {/* Large Hero Card (Net Balance) */}
        <div className="lg:col-span-2 hero-gradient-border p-8 flex flex-col justify-between overflow-hidden relative shadow-2xl min-h-64 group hover:scale-[1.005] transition-transform duration-300">
          {/* Ambient sparkline chart in background */}
          <div className="absolute inset-0 z-0 opacity-15 pointer-events-none -bottom-8">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData}>
                <defs>
                  <linearGradient id="heroSpark" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={netBalance >= 0 ? '#10b981' : '#f43f5e'} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={netBalance >= 0 ? '#10b981' : '#f43f5e'} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={netBalance >= 0 ? '#10b981' : '#f43f5e'}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#heroSpark)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="relative z-10 flex justify-between items-start">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Global Balance Position</span>
              <h2 className="text-4xl font-extrabold text-white tracking-tight mt-2">
                {netBalance >= 0 ? '+' : ''}
                {formatCurrency(netBalance)}
              </h2>
            </div>
            
            <div className={`px-3.5 py-1.5 rounded-full border text-[10px] font-semibold flex items-center gap-1.5 ${
              netBalance >= 0 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${netBalance >= 0 ? 'bg-emerald-400' : 'bg-rose-400'} animate-pulse`} />
              {netBalance >= 0 ? 'Net Position Clear' : 'Debts Pending Settle'}
            </div>
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-6 border-t border-white/5 mt-8">
            <p className="text-slate-400 text-xs leading-relaxed max-w-md">
              Your overall net balance is compiled live from all active groups and direct friend sharing databases.
            </p>
            <span className="text-[10px] text-purple-400 font-bold tracking-wider font-mono bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-lg">
              REALTIME SECURITY ACTIVE
            </span>
          </div>
        </div>

        {/* Quick Actions Card */}
        <GlassCard glowColor="purple" hoverGlow={false} className="flex flex-col justify-between p-8">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Quick Console</h3>
            <p className="text-slate-500 text-[10px] leading-normal mb-6">Perform actions instantly across your workspace.</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => navigate('?action=add-expense')}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white font-bold rounded-2xl border border-white/10 flex items-center justify-between text-xs transition-all duration-300 shadow-lg shadow-purple-900/10 active:scale-[0.98]"
            >
              <span className="flex items-center gap-2">
                <PlusCircle className="w-4.5 h-4.5" /> Record Expense
              </span>
              <ChevronRight className="w-3.5 h-3.5 opacity-70" />
            </button>

            <button
              onClick={() => navigate('/friends')}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-2xl border border-white/10 flex items-center justify-between text-xs transition-all duration-300 shadow-lg shadow-blue-900/10 active:scale-[0.98]"
            >
              <span className="flex items-center gap-2">
                <UserPlus className="w-4.5 h-4.5" /> Invite Friend
              </span>
              <ChevronRight className="w-3.5 h-3.5 opacity-70" />
            </button>

            <button
              onClick={() => navigate('/groups')}
              className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-2xl border border-white/10 flex items-center justify-between text-xs transition-all duration-300 shadow-lg shadow-indigo-900/10 active:scale-[0.98]"
            >
              <span className="flex items-center gap-2">
                <FolderPlus className="w-4.5 h-4.5" /> Provision Group
              </span>
              <ChevronRight className="w-3.5 h-3.5 opacity-70" />
            </button>
          </div>
        </GlassCard>
      </div>

      {/* 2. STATS CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* You Are Owed */}
        <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
          <GlassCard glowColor="emerald" hoverGlow={false} className="p-6 flex flex-col justify-between h-36">
            <div className="flex justify-between items-start">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">You are owed</p>
              <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-extrabold text-emerald-400">{formatCurrency(totalOwed)}</h3>
              <p className="text-[9px] text-slate-500 mt-1">Direct friendships ledger sum</p>
            </div>
          </GlassCard>
        </motion.div>

        {/* You Owe */}
        <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
          <GlassCard glowColor="rose" hoverGlow={false} className="p-6 flex flex-col justify-between h-36">
            <div className="flex justify-between items-start">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">You owe</p>
              <div className="p-2 bg-rose-500/10 rounded-xl border border-rose-500/20 text-rose-400">
                <ArrowDownLeft className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-extrabold text-rose-400">{formatCurrency(totalOwe)}</h3>
              <p className="text-[9px] text-slate-500 mt-1">Pending payments unresolved</p>
            </div>
          </GlassCard>
        </motion.div>

        {/* Active Groups */}
        <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
          <GlassCard glowColor="blue" hoverGlow={false} className="p-6 flex flex-col justify-between h-36">
            <div className="flex justify-between items-start">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active groups</p>
              <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400">
                <FolderGit2 className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-extrabold text-white">{groups.length} Hubs</h3>
              <p className="text-[9px] text-slate-500 mt-1">Managed shared group pools</p>
            </div>
          </GlassCard>
        </motion.div>

        {/* Friends */}
        <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
          <GlassCard glowColor="purple" hoverGlow={false} className="p-6 flex flex-col justify-between h-36">
            <div className="flex justify-between items-start">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Friends</p>
              <div className="p-2 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-400">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-extrabold text-white">{friends.length} Peers</h3>
              <p className="text-[9px] text-slate-500 mt-1">Connected directories</p>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* 3. CHARTS DATA ANALYTICS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Spending Area Chart */}
        <GlassCard glowColor="none" hoverGlow={false} className="lg:col-span-1">
          <div className="mb-6">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Monthly Spending Trend</h3>
            <p className="text-[9px] text-slate-500">Overview of total expense logs per month</p>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spendingData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#475569" fontSize={9} tickLine={false} />
                <YAxis stroke="#475569" fontSize={9} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(10, 15, 28, 0.95)',
                    borderColor: 'rgba(255,255,255,0.08)',
                    borderRadius: '16px',
                    fontSize: '10px'
                  }}
                />
                <Area type="monotone" dataKey="amount" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorAmt)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Weekly Trend Bar Chart */}
        <GlassCard glowColor="none" hoverGlow={false} className="lg:col-span-1">
          <div className="mb-6">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Weekly Activity Trend</h3>
            <p className="text-[9px] text-slate-500">Total volume recorded over past 7 days</p>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#475569" fontSize={9} tickLine={false} />
                <YAxis stroke="#475569" fontSize={9} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(10, 15, 28, 0.95)',
                    borderColor: 'rgba(255,255,255,0.08)',
                    borderRadius: '16px',
                    fontSize: '10px'
                  }}
                />
                <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Category distribution donut chart */}
        <GlassCard glowColor="none" hoverGlow={false} className="lg:col-span-1">
          <div className="mb-6">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Category breakdown</h3>
            <p className="text-[9px] text-slate-500">Expenses split by category filters</p>
          </div>
          {categoryData.length > 0 ? (
            <div className="flex flex-col items-center justify-between h-56 gap-2">
              <div className="h-36 w-full relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={60}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(10, 15, 28, 0.95)',
                        borderColor: 'rgba(255,255,255,0.08)',
                        borderRadius: '16px',
                        fontSize: '10px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legends */}
              <div className="flex flex-wrap justify-center gap-x-2 gap-y-1 text-[9px]">
                {categoryData.map((item, idx) => (
                  <span key={idx} className="flex items-center gap-1 text-slate-400 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.name} (${item.value})
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center text-xs text-slate-500">
              No categories recorded.
            </div>
          )}
        </GlassCard>
      </div>

      {/* 4. TWO-COLUMN DETAILS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column (col-span-2): Recent activity stream + Group Overview */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Recent Activity Stream */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-white tracking-tight">Recent Activity Stream</h3>
              <button
                onClick={() => navigate('/activity')}
                className="text-[10px] text-purple-400 font-bold hover:underline"
              >
                View timeline
              </button>
            </div>

            <div className="space-y-3">
              {recentExpenses.length > 0 ? (
                recentExpenses.map((exp) => {
                  const cat = getCategory(exp.title);
                  const isPayer = exp.paid_by === profile?.id;
                  const userPart = exp.participants?.find((p) => p.user_id === profile?.id);
                  const userShare = userPart?.amount || 0;

                  return (
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      key={exp.id}
                      className="glass-card p-4.5 rounded-2xl flex items-center justify-between gap-4 border-white/5 hover:bg-white/5 hover:border-white/10 transition-all duration-300 cursor-pointer"
                      onClick={() => navigate(`/groups/${exp.group_id || ''}`)}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        {/* Emoji Icon Badge */}
                        <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center text-xl flex-shrink-0">
                          {cat.component}
                        </div>

                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white truncate leading-snug">{exp.title}</h4>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] text-slate-400 mt-1 font-semibold">
                            <span className="text-slate-300">{cat.name}</span>
                            <span>•</span>
                            <span>
                              Paid by <span className="text-white">{isPayer ? 'You' : exp.payer?.name}</span>
                            </span>
                            <span>•</span>
                            <span>{getRelativeDate(exp.created_at)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span className="text-xs font-bold text-white block">{formatCurrency(exp.amount)}</span>
                        
                        <div className="mt-1">
                          {isPayer ? (
                            <span className="text-[8px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              Owed {formatCurrency(exp.amount - userShare)}
                            </span>
                          ) : userShare > 0 ? (
                            <span className="text-[8px] text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                              You owe {formatCurrency(userShare)}
                            </span>
                          ) : (
                            <span className="text-[8px] text-slate-400 font-bold bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                              Excluded
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="glass-card py-16 text-center text-xs text-slate-500 border-dashed border-white/10 rounded-3xl">
                  No recent transactions recorded.
                </div>
              )}
            </div>
          </div>

          {/* Groups Overview */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-white tracking-tight">Active Group Portfolios</h3>
              <button
                onClick={() => navigate('/groups')}
                className="text-[10px] text-purple-400 font-bold hover:underline"
              >
                Provision Hubs
              </button>
            </div>

            {groups.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {groups.slice(0, 4).map((g) => {
                  const pool = groupPools[g.id] || 0;
                  const balance = groupBalances[g.id] || 0;
                  const members = g.members || [];

                  return (
                    <motion.div
                      whileHover={{ scale: 1.02, y: -2 }}
                      key={g.id}
                      className="glass-card p-5 rounded-3xl flex flex-col justify-between h-40 cursor-pointer border-white/8 hover:border-white/12 transition-all duration-300"
                      onClick={() => navigate(`/groups/${g.id}`)}
                    >
                      <div>
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-white text-sm truncate max-w-[120px]">{g.name}</h4>
                          <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full border ${
                            balance > 0 
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                              : balance < 0 
                              ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                              : 'bg-white/5 border-white/10 text-slate-400'
                          }`}>
                            {balance > 0 ? 'Collect' : balance < 0 ? 'Settle' : 'Settled'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 font-medium">
                          Total pool: <span className="text-white font-semibold">{formatCurrency(pool)}</span>
                        </p>
                      </div>

                      <div className="flex justify-between items-center pt-3 border-t border-white/5 mt-3">
                        <div className="flex -space-x-1.5 overflow-hidden">
                          {members.slice(0, 3).map((m) => (
                            <div
                              key={m.id}
                              className={`h-5.5 w-5.5 rounded-full ring-2 ring-slate-950 bg-gradient-to-tr ${getAvatarColor(m.name)} flex items-center justify-center text-white text-[7px] font-bold`}
                            >
                              {getInitials(m.name)}
                            </div>
                          ))}
                          {members.length > 3 && (
                            <div className="h-5.5 w-5.5 rounded-full ring-2 ring-slate-950 bg-slate-800 flex items-center justify-center text-white text-[7px] font-bold">
                              +{members.length - 3}
                            </div>
                          )}
                        </div>
                        <span className={`text-[10px] font-bold ${balance > 0 ? 'text-emerald-400' : balance < 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                          {balance > 0 ? `+${formatCurrency(balance)}` : balance < 0 ? `-${formatCurrency(Math.abs(balance))}` : 'Clear'}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="glass-card py-16 text-center text-xs text-slate-500 border-dashed border-white/10 rounded-3xl">
                No active group portfolios.
              </div>
            )}
          </div>

        </div>

        {/* Right column (col-span-1): Top Balances + Activity Timeline */}
        <div className="space-y-8">
          
          {/* Top Balances */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white tracking-tight">Top Balances</h3>
            <GlassCard glowColor="none" hoverGlow={false} className="p-5 rounded-3xl border-white/5 space-y-4">
              {outstandingRelations.length > 0 ? (
                outstandingRelations.slice(0, 4).map(({ profile: friend, balance }) => {
                  const maxLim = Math.max(...outstandingRelations.map(r => Math.abs(r.balance)));
                  const pct = maxLim > 0 ? (Math.abs(balance) / maxLim) * 100 : 0;

                  return (
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      key={friend.id}
                      className="p-3 bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 rounded-2xl transition-all duration-300 space-y-3 cursor-pointer"
                      onClick={() => navigate('/friends')}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${getAvatarColor(friend.name)} flex items-center justify-center text-[9px] font-bold text-white`}>
                            {getInitials(friend.name)}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white block leading-tight">{friend.name}</span>
                            <span className="text-[9px] text-slate-500 font-semibold">{friend.share_id}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs font-bold block ${balance > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {formatCurrency(Math.abs(balance))}
                          </span>
                          <span className="text-[8px] text-slate-500 font-bold uppercase">
                            {balance > 0 ? 'Owes you' : 'You owe'}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar (Apple style) */}
                      <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${balance > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                          style={{ width: `${Math.max(5, pct)}%` }}
                        />
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-500 py-10 text-center">Ledgers are balanced! 🎉</p>
              )}
            </GlassCard>
          </div>

          {/* Activity Timeline */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white tracking-tight">Timeline Feed</h3>
            <GlassCard glowColor="none" hoverGlow={false} className="p-5 rounded-3xl border-white/5 space-y-4">
              {activities.length > 0 ? (
                <div className="relative border-l border-white/5 pl-4 ml-2 space-y-4 text-xs">
                  {activities.map((act) => (
                    <div key={act.id} className="relative space-y-1">
                      <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-slate-950 bg-purple-500" />
                      <div className="flex justify-between items-center text-[9px] text-slate-500 font-semibold">
                        <span className="capitalize text-purple-400">{act.title}</span>
                        <span>{formatRelativeTime(act.created_at)}</span>
                      </div>
                      <p className="text-slate-300 text-[10px] leading-relaxed font-medium">
                        {act.description}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-10 text-center">No logs recorded.</p>
              )}
            </GlassCard>
          </div>

        </div>

      </div>
    </motion.div>
  );
}
export default Dashboard;
