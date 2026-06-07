export interface Profile {
  id: string;
  share_id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted';
  created_at: string;
  friend_profile?: Profile;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  members?: Profile[];
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  joined_at: string;
}

export type SplitType = 'equal' | 'unequal' | 'percentage' | 'shares';

export interface Expense {
  id: string;
  group_id: string | null;
  title: string;
  amount: number;
  paid_by: string;
  split_type: SplitType;
  notes: string | null;
  receipt_url: string | null;
  created_at: string;
  payer?: Profile;
  participants?: ExpenseParticipant[];
}

export interface ExpenseParticipant {
  id: string;
  expense_id: string;
  user_id: string;
  amount: number;
  raw_value: number | null;
  profile?: Profile;
}

export interface Settlement {
  id: string;
  group_id: string | null;
  payer_id: string;
  payee_id: string;
  amount: number;
  created_at: string;
  payer?: Profile;
  payee?: Profile;
}

export interface Activity {
  id: string;
  type: 'expense_created' | 'member_joined' | 'settlement_created';
  title: string;
  description: string;
  created_at: string;
  group_id?: string;
  user_id?: string;
}

export interface BalanceSummary {
  netBalance: number;
  owed: number;
  owe: number;
}
