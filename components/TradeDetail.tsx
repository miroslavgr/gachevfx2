import React, { useState } from 'react';
import { Trade, Comment, User } from '../types';
import { ArrowLeft, Clock, Calendar, Target, ShieldCheck, Activity, Award, User as UserIcon, MessageCircle, Play, Mic, ChevronRight, ThumbsUp, Send } from 'lucide-react';

interface TradeDetailProps {
  trade: Trade;
  currentUser?: User; // Optional, passed if in context where user can interact
  onBack: () => void;
  onNavigateToProfile?: (userId: string) => void;
  onUpdateTrade?: (trade: Trade) => void;
}

const TradeDetail: React.FC<TradeDetailProps> = ({ trade, currentUser, onBack, onNavigateToProfile, onUpdateTrade }) => {
  const [commentText, setCommentText] = useState('');

  const duration = trade.closeTime - trade.openTime;
  const minutes = Math.floor(duration / 60000);
  const hours = Math.floor(minutes / 60);
  const displayDuration = hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
  
  const risk = Math.abs(trade.entryPrice - trade.stopLoss);
  const profit = trade.type === 'BUY' ? trade.exitPrice - trade.entryPrice : trade.entryPrice - trade.exitPrice;
  const rMultiple = risk > 0 ? (profit / risk) : 0;
  
  const formatFullTime = (ms: number) => {
      return new Date(ms).toLocaleString('en-GB', { 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit', 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit',
          hour12: false 
      });
  };

  // --- INTERACTIONS ---
  
  const isLiked = currentUser && trade.likes && trade.likes.includes(currentUser.id);
  const likeCount = trade.likes ? trade.likes.length : 0;
  const comments = trade.comments || [];

  const handleLikeToggle = () => {
      if (!currentUser || !onUpdateTrade) return;
      
      const newLikes = isLiked 
          ? trade.likes.filter(id => id !== currentUser.id)
          : [...(trade.likes || []), currentUser.id];
      
      onUpdateTrade({ ...trade, likes: newLikes });
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentUser || !onUpdateTrade || !commentText.trim()) return;

      const newComment: Comment = {
          id: Date.now().toString(),
          userId: currentUser.id,
          userName: currentUser.name,
          avatar: currentUser.avatar,
          text: commentText,
          timestamp: Date.now()
      };

      onUpdateTrade({ ...trade, comments: [...comments, newComment] });
      setCommentText('');
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-right-8 duration-300">
      {/* Navigation */}
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
      >
        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        <span className="font-bold">Back to Feed</span>
      </button>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Visuals & Stats */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* Header Card */}
            <div className="glass-panel p-8 rounded-2xl relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-32 bg-gold-500/5 blur-[100px] rounded-full pointer-events-none"></div>
                 
                 <div className="flex justify-between items-start mb-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                             <span className="text-sm font-bold bg-slate-800 border border-slate-700 px-2 py-1 rounded text-slate-300">{trade.pair}</span>
                             <span className={`text-sm font-black px-2 py-1 rounded ${trade.type === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{trade.type}</span>
                             <span className="text-sm font-bold bg-gold-500/10 border border-gold-500/30 px-2 py-1 rounded text-gold-400">{trade.strategy}</span>
                        </div>
                        <h1 className="text-4xl font-serif font-bold text-white mb-1">
                            {trade.pnl > 0 ? 'Winning Trade' : 'Losing Trade'}
                        </h1>
                        <div className="flex items-center gap-4 text-slate-400 text-sm">
                            <span className="flex items-center gap-1"><Calendar size={14}/> {new Date(trade.closeTime).toLocaleDateString()}</span>
                            <span className="flex items-center gap-1"><Clock size={14}/> {displayDuration}</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className={`text-5xl font-bold ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {trade.pnl >= 0 ? '+' : ''}{trade.pnl}
                        </div>
                        <p className="text-slate-500 text-sm font-medium uppercase tracking-wider mt-1">Pips PnL</p>
                    </div>
                 </div>

                 {/* Key Stats Grid */}
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-6 border-t border-slate-700/50 pt-6">
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-bold mb-1">Entry Price</p>
                        <p className="font-mono text-white text-lg">{trade.entryPrice}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-bold mb-1">Exit Price</p>
                        <p className="font-mono text-white text-lg">{trade.exitPrice}</p>
                    </div>
                    <div>
                         <p className="text-xs text-slate-500 uppercase font-bold mb-1">Stop Loss</p>
                         <p className="font-mono text-red-400 text-lg">{trade.stopLoss}</p>
                    </div>
                    
                    {/* Time details with seconds */}
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-bold mb-1">Entry Time</p>
                        <p className="font-mono text-slate-300 text-sm tracking-tight">{formatFullTime(trade.openTime)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-bold mb-1">Exit Time</p>
                        <p className="font-mono text-slate-300 text-sm tracking-tight">{formatFullTime(trade.closeTime)}</p>
                    </div>

                    <div>
                         <p className="text-xs text-slate-500 uppercase font-bold mb-1">R-Multiple</p>
                         <p className={`font-mono text-lg font-bold ${rMultiple >= 0 ? 'text-green-400' : 'text-red-400'}`}>{rMultiple.toFixed(2)}R</p>
                    </div>
                 </div>
            </div>

            {/* Chart Image */}
            <div className="glass-panel p-2 rounded-2xl">
                {trade.imageUrl ? (
                    <img src={trade.imageUrl} alt="Trade Chart" className="w-full rounded-xl" />
                ) : (
                    <div className="h-64 flex flex-col items-center justify-center text-slate-600 bg-slate-900/50 rounded-xl">
                        <Activity size={48} className="mb-2 opacity-50"/>
                        <p>No chart image provided</p>
                    </div>
                )}
            </div>

            {/* Notes Section */}
            <div className="glass-panel p-6 rounded-2xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <UserIcon size={18} className="text-gold-500"/>
                        Trader Analysis
                    </h3>
                    <button 
                        onClick={handleLikeToggle}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${isLiked ? 'bg-gold-500 text-dark-900' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                    >
                        <ThumbsUp size={16} fill={isLiked ? 'currentColor' : 'none'}/>
                        {likeCount}
                    </button>
                </div>
                
                {/* Clickable Profile Card */}
                <div 
                    onClick={() => onNavigateToProfile && onNavigateToProfile(trade.userId)}
                    className="flex items-center gap-4 bg-slate-800/30 p-4 rounded-xl mb-4 border border-slate-700 cursor-pointer hover:bg-slate-800 transition-colors group"
                >
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-white overflow-hidden">
                        {/* Try to find avatar in mock users if possible */}
                        {(() => {
                             // Assuming MOCK_USERS is not imported, rely on available data or generic
                             return trade.userName.charAt(0);
                        })()}
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-bold text-white group-hover:text-gold-400 transition-colors">{trade.userName}</p>
                        <p className="text-xs text-slate-500">View Full Profile</p>
                    </div>
                    <ChevronRight size={16} className="text-slate-500 group-hover:translate-x-1 transition-transform" />
                </div>

                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{trade.notes}</p>
            </div>
        </div>

        {/* Right Column: AI Review & Comments */}
        <div className="space-y-6">
            
            {/* Mentor Review Card */}
            <div className="glass-panel p-6 rounded-2xl border-l-4 border-gold-500 bg-gradient-to-b from-slate-800/80 to-slate-900/80">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-gold-500 flex items-center justify-center text-dark-900 shadow-lg shadow-gold-500/20">
                        <Award size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-white">Mentor Review</h3>
                        <p className="text-xs text-gold-400 font-medium">Smart Analysis</p>
                    </div>
                </div>
                
                {trade.adminFeedback || trade.adminFeedbackAudio ? (
                    <div className="space-y-4">
                        {trade.adminFeedbackAudio && (
                             <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-3 flex items-center gap-3 mb-2">
                                 <div className="w-10 h-10 rounded-full bg-gold-500/10 flex items-center justify-center text-gold-500 animate-pulse-slow">
                                     <Mic size={20} />
                                 </div>
                                 <div className="flex-1">
                                     <p className="text-xs font-bold text-gold-500 uppercase mb-1">Voice Feedback</p>
                                     <audio src={trade.adminFeedbackAudio} controls className="w-full h-8" />
                                 </div>
                             </div>
                        )}
                        {trade.adminFeedback && (
                            <p className="text-slate-200 text-sm leading-relaxed italic border-l-2 border-slate-700 pl-3">
                                "{trade.adminFeedback}"
                            </p>
                        )}
                        <div className="flex gap-2">
                            <span className="px-3 py-1 bg-green-500/10 text-green-400 text-xs rounded-full border border-green-500/20">Risk Mgmt: Good</span>
                            <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-xs rounded-full border border-blue-500/20">Execution: Precise</span>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8 text-slate-500">
                        <ShieldCheck size={32} className="mx-auto mb-2 opacity-50"/>
                        <p className="text-sm">Review pending...</p>
                    </div>
                )}
            </div>

            {/* Strategy Context */}
            <div className="glass-panel p-6 rounded-2xl">
                <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                    <Target size={16} />
                    Strategy Info
                </h3>
                <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">Setup Type</span>
                        <span className="text-white font-medium">{trade.strategy}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">Timeframe</span>
                        <span className="text-white font-medium">{trade.timeframe}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">Session</span>
                        <span className="text-white font-medium">NY Session</span>
                    </div>
                </div>
            </div>

             {/* Comments Section */}
             <div className="glass-panel p-6 rounded-2xl h-fit">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <MessageCircle size={18} className="text-blue-500"/>
                    Discussion ({comments.length})
                </h3>
                
                {/* List */}
                <div className="space-y-4 mb-6 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                    {comments.length === 0 ? (
                        <div className="text-center py-4 text-slate-500 text-sm">
                            No comments yet. Be the first to analyze this trade!
                        </div>
                    ) : (
                        comments.map(comment => (
                            <div key={comment.id} className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-700 flex-shrink-0 overflow-hidden">
                                    {comment.avatar ? (
                                        <img src={comment.avatar} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">
                                            {comment.userName.charAt(0)}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-sm font-bold text-white">{comment.userName}</span>
                                        <span className="text-[10px] text-slate-500">{new Date(comment.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    </div>
                                    <p className="text-xs text-slate-300 mt-0.5">{comment.text}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Input */}
                <form onSubmit={handleCommentSubmit} className="flex gap-2 relative">
                    <input 
                        type="text" 
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Add a comment..." 
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-3 pr-10 py-2 text-sm text-white focus:border-gold-500 outline-none transition-colors" 
                    />
                    <button 
                        type="submit"
                        disabled={!commentText.trim()}
                        className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 bg-slate-800 hover:bg-gold-500 hover:text-dark-900 rounded-md transition-colors text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send size={14} />
                    </button>
                </form>
             </div>

        </div>
      </div>
    </div>
  );
};

export default TradeDetail;