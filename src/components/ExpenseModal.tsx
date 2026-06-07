import React, { useState, useEffect } from 'react';
import { Camera, Paperclip, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from './ui/Toast';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { getGroups, getGroupMembers, getFriends, createExpense } from '../services/api';
import { uploadReceipt } from '../services/storage';
import { Group, Friend, Profile, SplitType } from '../types';
import { calculateEqual, calculateUnequal, calculatePercentage, calculateShares, SplitInput } from '../utils/splitCalc';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultGroupId?: string | null;
}

export function ExpenseModal({ isOpen, onClose, onSuccess, defaultGroupId = null }: ExpenseModalProps) {
  const { profile } = useAuth();
  const toast = useToast();

  // Loading States
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [notes, setNotes] = useState('');
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  // Target Destination Configuration
  const [splitDestination, setSplitDestination] = useState<'friend' | 'group'>('group');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedFriendId, setSelectedFriendId] = useState<string>('');

  // Loaded Options
  const [groups, setGroups] = useState<Group[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [participants, setParticipants] = useState<Profile[]>([]);

  // Selection Matrix
  const [checkedParticipants, setCheckedParticipants] = useState<{ [userId: string]: boolean }>({});
  const [payerId, setPayerId] = useState<string>('');
  const [splitValues, setSplitValues] = useState<{ [userId: string]: string }>({}); // Stores inputs for unequal/percentage/shares

  // Load Groups and Friends on open
  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  async function loadInitialData() {
    setDataLoading(true);
    try {
      const [gList, fList] = await Promise.all([getGroups(), getFriends()]);
      setGroups(gList);
      setFriends(fList);

      // Handle default group setting
      if (defaultGroupId) {
        setSplitDestination('group');
        setSelectedGroupId(defaultGroupId);
        await handleGroupSelect(defaultGroupId);
      } else if (gList.length > 0) {
        setSplitDestination('group');
        setSelectedGroupId(gList[0].id);
        await handleGroupSelect(gList[0].id);
      } else if (fList.length > 0) {
        setSplitDestination('friend');
        setSelectedFriendId(fList[0].friend_profile?.id || '');
        await handleFriendSelect(fList[0].friend_profile?.id || '');
      } else if (profile) {
        setPayerId(profile.id);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to prefetch friends and groups.');
    } finally {
      setDataLoading(false);
    }
  }

  // Load Group Members
  const handleGroupSelect = async (groupId: string) => {
    setSelectedGroupId(groupId);
    if (!groupId) return;
    try {
      const members = await getGroupMembers(groupId);
      setParticipants(members);
      
      // Auto check all participants
      const checks: { [id: string]: boolean } = {};
      const splits: { [id: string]: string } = {};
      members.forEach(m => {
        checks[m.id] = true;
        splits[m.id] = '';
      });
      setCheckedParticipants(checks);
      setSplitValues(splits);

      // Set default payer to current user
      if (profile && members.some(m => m.id === profile.id)) {
        setPayerId(profile.id);
      } else if (members.length > 0) {
        setPayerId(members[0].id);
      }
    } catch (err) {
      console.error(err);
      toast.error('Error loading group members.');
    }
  };

  // Setup Friend Split
  const handleFriendSelect = async (friendUserId: string) => {
    setSelectedFriendId(friendUserId);
    if (!friendUserId || !profile) return;
    
    // Find friend details
    const targetFriend = friends.find(f => f.friend_profile?.id === friendUserId);
    if (targetFriend?.friend_profile) {
      const members = [profile, targetFriend.friend_profile];
      setParticipants(members);
      
      const checks: { [id: string]: boolean } = {};
      const splits: { [id: string]: string } = {};
      members.forEach(m => {
        checks[m.id] = true;
        splits[m.id] = '';
      });
      setCheckedParticipants(checks);
      setSplitValues(splits);
      setPayerId(profile.id);
    }
  };

  // Upload Attachment File
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File exceeds the 5MB size limit.');
      return;
    }

    setUploading(true);
    try {
      const url = await uploadReceipt(file);
      setReceiptUrl(url);
      toast.success('Attachment uploaded successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'File upload failed.');
    } finally {
      setUploading(false);
    }
  };

  // Compute splits dynamically to review validation errors
  const parseNumberInput = (val: string) => {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  };

  const getActiveParticipantIds = () => {
    return participants.filter(p => checkedParticipants[p.id]).map(p => p.id);
  };

  const getSplitCalculations = () => {
    const total = parseNumberInput(amount);
    const activeIds = getActiveParticipantIds();
    
    if (total <= 0 || activeIds.length === 0) return { shares: {}, isValid: false, message: 'Enter a valid amount and select participants' };

    if (splitType === 'equal') {
      const shares = calculateEqual(total, activeIds);
      return { shares, isValid: true, message: '' };
    }

    if (splitType === 'unequal') {
      const inputs: SplitInput[] = activeIds.map(id => ({
        userId: id,
        value: parseNumberInput(splitValues[id])
      }));
      const { results, isValid, difference } = calculateUnequal(total, inputs);
      return {
        shares: results,
        isValid,
        message: isValid
          ? ''
          : difference > 0
          ? `Remaining amount to allocate: $${difference.toFixed(2)}`
          : `Over-allocated amount: $${Math.abs(difference).toFixed(2)}`
      };
    }

    if (splitType === 'percentage') {
      const inputs: SplitInput[] = activeIds.map(id => ({
        userId: id,
        value: parseNumberInput(splitValues[id])
      }));
      const { results, isValid, difference } = calculatePercentage(total, inputs);
      return {
        shares: results,
        isValid,
        message: isValid
          ? ''
          : difference > 0
          ? `Remaining percentage: ${difference.toFixed(1)}%`
          : `Over-allocated percentage: ${Math.abs(difference).toFixed(1)}%`
      };
    }

    if (splitType === 'shares') {
      const inputs: SplitInput[] = activeIds.map(id => ({
        userId: id,
        value: parseNumberInput(splitValues[id])
      }));
      const { results, isValid } = calculateShares(total, inputs);
      return {
        shares: results,
        isValid,
        message: isValid ? '' : 'Total shares must be greater than 0'
      };
    }

    return { shares: {}, isValid: false, message: 'Invalid split configurations' };
  };

  const calc = getSplitCalculations();

  // Submit Expense Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const total = parseNumberInput(amount);
    const activeIds = getActiveParticipantIds();

    if (total <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }

    if (activeIds.length === 0) {
      toast.error('Select at least one participant.');
      return;
    }

    if (!calc.isValid) {
      toast.error(calc.message || 'Invalid split proportions.');
      return;
    }

    setLoading(true);
    try {
      const expenseInsert = {
        group_id: splitDestination === 'group' ? selectedGroupId : null,
        title: title.trim(),
        amount: total,
        paid_by: payerId,
        split_type: splitType,
        notes: notes.trim() || null,
        receipt_url: receiptUrl
      };

      const participantsPayload = activeIds.map(id => ({
        user_id: id,
        amount: calc.shares[id] || 0,
        raw_value: splitType === 'equal' ? null : parseNumberInput(splitValues[id])
      }));

      await createExpense(expenseInsert, participantsPayload);
      toast.success('Expense created successfully!');
      
      // Reset state and close
      setTitle('');
      setAmount('');
      setNotes('');
      setReceiptUrl(null);
      setSplitType('equal');
      
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to create expense.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Expense" size="lg">
      {dataLoading ? (
        <div className="py-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6 text-left">
          {/* Destination Selector */}
          <div className="grid grid-cols-2 gap-3 p-1 bg-black/20 rounded-2xl border border-white/5">
            <button
              type="button"
              onClick={() => {
                setSplitDestination('group');
                if (groups.length > 0) handleGroupSelect(groups[0].id);
              }}
              className={`py-2 px-3 text-xs font-semibold rounded-xl transition-all ${
                splitDestination === 'group'
                  ? 'bg-white/10 text-white shadow-inner'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Split with a Group
            </button>
            <button
              type="button"
              onClick={() => {
                setSplitDestination('friend');
                if (friends.length > 0) handleFriendSelect(friends[0].friend_profile?.id || '');
              }}
              className={`py-2 px-3 text-xs font-semibold rounded-xl transition-all ${
                splitDestination === 'friend'
                  ? 'bg-white/10 text-white shadow-inner'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Split with a Friend
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Target Selectors */}
            {splitDestination === 'group' ? (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Select Group</label>
                <select
                  value={selectedGroupId}
                  onChange={(e) => handleGroupSelect(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl glass-input text-white text-sm focus:border-purple-500/50 focus:outline-none"
                  required
                >
                  <option value="" disabled>-- Choose Group --</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id} className="bg-slate-900 text-white">{g.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Select Friend</label>
                <select
                  value={selectedFriendId}
                  onChange={(e) => handleFriendSelect(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl glass-input text-white text-sm focus:border-purple-500/50 focus:outline-none"
                  required
                >
                  <option value="" disabled>-- Choose Friend --</option>
                  {friends.map(f => (
                    <option key={f.id} value={f.friend_profile?.id} className="bg-slate-900 text-white">
                      {f.friend_profile?.name} ({f.friend_profile?.share_id})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Split Type Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Split Strategy</label>
              <select
                value={splitType}
                onChange={(e) => {
                  setSplitType(e.target.value as SplitType);
                  // Reset splits mapping
                  const splits: { [id: string]: string } = {};
                  participants.forEach(p => splits[p.id] = '');
                  setSplitValues(splits);
                }}
                className="w-full px-4 py-3 rounded-xl glass-input text-white text-sm focus:border-purple-500/50 focus:outline-none"
              >
                <option value="equal" className="bg-slate-900">Equally</option>
                <option value="unequal" className="bg-slate-900">Unequally (Exact amounts)</option>
                <option value="percentage" className="bg-slate-900">By Percentages (%)</option>
                <option value="shares" className="bg-slate-900">By Shares ratio</option>
              </select>
            </div>
          </div>

          {/* Title & Amount */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Expense Title"
                placeholder="e.g. Sushi Lounge Buffet, Taxi to hotel"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
              />
            </div>
            <div>
              <Input
                label="Total Amount ($)"
                placeholder="0.00"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Payer Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Paid By</label>
            <div className="flex flex-wrap gap-2">
              {participants.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPayerId(m.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition-all ${
                    payerId === m.id
                      ? 'bg-purple-600/30 border-purple-500 text-purple-300 font-semibold'
                      : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {m.id === profile?.id ? 'You' : m.name}
                </button>
              ))}
            </div>
          </div>

          {/* Participants Checklist / Split Inputs */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Participants & Shares allocation
            </label>
            
            <div className="glass-card p-4 rounded-2xl border-white/5 space-y-3 max-h-56 overflow-y-auto">
              {participants.map((m) => {
                const isChecked = !!checkedParticipants[m.id];
                const calculatedShare = calc.shares[m.id] || 0;

                return (
                  <div key={m.id} className="flex items-center justify-between gap-4 p-2 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          setCheckedParticipants(prev => ({
                            ...prev,
                            [m.id]: e.target.checked
                          }));
                        }}
                        className="rounded border-white/10 bg-slate-900 text-purple-600 focus:ring-0 w-4 h-4"
                      />
                      <span className="text-xs font-medium text-white">{m.name}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Sub-inputs based on split strategy */}
                      {isChecked && splitType !== 'equal' && (
                        <div className="w-24">
                          <input
                            type="number"
                            step={splitType === 'percentage' || splitType === 'shares' ? '1' : '0.01'}
                            placeholder={
                              splitType === 'percentage' ? '%' : splitType === 'shares' ? 'shares' : '$'
                            }
                            value={splitValues[m.id] || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSplitValues(prev => ({
                                ...prev,
                                [m.id]: val
                              }));
                            }}
                            className="w-full text-right px-2.5 py-1 text-xs rounded-lg glass-input border-white/10"
                            required
                          />
                        </div>
                      )}

                      {/* Display share estimation */}
                      <span className="text-xs font-bold text-slate-300 min-w-16 text-right">
                        ${calculatedShare.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Verification Alert Banner */}
            {!calc.isValid && amount && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center gap-2 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{calc.message}</span>
              </div>
            )}
          </div>

          {/* Notes & Upload Attachment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Write optional transaction notes..."
                className="w-full h-24 px-4 py-3 rounded-xl glass-input text-white text-xs placeholder:text-slate-600 focus:border-purple-500/50 focus:outline-none resize-none"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Receipt Attachment</label>
              <div className="border border-dashed border-white/10 rounded-xl p-4 h-24 flex flex-col items-center justify-center relative hover:bg-white/5 transition-all">
                {uploading ? (
                  <div className="flex flex-col items-center gap-1.5 text-xs text-slate-400">
                    <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                    <span>Uploading receipt file...</span>
                  </div>
                ) : receiptUrl ? (
                  <div className="flex flex-col items-center gap-1 text-xs text-emerald-400">
                    <Paperclip className="w-5 h-5" />
                    <span className="font-semibold text-[10px] truncate max-w-xs">Attachment linked!</span>
                    <button
                      type="button"
                      onClick={() => setReceiptUrl(null)}
                      className="text-rose-400 underline hover:text-rose-300 text-[9px] mt-0.5"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center justify-center gap-1.5 text-xs text-slate-400 w-full h-full">
                    <Camera className="w-5 h-5 text-slate-500" />
                    <span>Upload Image or PDF receipt (Max 5MB)</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
            <Button variant="ghost" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              loading={loading}
              disabled={!calc.isValid || loading}
            >
              Add Expense
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
export default ExpenseModal;
