
import React, { useState, useMemo } from 'react';
import { User, Trade, TradeStrategy } from '../types';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { DollarSign, TrendingUp, Activity, ArrowUpRight, Search, Filter, ChevronDown, ChevronUp, X, Calendar, Clock, Target, ShieldCheck, Trophy, AlertTriangle, Bitcoin } from 'lucide-react';
import TradeDetail from './TradeDetail';
import { TIMEFRAMES } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';

interface DashboardProps {
  user: User;
  trades: Trade[];
  onUpdateTrade: (trade: Trade) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, trades, onUpdateTrade }) => {
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [showChart, setShowChart] = useState(false);
  const [showDateFilter, setShowDateFilter] = useState(false);
  
  // Advanced Filter States
  const [dateRange, setDateRange] = useState<{start: number | null, end: number | null}>({ start: null, end: null });
  const [activePreset, setActivePreset] = useState<string>('all');
  
  const [outcomeFilter, setOutcomeFilter] = useState<'all' | 'win' | 'loss'>('all');
  const [reviewStatus, setReviewStatus] = useState<'all' | 'reviewed' | 'pending'>('all'); 
  const [pairFilter, setPairFilter] = useState<string>('all');
  const [strategyFilter, setStrategyFilter] = useState<string>('all');
  const [timeframeFilter, setTimeframeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { t } = useLanguage();

  // --- Date Logic Helpers ---
  const applyPreset = (preset: string) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const msInDay = 86400000;
    
    let start: number | null = null;
    let end: number | null = now.getTime();

    switch(preset) {
        case 'today':
            start = today;
            break;
        case 'yesterday':
            start = today - msInDay;
            end = today;
            break;
        case '3days':
            start = today - (msInDay * 3);
            break;
        case 'thisWeek':
             const day = now.getDay() || 7; 
             if (day !== 1) now.setHours(-24 * (day - 1));
             now.setHours(0,0,0,0);
             start = now.getTime();
             break;
        case 'lastWeek':
             const prevMonday = new Date(today - (7 + (new Date(today).getDay() || 7) - 1) * msInDay);
             start = prevMonday.getTime();
             end = start + (7 * msInDay);
             break;
        case 'thisMonth':
             start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
             break;
        case 'lastMonth':
             start = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
             end = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
             break;
        case 'ytd':
             start = new Date(now.getFullYear(), 0, 1).getTime();
             break;
        case '2024':
             start = new Date(2024, 0, 1).getTime();
             end = new Date(2025, 0, 1).getTime();
             break;
        case '2023':
             start = new Date(2023, 0, 1).getTime();
             end = new Date(2024, 0, 1).getTime();
             break;
        default:
            start = null;
            end = null;
    }
    setDateRange({ start, end });
    setActivePreset(preset);
  };

  // 1. Filter Data Engine
  const filteredTrades = useMemo(() => {
    let data = trades.filter(t => t.userId === user.id);

    // Advanced Date Filter
    if (dateRange.start) {
        data = data.filter(t => t.closeTime >= dateRange.start!);
    }
    if (dateRange.end) {
        data = data.filter(t => t.closeTime < dateRange.end!);
    }

    // Outcome Filter
    if (outcomeFilter === 'win') data = data.filter(t => t.pnl > 0);
    if (outcomeFilter === 'loss') data = data.filter(t => t.pnl <= 0);

    // Review Status Filter
    if (reviewStatus === 'reviewed') data = data.filter(t => t.status === 'reviewed');
    if (reviewStatus === 'pending') data = data.filter(t => t.status === 'pending');

    // Pair Filter
    if (pairFilter !== 'all') data = data.filter(t => t.pair === pairFilter);

    // Strategy Filter
    if (strategyFilter !== 'all') data = data.filter(t => t.strategy === strategyFilter);

    // Timeframe Filter
    if (timeframeFilter !== 'all') data = data.filter(t => t.timeframe === timeframeFilter);

    // Search
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        data = data.filter(t => 
            t.notes.toLowerCase().includes(q) || 
            t.pair.toLowerCase().includes(q) ||
            t.type.toLowerCase().includes(q) ||
            t.strategy.toLowerCase().includes(q)
        );
    }

    // Sort by Date Descending
    return data.sort((a, b) => b.closeTime - a.closeTime);
  }, [trades, user.id, dateRange, outcomeFilter, reviewStatus, pairFilter, strategyFilter, timeframeFilter, searchQuery]);

  // 2. Calculate Stats with RR
  const totalPnL = filteredTrades.reduce((acc, t) => acc + t.pnl, 0);
  const winCount = filteredTrades.filter(t => t.pnl > 0).length;
  const lossCount = filteredTrades.filter(t => t.pnl <= 0).length;
  const winRate = filteredTrades.length > 0 ? (winCount / filteredTrades.length) * 100 : 0;
  
  // Calculate Total RR (R-Multiples)
  const totalRR = filteredTrades.reduce((acc, t) => {
      // Risk is distance from Entry to SL
      const riskAmount = Math.abs(t.entryPrice - t.stopLoss);
      if (riskAmount === 0) return acc;
      
      let profitAmount = 0;
      if (t.type === 'BUY') profitAmount = t.exitPrice - t.entryPrice;
      else profitAmount = t.entryPrice - t.exitPrice;

      const r = profitAmount / riskAmount;
      return acc + r;
  }, 0);

  // Chart Data
  const chartData = useMemo(() => {
      return [...filteredTrades]
        .sort((a, b) => a.closeTime - b.closeTime)
        .map((t, index, array) => ({
            name: new Date(t.closeTime).toLocaleDateString(undefined, {month:'short', day:'numeric'}),
            pnl: t.pnl,
            cumulative: array.slice(0, index + 1).reduce((sum, curr) => sum + curr.pnl, 0)
        }));
  }, [filteredTrades]);
  
  const availablePairs = Array.from(new Set(trades.map(t => t.pair)));
  const availableStrategies = Array.from(new Set(trades.map(t => t.strategy)));

  // Format Duration helper
  const formatDuration = (ms: number) => {
      const minutes = Math.floor(ms / 60000);
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      if (hours > 0) return `${hours}h ${mins}m`;
      return `${mins}m`;
  };

  // If a trade is selected, show detail view
  if (selectedTrade) {
    return <TradeDetail trade={selectedTrade} currentUser={user} onUpdateTrade={onUpdateTrade} onBack={() => setSelectedTrade(null)} />;
  }

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-serif font-bold text-white mb-2 tracking-tight">{t('dash.analytics')}</h2>
          <p className="text-slate-400 text-sm font-medium flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            {t('dash.realtime')} <span className="text-white font-bold">{user.name}</span>
          </p>
        </div>
        
        <button 
            onClick={() => setShowChart(!showChart)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border transition-all text-sm font-bold shadow-lg ${showChart ? 'bg-gold-500 text-dark-900 border-gold-500 shadow-gold-500/20' : 'glass-panel text-slate-300 hover:text-white hover:border-gold-500/50'}`}
        >
            <TrendingUp size={18} />
            {showChart ? t('dash.equity_curve_hide') : t('dash.equity_curve_show')}
        </button>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Net PnL */}
        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
            <div className="absolute top-0 right-0 p-16 bg-gold-500/10 blur-[50px] rounded-full group-hover:bg-gold-500/20 transition-colors"></div>
            <div className="relative z-10">
                <div className="flex justify-between items-center mb-4">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{t('dash.net_profit')}</p>
                    <div className="p-2 bg-gold-500/20 rounded-lg text-gold-500">
                        <DollarSign size={18} />
                    </div>
                </div>
                <h3 className={`text-3xl font-black ${totalPnL >= 0 ? 'text-white' : 'text-red-400'}`}>
                    ${totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h3>
                <p className="text-xs text-slate-500 mt-1">{t('dash.realized_pnl')}</p>
            </div>
        </div>

        {/* Win Rate */}
        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
            <div className="absolute top-0 right-0 p-16 bg-blue-500/10 blur-[50px] rounded-full group-hover:bg-blue-500/20 transition-colors"></div>
            <div className="relative z-10">
                <div className="flex justify-between items-center mb-4">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{t('dash.win_rate')}</p>
                    <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                        <Trophy size={18} />
                    </div>
                </div>
                <h3 className="text-3xl font-black text-white">{winRate.toFixed(1)}%</h3>
                <div className="w-full bg-dark-900/50 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${winRate}%` }}></div>
                </div>
            </div>
        </div>

        {/* Total RR */}
        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
            <div className="absolute top-0 right-0 p-16 bg-purple-500/10 blur-[50px] rounded-full group-hover:bg-purple-500/20 transition-colors"></div>
            <div className="relative z-10">
                <div className="flex justify-between items-center mb-4">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{t('dash.risk_reward')}</p>
                    <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                        <Target size={18} />
                    </div>
                </div>
                <h3 className="text-3xl font-black text-white">{totalRR.toFixed(2)}R</h3>
                <p className="text-xs text-slate-500 mt-1">{t('dash.accumulated_r')}</p>
            </div>
        </div>

        {/* Profit Factor */}
        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
             <div className="absolute top-0 right-0 p-16 bg-emerald-500/10 blur-[50px] rounded-full group-hover:bg-emerald-500/20 transition-colors"></div>
             <div className="relative z-10">
                <div className="flex justify-between items-center mb-4">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{t('dash.profit_factor')}</p>
                    <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                        <Activity size={18} />
                    </div>
                </div>
                <h3 className="text-3xl font-black text-white">
                    {lossCount === 0 ? '∞' : (Math.abs(totalPnL / (filteredTrades.filter(t=>t.pnl<0).reduce((a,b)=>a+Math.abs(b.pnl),0) || 1))).toFixed(2)}
                </h3>
                <p className="text-xs text-slate-500 mt-1">{t('dash.gross_ratio')}</p>
            </div>
        </div>
      </div>

      {/* Optional Chart Section */}
      {showChart && (
         <div className="glass-panel p-8 rounded-2xl animate-in fade-in slide-in-from-top-4 duration-300 border border-gold-500/20 shadow-glow">
            <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorPnL" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#EAB308" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#EAB308" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.5} />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                        <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} dx={-10} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                            itemStyle={{ color: '#EAB308', fontWeight: 'bold' }}
                            formatter={(value: number) => [`$${value.toFixed(2)}`, 'Cumulative PnL']}
                        />
                        <Area type="monotone" dataKey="cumulative" stroke="#EAB308" strokeWidth={3} fillOpacity={1} fill="url(#colorPnL)" activeDot={{r: 6, fill: '#EAB308', stroke: '#fff', strokeWidth: 2}} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
         </div>
      )}

      {/* MAIN TOOLBAR */}
      <div className="glass-panel rounded-2xl sticky top-4 z-20 backdrop-blur-xl border border-white/10 shadow-2xl">
        <div className="p-4 flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
             {/* Left: Search & Outcome */}
            <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto items-center">
                <div className="relative group w-full md:w-auto md:min-w-[250px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-gold-500 transition-colors" size={16} />
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('dash.search_placeholder')}
                        className="w-full bg-dark-800/80 border border-slate-600 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:border-gold-500 outline-none transition-all shadow-inner"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                            <X size={14} />
                        </button>
                    )}
                </div>

                <div className="flex bg-dark-800/80 p-1.5 rounded-xl border border-slate-600 w-full md:w-auto">
                    {(['all', 'win', 'loss'] as const).map((opt) => (
                        <button
                            key={opt}
                            onClick={() => setOutcomeFilter(opt)}
                            className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                                outcomeFilter === opt
                                ? opt === 'win' ? 'bg-green-600 text-white shadow-lg shadow-green-900/50' : opt === 'loss' ? 'bg-red-600 text-white shadow-lg shadow-red-900/50' : 'bg-slate-600 text-white shadow-lg'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                            }`}
                        >
                            {opt === 'all' && t('dash.filter_all')}
                            {opt === 'win' && t('dash.filter_win')}
                            {opt === 'loss' && t('dash.filter_loss')}
                        </button>
                    ))}
                </div>
            </div>

            {/* Right: Filters */}
            <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-end">
                 
                 {/* Status Dropdown */}
                 <div className="relative group">
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-gold-500 pointer-events-none" size={16} />
                    <select 
                        value={reviewStatus}
                        onChange={(e) => setReviewStatus(e.target.value as any)}
                        className="appearance-none bg-dark-800/80 border border-slate-600 hover:border-gold-500 text-slate-200 text-sm rounded-xl pl-10 pr-8 py-2.5 outline-none focus:ring-2 focus:ring-gold-500/50 transition-all shadow-lg shadow-black/20 cursor-pointer font-medium"
                    >
                        <option value="all">All Statuses</option>
                        <option value="reviewed">Mentor Reviewed</option>
                        <option value="pending">Pending Review</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={14} />
                 </div>

                 {/* Pair Filter Dropdown (Added) */}
                 <div className="relative group">
                    <Bitcoin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
                    <select 
                        value={pairFilter}
                        onChange={(e) => setPairFilter(e.target.value)}
                        className="appearance-none bg-dark-800/80 border border-slate-600 hover:border-gold-500 text-slate-200 text-sm rounded-xl pl-10 pr-8 py-2.5 outline-none focus:ring-2 focus:ring-gold-500/50 transition-all shadow-lg shadow-black/20 cursor-pointer font-medium uppercase"
                    >
                        <option value="all">{t('trade.pair')}</option>
                        {availablePairs.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={14} />
                 </div>

                 {/* Strategy Filter */}
                 <div className="relative group">
                    <Target className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" size={16} />
                    <select 
                        value={strategyFilter}
                        onChange={(e) => setStrategyFilter(e.target.value)}
                        className="appearance-none bg-dark-800/80 border border-slate-600 hover:border-blue-500 text-slate-200 text-sm rounded-xl pl-10 pr-8 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-lg shadow-black/20 cursor-pointer"
                    >
                        <option value="all">{t('trade.strategy')}</option>
                        {availableStrategies.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                     <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={14} />
                 </div>
                 
                 {/* Timeframe Filter */}
                 <div className="relative group">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400 pointer-events-none" size={16} />
                    <select 
                        value={timeframeFilter}
                        onChange={(e) => setTimeframeFilter(e.target.value)}
                        className="appearance-none bg-dark-800/80 border border-slate-600 hover:border-purple-500 text-slate-200 text-sm rounded-xl pl-10 pr-8 py-2.5 outline-none focus:ring-2 focus:ring-purple-500/50 transition-all shadow-lg shadow-black/20 cursor-pointer"
                    >
                        <option value="all">{t('trade.timeframe')}</option>
                        {TIMEFRAMES.map(tf => <option key={tf} value={tf}>{tf}</option>)}
                    </select>
                     <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={14} />
                 </div>

                 <button 
                    onClick={() => setShowDateFilter(!showDateFilter)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all shadow-lg ${showDateFilter ? 'bg-gold-500 text-dark-900 border-gold-500 shadow-gold-500/20' : 'bg-dark-800/80 border-slate-600 text-slate-300 hover:border-white/30'}`}
                >
                     <Calendar size={16} />
                     <span className="hidden sm:inline">Date</span>
                     {activePreset !== 'all' && <span className="bg-dark-900/30 px-2 rounded-full text-xs font-bold">{activePreset}</span>}
                     {showDateFilter ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                 </button>
            </div>
        </div>

        {/* ADVANCED DATE FILTER PANEL */}
        {showDateFilter && (
            <div className="border-t border-slate-700/50 p-6 bg-dark-900/90 animate-in slide-in-from-top-2 backdrop-blur-md">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Custom Range */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Custom Range</label>
                        <div className="flex items-center gap-2">
                            <input 
                                type="date" 
                                className="bg-slate-800 border border-slate-600 text-white text-xs rounded-lg p-2.5 outline-none focus:border-gold-500 w-full transition-colors"
                                onChange={(e) => setDateRange(prev => ({...prev, start: e.target.valueAsNumber}))}
                            />
                            <span className="text-slate-500">→</span>
                            <input 
                                type="date" 
                                className="bg-slate-800 border border-slate-600 text-white text-xs rounded-lg p-2.5 outline-none focus:border-gold-500 w-full transition-colors"
                                onChange={(e) => setDateRange(prev => ({...prev, end: e.target.valueAsNumber}))}
                            />
                        </div>
                        <button onClick={() => {setDateRange({start:null, end:null}); setActivePreset('all')}} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 mt-2">
                            <X size={12}/> Clear Filters
                        </button>
                    </div>

                    {/* Presets */}
                    <div>
                         <label className="text-xs font-bold text-slate-500 uppercase mb-3 block tracking-wider">Quick Select</label>
                         <div className="grid grid-cols-2 gap-2">
                            {['today', 'yesterday', '3days', 'thisWeek'].map(p => (
                                <button key={p} onClick={() => applyPreset(p)} className={`px-3 py-2 rounded-lg border text-xs transition-all ${activePreset === p ? 'bg-gold-500 border-gold-500 text-dark-900 font-bold' : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'}`}>
                                    {p.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim()}
                                </button>
                            ))}
                         </div>
                    </div>
                     <div>
                         <label className="text-xs font-bold text-slate-500 uppercase mb-3 block tracking-wider">Monthly</label>
                         <div className="grid grid-cols-2 gap-2">
                            {['lastWeek', 'thisMonth', 'lastMonth', 'ytd'].map(p => (
                                <button key={p} onClick={() => applyPreset(p)} className={`px-3 py-2 rounded-lg border text-xs transition-all ${activePreset === p ? 'bg-gold-500 border-gold-500 text-dark-900 font-bold' : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'}`}>
                                    {p.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim()}
                                </button>
                            ))}
                         </div>
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* Trade List Table - Floating Card Style */}
      <div className="space-y-4">
            {filteredTrades.map((trade) => {
                const risk = Math.abs(trade.entryPrice - trade.stopLoss);
                const profit = trade.type === 'BUY' ? trade.exitPrice - trade.entryPrice : trade.entryPrice - trade.exitPrice;
                const rMultiple = risk > 0 ? (profit / risk) : 0;
                const duration = trade.closeTime - trade.openTime;

                return (
                    <div 
                        key={trade.id} 
                        onClick={() => setSelectedTrade(trade)}
                        className="glass-panel-hover rounded-xl p-4 flex flex-wrap items-center gap-4 cursor-pointer relative overflow-hidden group border-l-4 border-l-transparent hover:border-l-gold-500"
                    >
                        {/* Background Hover Glow */}
                        <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none ${trade.pnl >= 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>

                        {/* Date */}
                        <div className="w-24 flex-shrink-0">
                            <span className="block text-white font-bold text-sm">{new Date(trade.closeTime).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
                            <span className="text-xs text-slate-500">{new Date(trade.closeTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>

                        {/* Pair & Strat */}
                        <div className="w-32 flex-shrink-0">
                             <span className="text-xs font-bold text-slate-300 block mb-1">{trade.pair}</span>
                             <span className="text-[10px] uppercase font-bold text-gold-500 bg-gold-500/10 px-2 py-0.5 rounded border border-gold-500/20">{trade.strategy}</span>
                        </div>

                        {/* Type & Timeframe */}
                        <div className="w-20 flex-shrink-0 flex flex-col items-start gap-1">
                            <span className={`font-black text-xs px-2 py-1 rounded ${trade.type === 'BUY' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                {trade.type}
                            </span>
                             <span className="text-[10px] font-mono text-slate-500 border border-slate-700 px-1 rounded bg-dark-900">{trade.timeframe}</span>
                        </div>

                        {/* Prices */}
                        <div className="w-40 flex-shrink-0 text-xs font-mono">
                             <div className="flex justify-between mb-1"><span className="text-slate-500">In:</span> <span className="text-white">{trade.entryPrice}</span></div>
                             <div className="flex justify-between"><span className="text-slate-500">Out:</span> <span className="text-white">{trade.exitPrice}</span></div>
                        </div>

                        {/* RR & Duration */}
                        <div className="w-32 flex-shrink-0">
                             <div className={`font-bold font-mono text-sm mb-1 ${rMultiple >= 0 ? 'text-green-400' : 'text-red-400'}`}>{rMultiple.toFixed(2)}R</div>
                             <div className="flex items-center gap-1 text-slate-500 text-xs">
                                <Clock size={10}/> {formatDuration(duration)}
                             </div>
                        </div>

                        {/* PnL - BIG POP */}
                        <div className="flex-1 text-right min-w-[100px]">
                            <span className={`font-black text-xl tracking-tight ${trade.pnl >= 0 ? 'text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.3)]' : 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.3)]'}`}>
                                {trade.pnl >= 0 ? '+' : ''}{trade.pnl}
                            </span>
                            <span className="text-xs text-slate-500 block">PIPS</span>
                        </div>

                        {/* Status Icon */}
                        <div className="w-10 flex justify-end">
                             {trade.status === 'reviewed' ? (
                                <div title="Mentor Reviewed" className="w-8 h-8 rounded-full bg-gold-500/20 flex items-center justify-center text-gold-500 shadow-[0_0_10px_rgba(234,179,8,0.2)]">
                                    <ShieldCheck size={16} />
                                </div>
                             ) : (
                                <div title="Pending Review" className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-600">
                                    <Clock size={16} />
                                </div>
                             )}
                        </div>
                    </div>
                )
            })}
            
            {filteredTrades.length === 0 && (
                <div className="glass-panel p-16 text-center rounded-2xl">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                        <Search size={64} className="mb-6 opacity-20 text-gold-500" />
                        <p className="text-xl font-medium text-white">{t('dash.no_trades')}</p>
                    </div>
                </div>
            )}
      </div>
    </div>
  );
};

export default Dashboard;
