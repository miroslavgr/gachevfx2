
import React from 'react';
import { User, Trade, UserRole } from '../types';
import { TrendingUp, Award, UserPlus, Check, ChevronRight, Search, Trophy } from 'lucide-react';

interface TradersListProps {
  currentUser: User;
  users: User[];
  trades: Trade[];
  onNavigateToProfile: (userId: string) => void;
  onToggleFollow: (targetId: string) => void;
}

const TradersList: React.FC<TradersListProps> = ({ currentUser, users, trades, onNavigateToProfile, onToggleFollow }) => {
  
  // Calculate stats for each user
  const tradersWithStats = users.map(user => {
      const userTrades = trades.filter(t => t.userId === user.id);
      const totalPnL = userTrades.reduce((acc, t) => acc + t.pnl, 0);
      const wins = userTrades.filter(t => t.pnl > 0).length;
      const winRate = userTrades.length > 0 ? (wins / userTrades.length) * 100 : 0;
      return {
          ...user,
          stats: { totalPnL, winRate, tradeCount: userTrades.length }
      };
  }).sort((a, b) => b.stats.totalPnL - a.stats.totalPnL); // Sort by PnL (Leaderboard)

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
            <div>
                <h2 className="text-4xl font-serif font-bold text-white mb-2">Traders Directory</h2>
                <p className="text-slate-400 text-sm">Discover and follow top performers in the community.</p>
            </div>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                    type="text" 
                    placeholder="Find trader..."
                    className="bg-dark-900 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:border-gold-500 outline-none w-64"
                />
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tradersWithStats.map((user, index) => {
                const isMe = user.id === currentUser.id;
                const isFollowing = currentUser.following.includes(user.id);

                return (
                    <div 
                        key={user.id}
                        onClick={() => onNavigateToProfile(user.id)}
                        className="glass-panel p-6 rounded-2xl group hover:-translate-y-1 transition-all duration-300 cursor-pointer border-transparent hover:border-gold-500/30 relative overflow-hidden"
                    >
                        {/* Rank Badge for top 3 */}
                        {index < 3 && user.stats.totalPnL > 0 && (
                            <div className="absolute top-0 right-0 p-4">
                                <Trophy size={24} className={index === 0 ? 'text-gold-500' : index === 1 ? 'text-slate-300' : 'text-amber-700'} />
                            </div>
                        )}

                        <div className="flex items-center gap-4 mb-6">
                            <div className="relative">
                                <img src={user.avatar} alt={user.name} className="w-16 h-16 rounded-full border-2 border-slate-700 group-hover:border-gold-500 transition-colors object-cover" />
                                {user.role === UserRole.ADMIN && (
                                    <div className="absolute -bottom-1 -right-1 bg-gold-500 text-dark-900 p-1 rounded-full" title="Mentor">
                                        <Award size={12} fill="currentColor" />
                                    </div>
                                )}
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-white group-hover:text-gold-400 transition-colors flex items-center gap-2">
                                    {user.name}
                                    {isMe && <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">YOU</span>}
                                </h3>
                                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">{user.role}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-900/50 p-4 rounded-xl border border-slate-800/50">
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Total PnL</p>
                                <p className={`font-mono font-bold text-lg ${user.stats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {user.stats.totalPnL > 0 ? '+' : ''}{user.stats.totalPnL.toFixed(0)}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Win Rate</p>
                                <p className="font-mono font-bold text-white text-lg">
                                    {user.stats.winRate.toFixed(1)}%
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            {!isMe && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onToggleFollow(user.id); }}
                                    className={`flex-1 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                                        isFollowing 
                                        ? 'bg-slate-800 text-slate-400 hover:bg-red-900/20 hover:text-red-400' 
                                        : 'bg-gold-500 text-dark-900 hover:bg-gold-400 shadow-glow'
                                    }`}
                                >
                                    {isFollowing ? <Check size={14} /> : <UserPlus size={14} />}
                                    {isFollowing ? 'Following' : 'Follow'}
                                </button>
                            )}
                            <button className="flex-1 py-2.5 rounded-lg border border-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider hover:bg-slate-800 transition-colors flex items-center justify-center gap-1 group-hover:border-slate-500">
                                View <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                )
            })}
        </div>
    </div>
  );
};

export default TradersList;
