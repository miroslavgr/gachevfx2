
import React, { useMemo, useRef, useState } from 'react';
import { User, Trade } from '../types';
import { MOCK_USERS } from '../constants';
import { Shield, Lock, Unlock, UserMinus, Activity, Trophy, DollarSign, UserPlus, Check, Lock as LockIcon, EyeOff, LayoutGrid, Camera, KeyRound } from 'lucide-react';

interface UserProfileProps {
  viewingUser: User; // The user profile being viewed
  currentUser: User; // The user currently logged in
  onUpdateUser: (updatedUser: User) => void;
  trades: Trade[];
  onToggleFollow?: (targetId: string) => void;
  onNavigateToTrade?: (tradeId: string) => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ viewingUser, currentUser, onUpdateUser, trades, onToggleFollow, onNavigateToTrade }) => {
  const isOwnProfile = viewingUser.id === currentUser.id;
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');

  // Following list
  const followingUsers = useMemo(() => {
      return MOCK_USERS.filter(u => viewingUser.following.includes(u.id));
  }, [viewingUser.following]);

  // Stats
  const userTrades = trades.filter(t => t.userId === viewingUser.id);
  const totalPnL = userTrades.reduce((acc, t) => acc + t.pnl, 0);
  const winRate = userTrades.length > 0 
      ? (userTrades.filter(t => t.pnl > 0).length / userTrades.length) * 100 
      : 0;

  // Privacy Logic
  const isPrivate = viewingUser.privacy === 'private';
  const canViewTrades = isOwnProfile || !isPrivate;

  // Actions
  const togglePrivacy = () => {
      if (!isOwnProfile) return;
      const newPrivacy = viewingUser.privacy === 'public' ? 'private' : 'public';
      onUpdateUser({ ...viewingUser, privacy: newPrivacy });
  };

  const handleUnfollow = (targetId: string) => {
      if (!isOwnProfile) return;
      const newFollowing = viewingUser.following.filter(id => id !== targetId);
      onUpdateUser({ ...viewingUser, following: newFollowing });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && isOwnProfile) {
          const reader = new FileReader();
          reader.onloadend = () => {
              onUpdateUser({ ...viewingUser, avatar: reader.result as string });
          };
          reader.readAsDataURL(file);
      }
  };

  const handleChangePassword = (e: React.FormEvent) => {
      e.preventDefault();
      if (newPassword !== confirmPassword) {
          setPasswordMessage("Passwords do not match.");
          return;
      }
      if (newPassword.length < 6) {
          setPasswordMessage("Password too short.");
          return;
      }
      // Mock Success
      setPasswordMessage("Password updated successfully.");
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordMessage(''), 3000);
  };

  const isFollowing = currentUser.following.includes(viewingUser.id);

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
        {/* Header Profile Card */}
        <div className="glass-panel p-8 rounded-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-40 bg-gold-500/5 blur-[100px] rounded-full pointer-events-none"></div>
             
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                 <div className="flex items-center gap-6">
                     <div 
                        className={`w-24 h-24 rounded-full border-4 border-slate-800 p-1 bg-gradient-to-br from-gold-500 to-amber-600 shadow-xl shrink-0 relative group overflow-hidden ${isOwnProfile ? 'cursor-pointer' : ''}`}
                        onClick={() => isOwnProfile && fileInputRef.current?.click()}
                     >
                         <img src={viewingUser.avatar} alt={viewingUser.name} className="w-full h-full rounded-full object-cover border-2 border-white/10" />
                         
                         {isOwnProfile && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                                <Camera size={24} className="text-white" />
                            </div>
                         )}
                         <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*"
                            onChange={handleAvatarChange}
                         />
                     </div>
                     <div>
                         <h2 className="text-3xl font-serif font-bold text-white flex items-center gap-3">
                             {viewingUser.name}
                             {isPrivate && (
                                <span title="Private Profile">
                                    <LockIcon size={18} className="text-slate-500" />
                                </span>
                             )}
                         </h2>
                         <p className="text-slate-400 font-medium capitalize flex items-center gap-2 mb-2">
                             {viewingUser.role}
                         </p>
                         {!isOwnProfile && (
                             <button 
                                onClick={() => onToggleFollow && onToggleFollow(viewingUser.id)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${
                                    isFollowing 
                                    ? 'bg-slate-700 text-slate-300 hover:bg-red-900/30 hover:text-red-400' 
                                    : 'bg-gold-500 text-dark-900 hover:scale-105 shadow-glow'
                                }`}
                             >
                                 {isFollowing ? <><Check size={14}/> Following</> : <><UserPlus size={14}/> Follow</>}
                             </button>
                         )}
                         {isOwnProfile && (
                             <span className={`text-xs px-2 py-0.5 rounded border ${viewingUser.privacy === 'public' ? 'text-green-400 border-green-500/30 bg-green-500/10' : 'text-slate-400 border-slate-600'}`}>
                                 {viewingUser.privacy === 'public' ? 'Public Profile' : 'Private Profile'}
                             </span>
                         )}
                     </div>
                 </div>

                 {/* Mini Stats */}
                 <div className="flex gap-4 md:gap-8 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                     <div className="text-center">
                         <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">PnL</p>
                         <p className={`font-mono font-bold text-xl ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>${totalPnL.toFixed(0)}</p>
                     </div>
                     <div className="w-px bg-slate-700"></div>
                     <div className="text-center">
                         <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Win Rate</p>
                         <p className="font-mono font-bold text-white text-xl">{winRate.toFixed(1)}%</p>
                     </div>
                     <div className="w-px bg-slate-700"></div>
                     <div className="text-center">
                         <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Trades</p>
                         <p className="font-mono font-bold text-white text-xl">{userTrades.length}</p>
                     </div>
                 </div>
             </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Settings (Me) or Info (Others) */}
            <div className="lg:col-span-1 space-y-8">
                {isOwnProfile ? (
                    <>
                        {/* Privacy Settings */}
                        <div className="glass-panel p-6 rounded-2xl h-fit">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="bg-slate-800 p-2 rounded-lg text-slate-300">
                                    <Shield size={20} />
                                </div>
                                <h3 className="text-xl font-bold text-white">Privacy</h3>
                            </div>
                            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-4">
                                <div>
                                    <p className="font-bold text-white text-sm mb-1">Visibility</p>
                                    <p className="text-xs text-slate-500">
                                        {viewingUser.privacy === 'public' 
                                            ? 'Everyone can see your trades.' 
                                            : 'Only you can see your trades.'}
                                    </p>
                                </div>
                                <button 
                                    onClick={togglePrivacy}
                                    className={`w-full py-2 rounded-lg text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 ${viewingUser.privacy === 'public' ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-slate-700 text-slate-300'}`}
                                >
                                    {viewingUser.privacy === 'public' ? <Unlock size={14} /> : <Lock size={14} />}
                                    {viewingUser.privacy === 'public' ? 'Set Private' : 'Set Public'}
                                </button>
                            </div>
                        </div>

                        {/* Change Password */}
                        <div className="glass-panel p-6 rounded-2xl h-fit">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="bg-slate-800 p-2 rounded-lg text-slate-300">
                                    <KeyRound size={20} />
                                </div>
                                <h3 className="text-xl font-bold text-white">Security</h3>
                            </div>
                            <form onSubmit={handleChangePassword} className="space-y-3">
                                <input 
                                    type="password" 
                                    placeholder="Current Password" 
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2 text-white text-sm focus:border-gold-500 outline-none"
                                />
                                <input 
                                    type="password" 
                                    placeholder="New Password" 
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2 text-white text-sm focus:border-gold-500 outline-none"
                                />
                                <input 
                                    type="password" 
                                    placeholder="Confirm New Password" 
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2 text-white text-sm focus:border-gold-500 outline-none"
                                />
                                {passwordMessage && (
                                    <p className={`text-xs text-center ${passwordMessage.includes('success') ? 'text-green-400' : 'text-red-400'}`}>
                                        {passwordMessage}
                                    </p>
                                )}
                                <button type="submit" className="w-full bg-slate-800 text-slate-300 text-xs font-bold py-2 rounded-lg hover:bg-gold-500 hover:text-dark-900 transition-colors uppercase">
                                    Update Password
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="glass-panel p-6 rounded-2xl h-fit text-slate-400 text-sm">
                        <h3 className="text-white font-bold mb-2">About</h3>
                        <p>Member since 2024. Focused on high-probability setups on XAUUSD.</p>
                    </div>
                )}

                {/* Following List */}
                <div className="glass-panel p-6 rounded-2xl">
                     <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="bg-slate-800 p-2 rounded-lg text-slate-300">
                                <Activity size={20} />
                            </div>
                            <h3 className="text-xl font-bold text-white">Following</h3>
                        </div>
                        <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400">{followingUsers.length}</span>
                    </div>

                    <div className="space-y-3">
                        {followingUsers.length === 0 && (
                            <p className="text-slate-500 text-sm text-center py-8">Not following anyone.</p>
                        )}
                        {followingUsers.map(u => (
                            <div key={u.id} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-xl hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-700">
                                <div className="flex items-center gap-3">
                                    <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full" />
                                    <p className="font-bold text-sm text-white">{u.name}</p>
                                </div>
                                {isOwnProfile && (
                                    <button 
                                        onClick={() => handleUnfollow(u.id)}
                                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                        title="Unfollow"
                                    >
                                        <UserMinus size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Column: Trades Feed */}
            <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                    <LayoutGrid size={20} className="text-gold-500" />
                    <h3 className="text-xl font-bold text-white">Trade History</h3>
                </div>

                {canViewTrades ? (
                    <div className="space-y-4">
                        {userTrades.length === 0 && (
                            <div className="p-12 text-center text-slate-500 border border-dashed border-slate-700 rounded-xl">
                                No trades posted yet.
                            </div>
                        )}
                        {userTrades.map(trade => (
                            <div 
                                key={trade.id} 
                                onClick={() => onNavigateToTrade?.(trade.id)}
                                className="glass-panel p-4 rounded-xl flex justify-between items-center group hover:border-gold-500/30 transition-all cursor-pointer"
                            >
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className={`font-bold text-xs px-2 py-0.5 rounded ${trade.type === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{trade.type}</span>
                                        <span className="font-bold text-white">{trade.pair}</span>
                                        <span className="text-xs text-slate-500">{new Date(trade.closeTime).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-sm text-slate-400 line-clamp-1">{trade.notes}</p>
                                </div>
                                <div className="text-right">
                                    <span className={`font-bold font-mono text-lg ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {trade.pnl >= 0 ? '+' : ''}{trade.pnl}
                                    </span>
                                    <span className="text-[10px] text-slate-500 block uppercase">Pips</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="glass-panel p-16 rounded-xl flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4 text-slate-500">
                            <EyeOff size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Private Profile</h3>
                        <p className="text-slate-400 max-w-xs">This user has set their profile to private. Follow them to see future public updates.</p>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default UserProfile;
