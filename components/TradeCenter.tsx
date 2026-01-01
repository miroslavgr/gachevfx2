
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Trade, TradeStatus, User, TradeStrategy } from '../types';
import { Upload, Video, Filter, ThumbsUp, MessageCircle, Eye, Clock, AlertCircle, UserPlus, Check, ChevronRight, User as UserIcon, Users, Bitcoin } from 'lucide-react';
import { reviewTrade } from '../services/geminiService';
import TradeDetail from './TradeDetail';
import { MOCK_USERS, TIMEFRAMES } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';
import { TradeService } from '../services/api';

interface TradeCenterProps {
  currentUser: User;
  trades: Trade[];
  setTrades: React.Dispatch<React.SetStateAction<Trade[]>>;
  initialTradeId?: string | null;
  onTradeClosed?: () => void;
  onUpdateUser: (user: User) => void;
  onNavigateToProfile?: (userId: string) => void;
  onUpdateTrade: (trade: Trade) => void;
}

const TradeCenter: React.FC<TradeCenterProps> = ({ currentUser, trades, setTrades, initialTradeId, onTradeClosed, onUpdateUser, onNavigateToProfile, onUpdateTrade }) => {
  const [view, setView] = useState<'feed' | 'upload'>('feed');
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null); // Detail view state
  const [outcomeFilter, setOutcomeFilter] = useState<'all' | 'wins' | 'losses'>('all');
  const [userFilter, setUserFilter] = useState<string>('all'); // 'all', 'following', or specific userId
  const [pairFilter, setPairFilter] = useState<string>('all');
  const [isReviewing, setIsReviewing] = useState(false);
  const { t } = useLanguage();
  
  // Effect to handle deep linking from notifications or other parts of app
  useEffect(() => {
    if (initialTradeId) {
        const trade = trades.find(t => t.id === initialTradeId);
        if (trade) {
            setSelectedTrade(trade);
        }
    }
  }, [initialTradeId, trades]);

  const handleCloseDetail = () => {
    setSelectedTrade(null);
    if (onTradeClosed) onTradeClosed();
  };

  const toggleFollow = (targetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let newFollowing = [...currentUser.following];
    if (newFollowing.includes(targetId)) {
        newFollowing = newFollowing.filter(id => id !== targetId);
    } else {
        newFollowing.push(targetId);
    }
    onUpdateUser({ ...currentUser, following: newFollowing });
  };
  
  // Upload State
  const [pair, setPair] = useState('XAUUSD');
  const [strategy, setStrategy] = useState<TradeStrategy>('Breakout'); // Strategy State
  const [timeframe, setTimeframe] = useState(TIMEFRAMES[1]); // Default to 5m
  const [type, setType] = useState<'BUY' | 'SELL'>('BUY');
  const [entry, setEntry] = useState('');
  const [exit, setExit] = useState('');
  const [sl, setSl] = useState('');
  
  // Dates
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 3600000);
  const toLocalISO = (d: Date) => d.toISOString().slice(0, 16);

  const [openTime, setOpenTime] = useState(toLocalISO(oneHourAgo));
  const [closeTime, setCloseTime] = useState(toLocalISO(now));
  
  const [notes, setNotes] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [postPrivacy, setPostPrivacy] = useState<'public' | 'private'>(currentUser.privacy); // Default to user preference

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get available pairs for filter
  const availablePairs = useMemo(() => Array.from(new Set(trades.map(t => t.pair))), [trades]);
const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    // REMOVED: setIsReviewing(true); -> We don't need to show "Analysis in progress" anymore

    try {
        // 1. Prepare Data
        const entryPrice = parseFloat(entry);
        const exitPrice = parseFloat(exit);
        const slPrice = parseFloat(sl);
        const pnl = type === 'BUY' ? (exitPrice - entryPrice) * 10 : (entryPrice - exitPrice) * 10;
        
        const openTs = new Date(openTime).getTime();
        const closeTs = new Date(closeTime).getTime();

        // 2. HANDLE IMAGE (Real Upload)
        let publicImageUrl = undefined;
        // Note: We don't need base64ForAI anymore since we aren't calling Gemini here

        if (selectedImage) {
            // Upload to Firebase Storage for the App
            publicImageUrl = await TradeService.uploadImage(selectedImage);
        }

        const newTrade: Trade = {
            id: Date.now().toString(),
            userId: currentUser.id,
            userName: currentUser.name,
            pair,
            type,
            timeframe,
            entryPrice,
            exitPrice,
            stopLoss: slPrice,
            pnl,
            strategy,
            notes,
            status: TradeStatus.PENDING, // <--- Stays PENDING until you review it
            openTime: openTs,
            closeTime: closeTs,
            timestamp: closeTs,
            imageUrl: publicImageUrl,
            likes: [],
            comments: []
        };

        // --- REMOVED: AUTOMATIC AI REVIEW BLOCK --- 
        // The trade is now pure "user input" and waits for admin.

        // 3. SAVE TO DATABASE
        await TradeService.createTrade(newTrade);

        // 4. Update UI
        setTrades([newTrade, ...trades]); 
        // REMOVED: setIsReviewing(false);
        setView('feed');
        
        // Reset form
        setEntry(''); setExit(''); setSl(''); setNotes(''); setSelectedImage(null);

    } catch (error) {
        console.error("Upload Error", error);
        alert("Failed to publish trade. Check console.");
        // REMOVED: setIsReviewing(false);
    }
  };

  // Render detail view if selected
  if (selectedTrade) {
      return (
        <TradeDetail 
            trade={selectedTrade} 
            currentUser={currentUser}
            onBack={handleCloseDetail} 
            onNavigateToProfile={onNavigateToProfile}
            onUpdateTrade={onUpdateTrade}
        />
      );
  }

  // Filter Logic
  const filteredTrades = trades.filter(t => {
    // 1. Outcome Filter
    if (outcomeFilter === 'wins' && t.pnl <= 0) return false;
    if (outcomeFilter === 'losses' && t.pnl > 0) return false;

    // 2. User Filter
    if (userFilter === 'following') {
        if (!currentUser.following.includes(t.userId)) return false;
    } else if (userFilter !== 'all') {
        if (t.userId !== userFilter) return false;
    }

    // 3. Pair Filter
    if (pairFilter !== 'all' && t.pair !== pairFilter) return false;

    // 4. Privacy / Visibility (simplified for demo)
    if (userFilter === 'all') {
        const tradeOwner = MOCK_USERS.find(u => u.id === t.userId);
        if (t.userId === currentUser.id) return true;
        return tradeOwner ? tradeOwner.privacy === 'public' : true;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-4xl font-serif font-bold text-white">{t('trade.center')}</h2>
        <div className="flex gap-2">
            <button 
                onClick={() => setView('feed')}
                className={`px-5 py-2.5 rounded-xl transition-all font-bold ${view === 'feed' ? 'bg-gold-500 text-dark-900 shadow-glow' : 'glass-panel text-slate-300 hover:text-white'}`}
            >
                {t('trade.feed')}
            </button>
            <button 
                onClick={() => setView('upload')}
                className={`px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 font-bold ${view === 'upload' ? 'bg-gold-500 text-dark-900 shadow-glow' : 'glass-panel text-slate-300 hover:text-white'}`}
            >
                <Upload size={18} />
                {t('trade.post')}
            </button>
        </div>
      </div>

      {view === 'upload' ? (
        <div className="max-w-3xl mx-auto glass-panel p-8 rounded-2xl border-gold-500/20 shadow-glow-lg">
          <div className="flex items-center gap-3 mb-8 text-gold-400 bg-gold-500/10 p-4 rounded-xl border border-gold-500/20">
             <AlertCircle size={24} />
             <div>
                 <p className="font-bold">{t('trade.upload_title')}</p>
                 <p className="text-xs text-gold-400/80">{t('trade.protocol_desc')}</p>
             </div>
          </div>

          <form onSubmit={handleUpload} className="space-y-8">
             {/* Row 1: Basic Info */}
             <div className="grid grid-cols-3 gap-6">
                <div>
                    <label className="block text-slate-400 mb-2 text-xs uppercase font-bold tracking-wider">{t('trade.pair')}</label>
                    <div className="relative">
                        <select 
                            value={pair} 
                            onChange={(e) => setPair(e.target.value)}
                            className="w-full bg-dark-800 border border-slate-600 rounded-xl p-3.5 text-white focus:border-gold-500 outline-none appearance-none"
                        >
                            <option>XAUUSD</option>
                            <option>EURUSD</option>
                            <option>US30</option>
                            <option>BTCUSD</option>
                        </select>
                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-slate-500 pointer-events-none" size={16}/>
                    </div>
                </div>
                <div>
                    <label className="block text-slate-400 mb-2 text-xs uppercase font-bold tracking-wider">{t('trade.strategy')}</label>
                    <div className="relative">
                        <select 
                            value={strategy} 
                            onChange={(e) => setStrategy(e.target.value as TradeStrategy)}
                            className="w-full bg-dark-800 border border-slate-600 rounded-xl p-3.5 text-white focus:border-gold-500 outline-none appearance-none"
                        >
                            <option>Breakout</option>
                            <option>Wick Fill</option>
                            <option>Flip</option>
                            <option>News</option>
                        </select>
                         <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-slate-500 pointer-events-none" size={16}/>
                    </div>
                </div>
                <div>
                    <label className="block text-slate-400 mb-2 text-xs uppercase font-bold tracking-wider">{t('trade.timeframe')}</label>
                    <div className="relative">
                        <select 
                            value={timeframe} 
                            onChange={(e) => setTimeframe(e.target.value)}
                            className="w-full bg-dark-800 border border-slate-600 rounded-xl p-3.5 text-white focus:border-gold-500 outline-none appearance-none"
                        >
                            {TIMEFRAMES.map(tf => (
                                <option key={tf} value={tf}>{tf}</option>
                            ))}
                        </select>
                         <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-slate-500 pointer-events-none" size={16}/>
                    </div>
                </div>
             </div>
             
             {/* Type Buttons */}
             <div>
                <label className="block text-slate-400 mb-2 text-xs uppercase font-bold tracking-wider">{t('trade.direction')}</label>
                <div className="flex gap-4">
                    <button 
                        type="button"
                        onClick={() => setType('BUY')}
                        className={`flex-1 p-4 rounded-xl font-bold transition-all ${type === 'BUY' ? 'bg-green-600 text-white shadow-lg shadow-green-900/50 scale-[1.02]' : 'bg-dark-800 border border-slate-700 text-slate-400 hover:border-green-500/50'}`}
                    >
                        {t('trade.buy')}
                    </button>
                    <button 
                            type="button"
                        onClick={() => setType('SELL')}
                        className={`flex-1 p-4 rounded-xl font-bold transition-all ${type === 'SELL' ? 'bg-red-600 text-white shadow-lg shadow-red-900/50 scale-[1.02]' : 'bg-dark-800 border border-slate-700 text-slate-400 hover:border-red-500/50'}`}
                    >
                        {t('trade.sell')}
                    </button>
                </div>
            </div>

             {/* Row 2: Price Data */}
             <div className="grid grid-cols-3 gap-6">
                 <div>
                    <label className="block text-slate-400 mb-2 text-xs uppercase font-bold tracking-wider">{t('trade.entry')}</label>
                    <input 
                        type="number" 
                        step="0.01"
                        value={entry}
                        onChange={(e) => setEntry(e.target.value)}
                        className="w-full bg-dark-800 border border-slate-600 rounded-xl p-3.5 text-white focus:border-gold-500 outline-none font-mono text-lg"
                        placeholder="0.00"
                        required
                    />
                 </div>
                 <div>
                    <label className="block text-slate-400 mb-2 text-xs uppercase font-bold tracking-wider text-red-400">{t('trade.sl')}</label>
                    <input 
                        type="number" 
                        step="0.01"
                        value={sl}
                        onChange={(e) => setSl(e.target.value)}
                        className="w-full bg-dark-800 border border-red-900/50 rounded-xl p-3.5 text-white focus:border-red-500 outline-none font-mono text-lg"
                        placeholder="0.00"
                        required
                    />
                 </div>
                 <div>
                    <label className="block text-slate-400 mb-2 text-xs uppercase font-bold tracking-wider text-green-400">{t('trade.tp')}</label>
                    <input 
                        type="number" 
                        step="0.01"
                        value={exit}
                        onChange={(e) => setExit(e.target.value)}
                        className="w-full bg-dark-800 border border-green-900/50 rounded-xl p-3.5 text-white focus:border-green-500 outline-none font-mono text-lg"
                        placeholder="0.00"
                        required
                    />
                 </div>
             </div>

             {/* Row 3: Time Data */}
             <div className="grid grid-cols-2 gap-6">
                 <div>
                    <label className="block text-slate-400 mb-2 text-xs uppercase font-bold tracking-wider">{t('trade.open_time')}</label>
                    <input 
                        type="datetime-local" 
                        value={openTime}
                        onChange={(e) => setOpenTime(e.target.value)}
                        className="w-full bg-dark-800 border border-slate-600 rounded-xl p-3.5 text-white focus:border-gold-500 outline-none"
                        required
                    />
                 </div>
                 <div>
                    <label className="block text-slate-400 mb-2 text-xs uppercase font-bold tracking-wider">{t('trade.close_time')}</label>
                    <input 
                        type="datetime-local" 
                        value={closeTime}
                        onChange={(e) => setCloseTime(e.target.value)}
                        className="w-full bg-dark-800 border border-slate-600 rounded-xl p-3.5 text-white focus:border-gold-500 outline-none"
                        required
                    />
                 </div>
             </div>

             <div>
                <label className="block text-slate-400 mb-2 text-xs uppercase font-bold tracking-wider">{t('trade.notes')}</label>
                <textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-dark-800 border border-slate-600 rounded-xl p-4 text-white focus:border-gold-500 outline-none h-32 resize-none leading-relaxed"
                    placeholder={t('trade.notes_placeholder')}
                    required
                />
             </div>

             <div>
                <label className="block text-slate-400 mb-2 text-xs uppercase font-bold tracking-wider">{t('trade.media')}</label>
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-600 rounded-xl p-10 text-center cursor-pointer hover:border-gold-500 hover:bg-gold-500/5 transition-all group"
                >
                    {selectedImage ? (
                        <p className="text-gold-500 font-bold text-lg">{selectedImage.name}</p>
                    ) : (
                        <div className="flex flex-col items-center gap-3 text-slate-500 group-hover:text-gold-400 transition-colors">
                            <Upload size={40} />
                            <p className="font-medium">{t('trade.drop_media')}</p>
                        </div>
                    )}
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*,video/*"
                        onChange={(e) => {
                            if (e.target.files?.[0]) setSelectedImage(e.target.files[0]);
                        }}
                    />
                </div>
             </div>

             <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                 <p className="text-xs font-bold text-slate-500 uppercase mb-2">{t('trade.visibility')}</p>
                 <div className="flex gap-4">
                     <label className="flex items-center gap-2 cursor-pointer">
                         <input type="radio" name="privacy" checked={postPrivacy === 'public'} onChange={() => setPostPrivacy('public')} className="accent-gold-500" />
                         <span className="text-sm text-white">{t('trade.vis_public')}</span>
                     </label>
                     <label className="flex items-center gap-2 cursor-pointer">
                         <input type="radio" name="privacy" checked={postPrivacy === 'private'} onChange={() => setPostPrivacy('private')} className="accent-gold-500" />
                         <span className="text-sm text-white">{t('trade.vis_private')}</span>
                     </label>
                 </div>
             </div>

             <button 
                type="submit" 
                disabled={isReviewing}
                className="w-full py-4 bg-yellow-500 text-dark-900 text-lg font-black rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide"
             >
                {isReviewing ? 'Analysis in Progress...' : t('trade.submit')}
             </button>
          </form>
        </div>
      ) : (
        <div className="space-y-8">
            {/* Filters */}
            <div className="flex flex-col gap-4 mb-8">
                {/* Type Filter */}
                <div className="flex gap-4 border-b border-slate-800 pb-4 overflow-x-auto">
                    <button onClick={() => setOutcomeFilter('all')} className={`px-6 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${outcomeFilter === 'all' ? 'bg-white text-dark-900 shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'text-slate-500 hover:text-white'}`}>{t('dash.filter_all')}</button>
                    <button onClick={() => setOutcomeFilter('wins')} className={`px-6 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${outcomeFilter === 'wins' ? 'bg-green-500 text-dark-900 shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'text-slate-500 hover:text-green-400'}`}>{t('dash.filter_win')}</button>
                    <button onClick={() => setOutcomeFilter('losses')} className={`px-6 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${outcomeFilter === 'losses' ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'text-slate-500 hover:text-red-400'}`}>{t('dash.filter_loss')}</button>
                </div>
                
                {/* Secondary Filters */}
                <div className="flex flex-wrap gap-2 items-center">
                    {/* User Filter */}
                    <div className="flex items-center bg-dark-800 rounded-xl p-1 border border-slate-700">
                        <span className="text-[10px] font-bold text-slate-500 uppercase px-2">{t('trade.filter_user')}</span>
                        <button 
                            onClick={() => setUserFilter('all')} 
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${userFilter === 'all' ? 'bg-gold-500 text-dark-900' : 'text-slate-400 hover:text-white'}`}
                        >
                            {t('trade.everyone')}
                        </button>
                        <button 
                            onClick={() => setUserFilter('following')} 
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${userFilter === 'following' ? 'bg-gold-500 text-dark-900' : 'text-slate-400 hover:text-white'}`}
                        >
                            {t('trade.following')}
                        </button>
                    </div>

                    {/* Pair Filter Dropdown */}
                    <div className="relative group">
                        <Bitcoin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={14} />
                        <select 
                            value={pairFilter}
                            onChange={(e) => setPairFilter(e.target.value)}
                            className="appearance-none bg-dark-800 border border-slate-700 hover:border-gold-500 text-slate-200 text-xs rounded-xl pl-9 pr-8 py-2 outline-none focus:ring-2 focus:ring-gold-500/50 transition-all cursor-pointer font-bold uppercase"
                        >
                            <option value="all">{t('trade.pair')}</option>
                            {availablePairs.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-slate-500 pointer-events-none" size={12} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {filteredTrades.map((trade) => {
                    const isFollowing = currentUser.following.includes(trade.userId);

                    return (
                        <div 
                            key={trade.id} 
                            onClick={() => setSelectedTrade(trade)}
                            className="glass-panel-hover rounded-2xl p-0 overflow-hidden cursor-pointer group border border-slate-800 hover:border-gold-500/30"
                        >
                            <div className="p-6">
                                {/* Header */}
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-xl font-bold text-white border border-slate-600">
                                                {trade.userName.charAt(0)}
                                            </div>
                                            {/* Status Dot */}
                                            {trade.status === 'reviewed' && (
                                                <div className="absolute -bottom-1 -right-1 bg-gold-500 text-dark-900 p-0.5 rounded-full border border-dark-900">
                                                    <Check size={12} />
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h3 className="font-bold text-lg text-white group-hover:text-gold-400 transition-colors">{trade.userName}</h3>
                                                {trade.userId !== currentUser.id && (
                                                    <button 
                                                        onClick={(e) => toggleFollow(trade.userId, e)}
                                                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${isFollowing ? 'bg-gold-500 text-dark-900' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                                                    >
                                                        {isFollowing ? 'Following' : 'Follow'}
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                                                <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300 border border-slate-700">{trade.pair}</span>
                                                <span>•</span>
                                                <span className="font-mono text-gold-500">{trade.timeframe}</span>
                                                <span>•</span>
                                                <span className="uppercase font-bold">{trade.strategy}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="text-right">
                                        <div className={`text-2xl font-black ${trade.pnl >= 0 ? 'text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.2)]' : 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.2)]'}`}>
                                            {trade.pnl >= 0 ? '+' : ''}{trade.pnl}
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pips</span>
                                    </div>
                                </div>

                                {/* Content */}
                                <p className="text-slate-300 mb-6 line-clamp-2 text-sm leading-relaxed border-l-2 border-slate-700 pl-4">
                                    {trade.notes}
                                </p>
                                
                                {trade.imageUrl && (
                                    <div className="mb-6 rounded-xl overflow-hidden border border-slate-700/50 relative h-48 group-hover:border-gold-500/20 transition-colors">
                                        <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-transparent to-transparent opacity-50"></div>
                                        <img src={trade.imageUrl} alt="Chart" className="w-full h-full object-cover" />
                                        <div className="absolute bottom-3 right-3 bg-dark-900/80 backdrop-blur px-3 py-1 rounded-lg text-xs font-bold text-white border border-white/10">
                                            View Chart
                                        </div>
                                    </div>
                                )}

                                {/* AI Review Snippet */}
                                {trade.adminFeedback && (
                                    <div className="bg-gradient-to-r from-blue-900/20 to-transparent border-l-2 border-blue-500 p-3 mb-4 rounded-r-lg">
                                        <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">
                                            <Eye size={12} />
                                            Mentor Insight
                                        </div>
                                        <p className="text-slate-400 text-xs italic truncate">"{trade.adminFeedback}"</p>
                                    </div>
                                )}
                            </div>

                            {/* Footer Actions */}
                            <div className="bg-dark-800/50 px-6 py-3 flex items-center justify-between border-t border-slate-800/50 group-hover:border-gold-500/10 transition-colors">
                                <div className="flex gap-6">
                                    <button className="flex items-center gap-2 text-slate-400 hover:text-gold-500 transition-colors text-sm font-medium">
                                        <ThumbsUp size={16} /> {trade.likes?.length || 0} Like
                                    </button>
                                    <button className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium">
                                        <MessageCircle size={16} /> {trade.comments?.length || 0} Discuss
                                    </button>
                                </div>
                                <button className="flex items-center gap-1 text-gold-500 text-xs font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                                    Full Analysis <ChevronRight size={12} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      )}
    </div>
  );
};

export default TradeCenter;
