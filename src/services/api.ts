import { supabase } from './supabase';
import { Profile, Friend, Group, Expense, ExpenseParticipant, Settlement, Activity } from '../types';

// ==========================================
// PROFILES API
// ==========================================

export async function getCurrentProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Error fetching current profile:', error);
    return null;
  }
  return data;
}

export async function searchProfilesByShareId(shareId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('share_id', shareId.trim().toUpperCase())
    .maybeSingle();

  if (error) {
    console.error('Error searching profiles by share ID:', error);
    return null;
  }
  return data;
}

export async function updateProfile(profileUpdates: Partial<Profile>): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('profiles')
    .update(profileUpdates)
    .eq('id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ==========================================
// FRIENDS API
// ==========================================

export async function getFriends(): Promise<Friend[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Fetch friendships where user is user_id or friend_id
  const { data, error } = await supabase
    .from('friends')
    .select(`
      id,
      user_id,
      friend_id,
      status,
      created_at
    `)
    .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

  if (error) {
    console.error('Error fetching friends:', error);
    return [];
  }

  // Hydrate profiles
  const friendsList: Friend[] = [];
  for (const item of data) {
    const friendId = item.user_id === user.id ? item.friend_id : item.user_id;
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', friendId)
      .single();

    if (profile) {
      friendsList.push({
        ...item,
        friend_profile: profile
      });
    }
  }

  return friendsList;
}

export async function sendFriendRequest(friendShareId: string): Promise<Friend> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const friendProfile = await searchProfilesByShareId(friendShareId);
  if (!friendProfile) throw new Error('User not found with this Share ID');
  if (friendProfile.id === user.id) throw new Error('You cannot add yourself as a friend');

  const { data, error } = await supabase
    .from('friends')
    .insert({
      user_id: user.id,
      friend_id: friendProfile.id,
      status: 'accepted' // Automatically accepted to simplify UI flow
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('You are already friends or have a pending request');
    throw error;
  }

  return {
    ...data,
    friend_profile: friendProfile
  };
}

export async function removeFriend(friendshipId: string): Promise<void> {
  const { error } = await supabase
    .from('friends')
    .delete()
    .eq('id', friendshipId);

  if (error) throw error;
}

// ==========================================
// GROUPS API
// ==========================================

export async function getGroups(): Promise<Group[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Fetch groups where user is a member
  const { data, error } = await supabase
    .from('group_members')
    .select(`
      group_id,
      groups (
        id,
        name,
        description,
        created_by,
        created_at
      )
    `)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error fetching groups:', error);
    return [];
  }

  const groupsList = data
    .map((item: any) => item.groups)
    .filter((g: any) => g !== null) as Group[];

  // Fetch members for each group
  for (const group of groupsList) {
    const members = await getGroupMembers(group.id);
    group.members = members;
  }

  return groupsList;
}

export async function getGroupMembers(groupId: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId);

  if (error) {
    console.error('Error fetching group members:', error);
    return [];
  }

  const userIds = data.map((item: any) => item.user_id);
  if (userIds.length === 0) return [];

  const { data: profiles, error: pError } = await supabase
    .from('profiles')
    .select('*')
    .in('id', userIds);

  if (pError) {
    console.error('Error fetching profiles for group members:', pError);
    return [];
  }

  return profiles || [];
}

export async function createGroup(name: string, description: string | null): Promise<Group> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Insert group
  const { data: group, error: gError } = await supabase
    .from('groups')
    .insert({
      name,
      description,
      created_by: user.id
    })
    .select()
    .single();

  if (gError) throw gError;

  // Insert creator as member
  const { error: mError } = await supabase
    .from('group_members')
    .insert({
      group_id: group.id,
      user_id: user.id
    });

  if (mError) throw mError;

  // Hydrate creator details
  const profile = await getCurrentProfile();
  return {
    ...group,
    members: profile ? [profile] : []
  };
}

export async function inviteMemberByShareId(groupId: string, shareId: string): Promise<Profile> {
  const invitedUser = await searchProfilesByShareId(shareId);
  if (!invitedUser) throw new Error('User not found with this Share ID');

  const { error } = await supabase
    .from('group_members')
    .insert({
      group_id: groupId,
      user_id: invitedUser.id
    });

  if (error) {
    if (error.code === '23505') throw new Error('User is already a member of this group');
    throw error;
  }

  return invitedUser;
}

export async function leaveGroup(groupId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('group_members')
    .delete()
    .match({ group_id: groupId, user_id: user.id });

  if (error) throw error;
}

// ==========================================
// EXPENSES & SETTLEMENTS API
// ==========================================

export async function getGroupExpenses(groupId: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching group expenses:', error);
    return [];
  }

  const expensesList: Expense[] = [];
  for (const exp of data) {
    const payerProfile = await getProfileById(exp.paid_by);
    const participants = await getExpenseParticipants(exp.id);
    expensesList.push({
      ...exp,
      payer: payerProfile || undefined,
      participants
    });
  }

  return expensesList;
}

export async function getExpenseParticipants(expenseId: string): Promise<ExpenseParticipant[]> {
  const { data, error } = await supabase
    .from('expense_participants')
    .select('*')
    .eq('expense_id', expenseId);

  if (error) {
    console.error('Error fetching expense participants:', error);
    return [];
  }

  const list: ExpenseParticipant[] = [];
  for (const part of data) {
    const profile = await getProfileById(part.user_id);
    list.push({
      ...part,
      profile: profile || undefined
    });
  }
  return list;
}

async function getProfileById(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', userId, error);
    return null;
  }
  return data;
}

export async function createExpense(
  expenseData: {
    group_id: string | null;
    title: string;
    amount: number;
    paid_by: string;
    split_type: 'equal' | 'unequal' | 'percentage' | 'shares';
    notes: string | null;
    receipt_url: string | null;
  },
  participants: Array<{ user_id: string; amount: number; raw_value: number | null }>
): Promise<Expense> {
  // 1. Insert parent expense
  const { data: expense, error: eError } = await supabase
    .from('expenses')
    .insert(expenseData)
    .select()
    .single();

  if (eError) throw eError;

  // 2. Map & Insert participants
  const participantsInsert = participants.map(p => ({
    expense_id: expense.id,
    user_id: p.user_id,
    amount: p.amount,
    raw_value: p.raw_value
  }));

  const { error: pError } = await supabase
    .from('expense_participants')
    .insert(participantsInsert);

  if (pError) {
    // Attempt rollback
    await supabase.from('expenses').delete().eq('id', expense.id);
    throw pError;
  }

  // Hydrate expense
  const payerProfile = await getProfileById(expense.paid_by);
  const hydratedParts = await getExpenseParticipants(expense.id);

  return {
    ...expense,
    payer: payerProfile || undefined,
    participants: hydratedParts
  };
}

export async function getGroupSettlements(groupId: string): Promise<Settlement[]> {
  const { data, error } = await supabase
    .from('settlements')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching group settlements:', error);
    return [];
  }

  const hydrated: Settlement[] = [];
  for (const s of data) {
    const payer = await getProfileById(s.payer_id);
    const payee = await getProfileById(s.payee_id);
    hydrated.push({
      ...s,
      payer: payer || undefined,
      payee: payee || undefined
    });
  }
  return hydrated;
}

export async function createSettlement(settlementData: {
  group_id: string | null;
  payer_id: string;
  payee_id: string;
  amount: number;
}): Promise<Settlement> {
  const { data, error } = await supabase
    .from('settlements')
    .insert(settlementData)
    .select()
    .single();

  if (error) throw error;

  const payer = await getProfileById(data.payer_id);
  const payee = await getProfileById(data.payee_id);

  return {
    ...data,
    payer: payer || undefined,
    payee: payee || undefined
  };
}

// Fetch both group-level expenses/settlements and non-group (direct) ones
export async function getAllExpensesAndSettlements(): Promise<{ expenses: Expense[], settlements: Settlement[] }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { expenses: [], settlements: [] };

  // Fetch all expenses where user is member of group OR is payer OR is participant
  // (the RLS policies automatically filter this, so we can just select all)
  const { data: rawExpenses, error: expError } = await supabase
    .from('expenses')
    .select('*')
    .order('created_at', { ascending: false });

  if (expError) {
    console.error('Error fetching all expenses:', expError);
  }

  const { data: rawSettlements, error: setError } = await supabase
    .from('settlements')
    .select('*')
    .order('created_at', { ascending: false });

  if (setError) {
    console.error('Error fetching all settlements:', setError);
  }

  const expensesList: Expense[] = [];
  for (const exp of (rawExpenses || [])) {
    const payerProfile = await getProfileById(exp.paid_by);
    const participants = await getExpenseParticipants(exp.id);
    expensesList.push({
      ...exp,
      payer: payerProfile || undefined,
      participants
    });
  }

  const settlementsList: Settlement[] = [];
  for (const s of (rawSettlements || [])) {
    const payer = await getProfileById(s.payer_id);
    const payee = await getProfileById(s.payee_id);
    settlementsList.push({
      ...s,
      payer: payer || undefined,
      payee: payee || undefined
    });
  }

  return {
    expenses: expensesList,
    settlements: settlementsList
  };
}

// ==========================================
// SYSTEM ACTIVITY FEED
// ==========================================

export async function getActivityFeed(groupId?: string): Promise<Activity[]> {
  const { expenses, settlements } = await getAllExpensesAndSettlements();
  const activities: Activity[] = [];

  // Filter if groupId provided
  const filteredExpenses = groupId ? expenses.filter(e => e.group_id === groupId) : expenses;
  const filteredSettlements = groupId ? settlements.filter(s => s.group_id === groupId) : settlements;

  filteredExpenses.forEach(exp => {
    activities.push({
      id: `exp-${exp.id}`,
      type: 'expense_created',
      title: 'Expense added',
      description: `"${exp.title}" of ${exp.amount.toFixed(2)} was added by ${exp.payer?.name || 'someone'}.`,
      created_at: exp.created_at,
      group_id: exp.group_id || undefined,
      user_id: exp.paid_by
    });
  });

  filteredSettlements.forEach(settle => {
    activities.push({
      id: `settle-${settle.id}`,
      type: 'settlement_created',
      title: 'Settlement recorded',
      description: `${settle.payer?.name || 'Someone'} settled up with ${settle.payee?.name || 'someone'} for ${settle.amount.toFixed(2)}.`,
      created_at: settle.created_at,
      group_id: settle.group_id || undefined,
      user_id: settle.payer_id
    });
  });

  // Sort by date descending
  return activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
