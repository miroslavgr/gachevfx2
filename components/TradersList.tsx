import React, { useState } from 'react';
import { User, Trade } from '../types';
import { UserPlus, UserCheck, TrendingUp, Shield, User as UserIcon, ToggleLeft, ToggleRight } from 'lucide-react';

interface TradersListProps {
  currentUser: User;
  users: User[];
  trades: Trade[];
  onNavigateToProfile: (userId: string) => void;
  onToggleFollow: (userId: string) => void;
}

const TradersList: React.FC<TradersListProps> = ({ currentUser, users, trades, onNavigateToProfile, onToggleFollow }) => {
  // By default, we show the current user ("must show it")
  const [showSelf, setShowSelf] = useState(true);

  const getStats = (userId: string) => {
      const userTrades = trades.filter(t => t.userId === userId);
      const totalPnl = userTrades.reduce((acc, t) => acc + t.pnl, 0);
      const wins = userTrades.filter(t => t.pnl > 0).length;
      const winRate = userTrades.length > 0 ? (wins / userTrades.length) * 100 : 0;
      return { totalPnl, winRate, tradeCount: userTrades.length };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-serif font-bold text-white">Traders Directory</h2>
            <p className="text-slate-400 text-sm">Discover and follow top performers</p>
          </div>
          
          {/* Toggle for "Include Myself" */}
          <button 
            onClick={() => setShowSelf(!showSelf)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg border border-slate-700 hover:border-gold-500 transition-all group"
          >
              <span className={`text-xs font-bold uppercase ${showSelf ? 'text-gold-500' : 'text-slate-400'}`}>Include Me</span>
              {showSelf ? <ToggleRight size={24} className="text-gold-500"/> : <ToggleLeft size={24} className="text-slate-500"/>}
          </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map(user => {
              // OPTIONAL: Hide self based on toggle
              if (!showSelf && user.id === currentUser.id) return null;
              
              const stats = getStats(user.id);
              const isFollowing = currentUser.following.includes(user.id);
              const isMe = user.id === currentUser.id;

              return (
                  <div key={user.id} className={`glass-panel p-6 rounded-2xl border transition-colors group ${isMe ? 'border-gold-500/50 bg-gold-500/5' : 'border-slate-800 hover:border-gold-500/30'}`}>
                      <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-4">
                              <div className={`w-14 h-14 rounded-full flex items-center justify-center overflow-hidden border-2 transition-colors ${isMe ? 'border-gold-500' : 'border-slate-600 group-hover:border-gold-500'} bg-slate-700`}>
                                  {user.avatar && user.avatar.startsWith('http') ? (
                                      <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                                  ) : (
                                      <span className="text-xl font-bold text-white">{user.name.charAt(0)}</span>
                                  )}
                              </div>
                              <div>
                                  <h3 
                                    className="font-bold text-white text-lg group-hover:text-gold-400 transition-colors cursor-pointer flex items-center gap-2" 
                                    onClick={() => onNavigateToProfile(user.id)}
                                  >
                                      {user.name}
                                      {isMe && <span className="bg-gold-500 text-dark-900 text-[10px] px-1.5 py-0.5 rounded font-black uppercase">YOU</span>}
                                  </h3>
                                  <div className="flex items-center gap-2">
                                      <span className="text-xs text-slate-500 capitalize">{user.role}</span>
                                      {user.role === 'admin' && <Shield size={12} className="text-gold-500"/>}
                                  </div>
                              </div>
                          </div>
                          
                          {!isMe && (
                              <button 
                                onClick={() => onToggleFollow(user.id)}
                                className={`p-2 rounded-xl transition-all ${isFollowing ? 'bg-slate-800 text-white' : 'bg-gold-500 text-dark-900 hover:scale-105'}`}
                              >
                                  {isFollowing ? <UserCheck size={20}/> : <UserPlus size={20}/>}
                              </button>
                          )}
                      </div>

                      <div className="grid grid-cols-3 gap-2 bg-dark-900/50 rounded-xl p-3 border border-slate-800/50">
                          <div className="text-center">
                              <p className="text-[10px] text-slate-500 uppercase font-bold">PnL</p>
                              <p className={`font-mono font-bold ${stats.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {stats.totalPnl > 0 ? '+' : ''}{stats.totalPnl}
                              </p>
                          </div>
                          <div className="text-center border-l border-slate-800">
                              <p className="text-[10px] text-slate-500 uppercase font-bold">Win Rate</p>
                              <p className="font-mono font-bold text-white">{Math.round(stats.winRate)}%</p>
                          </div>
                          <div className="text-center border-l border-slate-800">
                              <p className="text-[10px] text-slate-500 uppercase font-bold">Trades</p>
                              <p className="font-mono font-bold text-white">{stats.tradeCount}</p>
                          </div>
                      </div>
                      
                      <button 
                        onClick={() => onNavigateToProfile(user.id)}
                        className="w-full mt-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                      >
                          View Profile <TrendingUp size={14}/>
                      </button>
                  </div>
              );
          })}
      </div>
    </div>
  );
};

export default TradersList;