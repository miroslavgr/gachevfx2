
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Trade, TradeStatus, MentorOutlook, OutlookType, RegistrationToken } from '../types';
import { Shield, Clock, CheckCircle, XCircle, Edit3, Save, Plus, Trash2, Zap, TrendingUp, TrendingDown, Minus, Calendar, ChevronDown, Activity, ArrowUpRight, Globe, Sun, Moon, Mic, Square, Play, RefreshCw, X, Search, Filter, ChevronUp, Target, Brain, Key, Copy } from 'lucide-react';
import { reviewTrade } from '../services/geminiService';
import { AdminService } from '../services/api';
import { TIMEFRAMES } from '../constants';
import { OutlookService } from '../services/api';

interface AdminPanelProps {
  trades: Trade[];
  setTrades: React.Dispatch<React.SetStateAction<Trade[]>>;
  outlooks: MentorOutlook[];
  setOutlooks: React.Dispatch<React.SetStateAction<MentorOutlook[]>>;
  mentorInstruction: string;
  setMentorInstruction: (instruction: string) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ trades, setTrades, outlooks, setOutlooks, mentorInstruction, setMentorInstruction }) => {
  const [activeTab, setActiveTab] = useState<'reviews' | 'outlook' | 'access'>('reviews');
  const [reviewNote, setReviewNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);

  // --- ACCESS TOKENS STATE ---
  const [tokens, setTokens] = useState<RegistrationToken[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(false);

  // --- FILTER STATES ---
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'reviewed' | 'rejected'>('pending');
  const [outcomeFilter, setOutcomeFilter] = useState<'all' | 'win' | 'loss'>('all'); 
  const [timeframeFilter, setTimeframeFilter] = useState<string>('all'); 
  const [dateRange, setDateRange] = useState<{start: number | null, end: number | null}>({ start: null, end: null });
  const [activePreset, setActivePreset] = useState<string>('all');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [strategyFilter, setStrategyFilter] = useState<string>('all');
  const [showPersonaConfig, setShowPersonaConfig] = useState(false);

  // --- AUDIO RECORDING STATE ---
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // --- FETCH TOKENS ---
  useEffect(() => {
      if (activeTab === 'access') {
          loadTokens();
      }
  }, [activeTab]);

  const loadTokens = async () => {
      setLoadingTokens(true);
      const res = await AdminService.getTokens();
      if (res.success && res.data) {
          setTokens(res.data);
      }
      setLoadingTokens(false);
  };

  const handleGenerateToken = async () => {
      setLoadingTokens(true);
      const res = await AdminService.generateToken('1'); // Mock Admin ID
      if (res.success) {
          await loadTokens();
      }
      setLoadingTokens(false);
  };

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      alert("Copied to clipboard!");
  };

  // --- OUTLOOK EDIT LOGIC ---
  const [selectedOutlookType, setSelectedOutlookType] = useState<OutlookType>('daily');
  const [editingOutlookId, setEditingOutlookId] = useState<string>('new');
  
  // Filter available outlooks for the dropdown
  const filteredOutlooks = useMemo(() => {
      return outlooks.filter(o => o.type === selectedOutlookType).sort((a,b) => b.timestamp - a.timestamp);
  }, [outlooks, selectedOutlookType]);

  const emptyOutlook: MentorOutlook = {
      id: '',
      type: selectedOutlookType,
      title: '',
      date: new Date().toISOString().slice(0, 10),
      timestamp: Date.now(),
      bias: 'neutral',
      summary: '',
      levels: [],
      timeline: [],
      notes: [],
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
      sessionName: 'New York',
      startHour: 13,
      endHour: 21,
  };

  const [editedOutlook, setEditedOutlook] = useState<MentorOutlook>(emptyOutlook);

  // When type or ID changes, update the form
  useEffect(() => {
      if (editingOutlookId === 'new') {
          const newTemplate = { ...emptyOutlook, type: selectedOutlookType };
          setEditedOutlook(newTemplate);
      } else {
          const found = outlooks.find(o => o.id === editingOutlookId);
          if (found) setEditedOutlook(found);
      }
  }, [editingOutlookId, selectedOutlookType, outlooks]);

  // --- AUTO TITLE GENERATION ---
  useEffect(() => {
      if (editingOutlookId === 'new' || true) { 
          let newTitle = '';
          const d = editedOutlook.date;
          
          if (selectedOutlookType === 'daily') {
              newTitle = `Daily Briefing - ${d}`;
          } else if (selectedOutlookType === 'session') {
              newTitle = `${editedOutlook.sessionName} Session - ${d}`;
          } else if (selectedOutlookType === 'weekly') {
              newTitle = `Weekly Roadmap (${editedOutlook.startDate} / ${editedOutlook.endDate})`;
          } else if (selectedOutlookType === 'monthly') {
              newTitle = `Monthly Outlook (${editedOutlook.startDate} / ${editedOutlook.endDate})`;
          }
          
          setEditedOutlook(prev => {
              if (prev.title !== newTitle) return { ...prev, title: newTitle };
              return prev;
          });
      }
  }, [
      selectedOutlookType, 
      editedOutlook.date, 
      editedOutlook.startDate, 
      editedOutlook.endDate, 
      editedOutlook.sessionName,
      editingOutlookId
  ]);

  const handleSessionChange = (session: 'Asia' | 'London' | 'New York') => {
      let start = 0, end = 8;
      if (session === 'London') { start = 8; end = 16; }
      if (session === 'New York') { start = 13; end = 21; }
      
      setEditedOutlook(prev => ({
          ...prev,
          sessionName: session,
          startHour: start,
          endHour: end,
      }));
  };
const saveOutlook = async () => {
    const isNew = editingOutlookId === 'new';
    const outlookToSave = {
        ...editedOutlook,
        id: isNew ? Date.now().toString() : editedOutlook.id
    };

    // 1. Save to Firestore
    await OutlookService.save(outlookToSave);

    // 2. Update Local State (So you see changes immediately)
    if (isNew) {
        setOutlooks([outlookToSave, ...outlooks]);
        setEditingOutlookId(outlookToSave.id);
    } else {
        setOutlooks(outlooks.map(o => o.id === outlookToSave.id ? outlookToSave : o));
    }

    alert(`Outlook saved successfully.`);
  };
  
  const deleteOutlook = async () => {
      if (editingOutlookId === 'new') return;
      
      if (confirm("Are you sure you want to delete this outlook?")) {
          // 1. Delete from Firestore
          await OutlookService.delete(editingOutlookId);

          // 2. Update Local State
          setOutlooks(outlooks.filter(o => o.id !== editingOutlookId));
          setEditingOutlookId('new');
      }
  };


  // --- FILTERING LOGIC ---
  
  const applyPreset = (preset: string) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const msInDay = 86400000;
    
    let start: number | null = null;
    let end: number | null = now.getTime();

    switch(preset) {
        case 'today': start = today; break;
        case 'yesterday': start = today - msInDay; end = today; break;
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
        case 'thisMonth': start = new Date(now.getFullYear(), now.getMonth(), 1).getTime(); break;
        default: start = null; end = null;
    }
    setDateRange({ start, end });
    setActivePreset(preset);
  };

  const filteredTrades = useMemo(() => {
      let data = trades;

      // Status Filter
      if (statusFilter !== 'all') {
          data = data.filter(t => t.status === statusFilter);
      }

      // Date Range
      if (dateRange.start) data = data.filter(t => t.closeTime >= dateRange.start!);
      if (dateRange.end) data = data.filter(t => t.closeTime < dateRange.end!);

      // Outcome
      if (outcomeFilter === 'win') data = data.filter(t => t.pnl > 0);
      if (outcomeFilter === 'loss') data = data.filter(t => t.pnl <= 0);

      // Strategy
      if (strategyFilter !== 'all') data = data.filter(t => t.strategy === strategyFilter);

      // Timeframe
      if (timeframeFilter !== 'all') data = data.filter(t => t.timeframe === timeframeFilter);

      // Search
      if (searchQuery) {
          const q = searchQuery.toLowerCase();
          data = data.filter(t => 
            t.userName.toLowerCase().includes(q) ||
            t.pair.toLowerCase().includes(q) ||
            t.notes.toLowerCase().includes(q)
          );
      }

      return data.sort((a,b) => b.timestamp - a.timestamp);
  }, [trades, statusFilter, dateRange, outcomeFilter, strategyFilter, timeframeFilter, searchQuery]);

  const availableStrategies = Array.from(new Set(trades.map(t => t.strategy)));
  const availableTimeframes = TIMEFRAMES;

  // --- RECORDING FUNCTIONS ---
  const startRecording = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;
          audioChunksRef.current = [];

          mediaRecorder.ondataavailable = (event) => {
              if (event.data.size > 0) audioChunksRef.current.push(event.data);
          };

          mediaRecorder.onstop = () => {
              const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
              const audioUrl = URL.createObjectURL(audioBlob);
              setAudioBlobUrl(audioUrl);
              const reader = new FileReader();
              reader.readAsDataURL(audioBlob);
              reader.onloadend = () => {
                  setAudioBase64(reader.result as string);
              };
          };

          mediaRecorder.start();
          setIsRecording(true);
      } catch (err) {
          console.error("Error accessing microphone:", err);
          alert("Could not access microphone.");
      }
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
  };

  const resetAudio = () => {
      setAudioBlobUrl(null);
      setAudioBase64(null);
      audioChunksRef.current = [];
  };

  // --- REVIEW ACTIONS ---
  const handleAIReview = async (trade: Trade) => {
    setIsProcessing(true);
    // Pass the custom mentor instruction
    const review = await reviewTrade(trade, undefined, mentorInstruction); 
    setReviewNote(review);
    setIsProcessing(false);
  };

  const updateStatus = (status: TradeStatus) => {
    if (!selectedTrade) return;
    const updatedTrades = trades.map(t => {
        if (t.id === selectedTrade.id) {
            return {
                ...t,
                status: status,
                adminFeedback: reviewNote,
                adminFeedbackAudio: audioBase64 || t.adminFeedbackAudio // Keep existing audio if not replaced
            };
        }
        return t;
    });
    setTrades(updatedTrades);
    
    // Update local selection to reflect new status immediately
    setSelectedTrade(prev => prev ? { ...prev, status, adminFeedback: reviewNote, adminFeedbackAudio: audioBase64 || prev.adminFeedbackAudio } : null);
    
    // Optionally reset audio if it was a new recording
    if (audioBase64) resetAudio();
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
              <div className="bg-gold-500 p-2 rounded-lg text-dark-900">
                  <Shield size={24} />
              </div>
              <div>
                  <h2 className="text-3xl font-serif font-bold text-white">Mentor Dashboard</h2>
                  <p className="text-slate-400 text-sm">Manage reviews and market outlooks</p>
              </div>
          </div>
          <div className="flex bg-slate-800 p-1 rounded-xl">
              <button 
                onClick={() => setActiveTab('reviews')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'reviews' ? 'bg-gold-500 text-dark-900 shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                Trade Reviews
              </button>
              <button 
                onClick={() => setActiveTab('outlook')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'outlook' ? 'bg-gold-500 text-dark-900 shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                Market Outlooks
              </button>
              <button 
                onClick={() => setActiveTab('access')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'access' ? 'bg-gold-500 text-dark-900 shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                <Key size={14} /> Access Keys
              </button>
          </div>
      </div>

      {activeTab === 'reviews' && (
        <div className="space-y-6">
            
            {/* AI Persona Config */}
            <div className="glass-panel p-4 rounded-xl border border-slate-700/50">
                <button 
                    onClick={() => setShowPersonaConfig(!showPersonaConfig)}
                    className="w-full flex justify-between items-center text-sm font-bold text-slate-300 hover:text-white"
                >
                    <div className="flex items-center gap-2">
                        <Brain size={16} className="text-purple-400" />
                        AI Mentor Persona
                    </div>
                    {showPersonaConfig ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                
                {showPersonaConfig && (
                    <div className="mt-4 animate-in slide-in-from-top-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">System Instructions</label>
                        <textarea 
                            value={mentorInstruction}
                            onChange={(e) => setMentorInstruction(e.target.value)}
                            className="w-full bg-dark-900 border border-slate-700 rounded-lg p-3 text-white text-sm focus:border-gold-500 outline-none h-24 resize-none leading-relaxed"
                            placeholder="Define how the AI should behave (e.g., 'You are a harsh critic...')"
                        />
                        <p className="text-[10px] text-slate-500 mt-2">These instructions will guide Gemini when generating automatic trade reviews.</p>
                    </div>
                )}
            </div>

            {/* FILTER TOOLBAR */}
            <div className="glass-panel p-4 rounded-xl flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
                 <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto items-center">
                     {/* Search */}
                    <div className="relative group w-full md:w-auto md:min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-gold-500 transition-colors" size={16} />
                        <input 
                            type="text" 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search user, pair..."
                            className="w-full bg-dark-900 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:border-gold-500 outline-none"
                        />
                         {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    
                    {/* Status Filter */}
                    <div className="flex bg-dark-900 p-1 rounded-lg border border-slate-700">
                        {(['pending', 'reviewed', 'rejected', 'all'] as const).map(s => (
                            <button 
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={`px-3 py-1.5 rounded text-xs font-bold uppercase transition-all ${statusFilter === s ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>

                    {/* Outcome Filter */}
                    <div className="flex bg-dark-900 p-1 rounded-lg border border-slate-700">
                        {(['all', 'win', 'loss'] as const).map(o => (
                            <button 
                                key={o}
                                onClick={() => setOutcomeFilter(o)}
                                className={`px-3 py-1.5 rounded text-xs font-bold uppercase transition-all ${outcomeFilter === o ? 
                                    (o === 'win' ? 'bg-green-600 text-white' : o === 'loss' ? 'bg-red-600 text-white' : 'bg-slate-700 text-white') 
                                    : 'text-slate-400 hover:text-white'}`}
                            >
                                {o}
                            </button>
                        ))}
                    </div>
                 </div>

                 <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-end">
                     
                     {/* Timeframe Filter */}
                     <select 
                        value={timeframeFilter}
                        onChange={(e) => setTimeframeFilter(e.target.value)}
                        className="bg-dark-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-2 outline-none focus:border-gold-500"
                    >
                        <option value="all">Timeframe</option>
                        {availableTimeframes.map(tf => <option key={tf} value={tf}>{tf}</option>)}
                    </select>

                     {/* Strategy Filter */}
                     <select 
                        value={strategyFilter}
                        onChange={(e) => setStrategyFilter(e.target.value)}
                        className="bg-dark-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-2 outline-none focus:border-gold-500"
                    >
                        <option value="all">Strategy</option>
                        {availableStrategies.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>

                    <button 
                        onClick={() => setShowDateFilter(!showDateFilter)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold transition-all ${showDateFilter ? 'bg-gold-500 text-dark-900 border-gold-500' : 'bg-dark-900 border-slate-700 text-slate-300'}`}
                    >
                        <Calendar size={14} /> Date
                        {showDateFilter ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                    </button>
                 </div>
            </div>
            
            {/* DATE PANEL */}
            {showDateFilter && (
                <div className="glass-panel p-4 rounded-xl animate-in slide-in-from-top-2">
                     <div className="flex flex-wrap gap-2 mb-4">
                        {['today', 'yesterday', 'thisWeek', 'thisMonth'].map(p => (
                            <button key={p} onClick={() => applyPreset(p)} className={`px-3 py-1.5 rounded border text-xs font-bold uppercase ${activePreset === p ? 'bg-gold-500 border-gold-500 text-dark-900' : 'border-slate-700 text-slate-400'}`}>
                                {p.replace(/([A-Z])/g, ' $1').trim()}
                            </button>
                        ))}
                        <button onClick={() => {setDateRange({start:null, end:null}); setActivePreset('all')}} className="px-3 py-1.5 rounded border border-red-900/50 text-red-400 text-xs font-bold uppercase hover:bg-red-900/20">Clear</button>
                     </div>
                     <div className="flex gap-2 items-center text-xs text-slate-400">
                         <span>Or Custom:</span>
                         <input type="date" className="bg-dark-900 border border-slate-700 rounded p-1 text-white" onChange={(e) => setDateRange(prev => ({...prev, start: e.target.valueAsNumber}))} />
                         <span>to</span>
                         <input type="date" className="bg-dark-900 border border-slate-700 rounded p-1 text-white" onChange={(e) => setDateRange(prev => ({...prev, end: e.target.valueAsNumber}))} />
                     </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* TRADE LIST */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Results: {filteredTrades.length} trades
                    </h3>
                    {filteredTrades.length === 0 && (
                        <div className="glass-panel p-8 text-center text-slate-500">
                            <CheckCircle size={48} className="mx-auto mb-4 opacity-20" />
                            <p>No trades match your filters.</p>
                        </div>
                    )}
                    {filteredTrades.map(trade => (
                        <div 
                            key={trade.id}
                            onClick={() => { 
                                setSelectedTrade(trade); 
                                setReviewNote(trade.adminFeedback || ''); 
                                resetAudio();
                            }}
                            className={`glass-panel p-4 rounded-xl cursor-pointer border-l-4 transition-all ${selectedTrade?.id === trade.id ? 'border-l-gold-500 bg-slate-800' : 'border-l-transparent hover:border-l-gold-500/50 hover:bg-slate-800/50'}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-white">{trade.userName}</span>
                                    {trade.status === TradeStatus.REVIEWED && <CheckCircle size={14} className="text-green-500" />}
                                    {trade.status === TradeStatus.REJECTED && <XCircle size={14} className="text-red-500" />}
                                    {trade.status === TradeStatus.PENDING && <Clock size={14} className="text-slate-500" />}
                                </div>
                                <span className="text-xs text-slate-500">{new Date(trade.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                            <div className="flex justify-between items-end">
                                <div className="flex gap-2 text-xs">
                                    <span className={`px-2 py-0.5 rounded ${trade.type === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{trade.type}</span>
                                    <span className="bg-slate-700 px-2 py-0.5 rounded text-slate-300">{trade.pair}</span>
                                    <span className="bg-slate-700 px-2 py-0.5 rounded text-slate-300">{trade.timeframe}</span>
                                </div>
                                <span className={`font-mono font-bold ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>{trade.pnl} pips</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* REVIEW PANEL */}
                <div className="glass-panel p-6 rounded-2xl h-fit sticky top-6 overflow-y-auto max-h-[85vh]">
                    {selectedTrade ? (
                        <div className="space-y-6">
                            <div className="border-b border-slate-700 pb-4 flex justify-between items-start">
                                 <div>
                                    <h3 className="text-xl font-bold text-white mb-1">Reviewing Trade</h3>
                                    <p className="text-xs text-slate-400">ID: {selectedTrade.id} • {selectedTrade.userName}</p>
                                 </div>
                                 <div className={`px-3 py-1 rounded text-xs font-bold uppercase ${
                                     selectedTrade.status === 'reviewed' ? 'bg-green-500/20 text-green-400' : 
                                     selectedTrade.status === 'rejected' ? 'bg-red-500/20 text-red-400' : 
                                     'bg-slate-700 text-slate-300'
                                 }`}>
                                     {selectedTrade.status}
                                 </div>
                            </div>
                            
                            {/* Expanded Details */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 relative h-48 bg-slate-900 rounded-xl overflow-hidden border border-slate-700">
                                    {selectedTrade.imageUrl ? (
                                        <img src={selectedTrade.imageUrl} alt="Trade" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-500 flex-col gap-2">
                                            <Activity size={32} />
                                            <span className="text-xs">No chart image</span>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                                    <span className="text-slate-500 text-xs block mb-1">Strategy</span>
                                    <span className="text-white font-bold">{selectedTrade.strategy}</span>
                                </div>
                                <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                                    <span className="text-slate-500 text-xs block mb-1">Timeframe</span>
                                    <span className="text-white font-bold">{selectedTrade.timeframe}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="bg-slate-900 p-2 rounded border border-slate-700">
                                    <span className="text-[10px] text-slate-500 uppercase block">Entry</span>
                                    <span className="text-white font-mono text-sm">{selectedTrade.entryPrice}</span>
                                </div>
                                <div className="bg-slate-900 p-2 rounded border border-slate-700">
                                    <span className="text-[10px] text-slate-500 uppercase block">SL</span>
                                    <span className="text-red-400 font-mono text-sm">{selectedTrade.stopLoss}</span>
                                </div>
                                <div className="bg-slate-900 p-2 rounded border border-slate-700">
                                    <span className="text-[10px] text-slate-500 uppercase block">TP</span>
                                    <span className="text-green-400 font-mono text-sm">{selectedTrade.exitPrice}</span>
                                </div>
                            </div>

                            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                                 <p className="text-xs text-slate-500 uppercase font-bold mb-2">Student Notes</p>
                                 <p className="text-slate-300 text-sm italic">"{selectedTrade.notes}"</p>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-slate-700">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-bold text-white">Mentor Feedback</label>
                                    <button 
                                        onClick={() => handleAIReview(selectedTrade)}
                                        disabled={isProcessing}
                                        className="text-xs flex items-center gap-1 text-gold-500 hover:text-gold-400 disabled:opacity-50"
                                    >
                                        <Zap size={12} /> {isProcessing ? 'Generating...' : 'Auto-Generate'}
                                    </button>
                                </div>
                                
                                {/* Audio Recorder */}
                                <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        {isRecording ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                                                <span className="text-red-400 text-xs font-bold uppercase">Recording...</span>
                                            </div>
                                        ) : audioBlobUrl ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center">
                                                    <Play size={14} />
                                                </div>
                                                <audio src={audioBlobUrl} controls className="h-8 w-48"/>
                                            </div>
                                        ) : selectedTrade.adminFeedbackAudio && !isRecording ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                                                    <Play size={14} />
                                                </div>
                                                <span className="text-xs text-slate-400">Existing Audio</span>
                                                <audio src={selectedTrade.adminFeedbackAudio} controls className="h-8 w-32"/>
                                            </div>
                                        ) : (
                                            <span className="text-slate-500 text-xs">Record voice feedback (optional)</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {!isRecording && !audioBlobUrl && (
                                            <button onClick={startRecording} className="p-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-gold-500 hover:text-dark-900 transition-colors">
                                                <Mic size={18} />
                                            </button>
                                        )}
                                        {isRecording && (
                                            <button onClick={stopRecording} className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                                                <Square size={18} fill="currentColor" />
                                            </button>
                                        )}
                                        {audioBlobUrl && (
                                            <button onClick={resetAudio} className="p-2 bg-slate-800 text-red-400 rounded-lg hover:bg-slate-700 transition-colors">
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <textarea 
                                    value={reviewNote}
                                    onChange={(e) => setReviewNote(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:border-gold-500 outline-none h-40 resize-none"
                                    placeholder="Write your review here..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={() => updateStatus(TradeStatus.REJECTED)} className={`py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-all ${selectedTrade.status === 'rejected' ? 'bg-red-600 text-white shadow-lg' : 'bg-red-900/20 text-red-400 border border-red-900/50 hover:bg-red-900/40'}`}>
                                    <XCircle size={18} /> {selectedTrade.status === 'rejected' ? 'Rejected' : 'Reject'}
                                </button>
                                <button onClick={() => updateStatus(TradeStatus.REVIEWED)} className={`py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-all ${selectedTrade.status === 'reviewed' ? 'bg-green-600 text-white shadow-lg' : 'bg-green-900/20 text-green-400 border border-green-900/50 hover:bg-green-900/40'}`}>
                                    <CheckCircle size={18} /> {selectedTrade.status === 'reviewed' ? 'Approved' : 'Approve'}
                                </button>
                                <button onClick={() => updateStatus(TradeStatus.PENDING)} className={`col-span-2 py-2 rounded-xl text-sm font-bold flex justify-center items-center gap-2 transition-all ${selectedTrade.status === 'pending' ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-500 hover:text-white'}`}>
                                    <RefreshCw size={14} /> Reset to Pending
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                            <Edit3 size={48} className="mb-4 opacity-20" />
                            <p>Select a trade to review</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {activeTab === 'outlook' && (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="glass-panel p-6 rounded-2xl border-t-4 border-gold-500">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div>
                         <h3 className="text-xl font-bold text-white">Outlook Editor</h3>
                         <p className="text-slate-400 text-sm">Create or edit market briefings</p>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                        {(['session', 'daily', 'weekly', 'monthly'] as const).map(type => (
                            <button
                                key={type}
                                onClick={() => { setSelectedOutlookType(type); setEditingOutlookId('new'); }}
                                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${
                                    selectedOutlookType === type 
                                    ? 'bg-gold-500 text-dark-900' 
                                    : 'bg-slate-800 text-slate-400 hover:text-white'
                                }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full md:w-64">
                         <span className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">Select to Edit</span>
                         <select 
                            value={editingOutlookId}
                            onChange={(e) => setEditingOutlookId(e.target.value)}
                            className="w-full bg-dark-900 border border-slate-600 rounded-lg p-2 text-white text-sm outline-none focus:border-gold-500"
                         >
                            <option value="new">+ Create New {selectedOutlookType.charAt(0).toUpperCase() + selectedOutlookType.slice(1)}</option>
                            {filteredOutlooks.map(o => (
                                <option key={o.id} value={o.id}>{o.title}</option>
                            ))}
                         </select>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={saveOutlook} className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors">
                            <Save size={18} /> Save Changes
                        </button>
                        {editingOutlookId !== 'new' && (
                             <button onClick={deleteOutlook} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors border border-red-500/50">
                                <Trash2 size={18} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    {/* --- TYPE SPECIFIC INPUTS --- */}
                    
                    {/* Session Specifics */}
                    {selectedOutlookType === 'session' && (
                        <div className="glass-panel p-4 rounded-xl border-dashed border border-slate-600 bg-slate-800/20">
                            <label className="block text-xs font-bold text-gold-500 uppercase mb-3">Session Configuration</label>
                            <div className="flex gap-2 mb-4">
                                {(['Asia', 'London', 'New York'] as const).map(session => (
                                    <button 
                                        key={session}
                                        onClick={() => handleSessionChange(session)}
                                        className={`flex-1 py-3 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all ${editedOutlook.sessionName === session ? 'bg-gold-500 text-dark-900 border-gold-500' : 'bg-dark-900 border-slate-700 text-slate-400 hover:text-white'}`}
                                    >
                                        {session === 'Asia' && <Moon size={16}/>}
                                        {session === 'London' && <Globe size={16}/>}
                                        {session === 'New York' && <Sun size={16}/>}
                                        {session}
                                    </button>
                                ))}
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Session Date</label>
                                    <input 
                                        type="date"
                                        value={editedOutlook.date}
                                        onChange={(e) => setEditedOutlook({...editedOutlook, date: e.target.value})}
                                        className="w-full bg-dark-900 border border-slate-600 rounded-lg p-2 text-white text-sm outline-none focus:border-gold-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Start Hour (24h)</label>
                                    <input 
                                        type="number"
                                        min="0" max="23"
                                        value={editedOutlook.startHour}
                                        onChange={(e) => setEditedOutlook({...editedOutlook, startHour: parseInt(e.target.value)})}
                                        className="w-full bg-dark-900 border border-slate-600 rounded-lg p-2 text-white text-sm outline-none focus:border-gold-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">End Hour (24h)</label>
                                    <input 
                                        type="number"
                                        min="0" max="23"
                                        value={editedOutlook.endHour}
                                        onChange={(e) => setEditedOutlook({...editedOutlook, endHour: parseInt(e.target.value)})}
                                        className="w-full bg-dark-900 border border-slate-600 rounded-lg p-2 text-white text-sm outline-none focus:border-gold-500"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Weekly / Monthly Specifics */}
                    {(selectedOutlookType === 'weekly' || selectedOutlookType === 'monthly') && (
                        <div className="glass-panel p-4 rounded-xl border-dashed border border-slate-600 bg-slate-800/20">
                            <label className="block text-xs font-bold text-gold-500 uppercase mb-3">Period Duration</label>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Start Date</label>
                                    <input 
                                        type="date"
                                        value={editedOutlook.startDate}
                                        onChange={(e) => setEditedOutlook({...editedOutlook, startDate: e.target.value})}
                                        className="w-full bg-dark-900 border border-slate-600 rounded-lg p-2 text-white text-sm outline-none focus:border-gold-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">End Date</label>
                                    <input 
                                        type="date"
                                        value={editedOutlook.endDate}
                                        onChange={(e) => setEditedOutlook({...editedOutlook, endDate: e.target.value})}
                                        className="w-full bg-dark-900 border border-slate-600 rounded-lg p-2 text-white text-sm outline-none focus:border-gold-500"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Daily Specifics */}
                    {selectedOutlookType === 'daily' && (
                         <div className="glass-panel p-4 rounded-xl border-dashed border border-slate-600 bg-slate-800/20">
                            <label className="block text-xs font-bold text-gold-500 uppercase mb-3">Daily Config</label>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Date</label>
                                    <input 
                                        type="date"
                                        value={editedOutlook.date}
                                        onChange={(e) => setEditedOutlook({...editedOutlook, date: e.target.value})}
                                        className="w-full bg-dark-900 border border-slate-600 rounded-lg p-2 text-white text-sm outline-none focus:border-gold-500"
                                    />
                                </div>
                             </div>
                        </div>
                    )}

                    {/* Common Fields */}
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Market Bias</label>
                             <div className="flex gap-2">
                                {(['bullish', 'bearish', 'neutral'] as const).map(b => (
                                    <button 
                                        key={b}
                                        onClick={() => setEditedOutlook({...editedOutlook, bias: b})}
                                        className={`flex-1 py-3 rounded-lg border flex items-center justify-center gap-2 ${editedOutlook.bias === b 
                                            ? b === 'bullish' ? 'bg-green-500/20 border-green-500 text-green-400' : b === 'bearish' ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-slate-700 border-slate-500 text-slate-300'
                                            : 'bg-dark-900 border-slate-700 text-slate-500'}`}
                                    >
                                        {b === 'bullish' && <TrendingUp size={16}/>}
                                        {b === 'bearish' && <TrendingDown size={16}/>}
                                        {b === 'neutral' && <Minus size={16}/>}
                                        <span className="capitalize font-bold">{b}</span>
                                    </button>
                                ))}
                             </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Outlook Title</label>
                            <input 
                                type="text"
                                value={editedOutlook.title}
                                onChange={(e) => setEditedOutlook({...editedOutlook, title: e.target.value})}
                                className="w-full bg-dark-900 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-gold-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Executive Summary</label>
                        <textarea 
                            value={editedOutlook.summary}
                            onChange={(e) => setEditedOutlook({...editedOutlook, summary: e.target.value})}
                            className="w-full bg-dark-900 border border-slate-700 rounded-lg p-4 text-white h-32 outline-none focus:border-gold-500 leading-relaxed"
                        />
                    </div>
                    
                    {/* 1. VIDEO URL INPUT */}
<div>
    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Video URL (Optional)</label>
    <div className="relative">
        <Play className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
        <input 
            type="text"
            value={editedOutlook.videoUrl || ''}
            onChange={(e) => setEditedOutlook({...editedOutlook, videoUrl: e.target.value})}
            className="w-full bg-dark-900 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white outline-none focus:border-gold-500"
            placeholder="https://..."
        />
    </div>
</div>

{/* NOTES / UPDATES EDITOR */}
<div className="glass-panel p-4 rounded-xl border border-slate-700/50 bg-slate-800/20 mt-4">
    <div className="flex justify-between items-center mb-3">
        <label className="text-xs font-bold text-slate-500 uppercase">Live Session Notes</label>
        <button 
            onClick={() => setEditedOutlook({
                ...editedOutlook,
                notes: [
                    { id: Date.now().toString(), content: '', timestamp: Date.now() },
                    ...(editedOutlook.notes || []) // Add new note to TOP
                ]
            })}
            className="text-xs text-gold-500 hover:text-white flex items-center gap-1"
        >
            <Plus size={12}/> Add Update
        </button>
    </div>
    
    <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
        {(editedOutlook.notes || []).map((note, i) => (
            <div key={i} className="flex gap-2 items-start bg-dark-900 p-3 rounded-lg border border-slate-700">
                <div className="flex-1 space-y-2">
                    <textarea 
                        placeholder="Market update..."
                        value={note.content}
                        onChange={(e) => {
                            const newNotes = [...(editedOutlook.notes || [])];
                            newNotes[i].content = e.target.value;
                            setEditedOutlook({...editedOutlook, notes: newNotes});
                        }}
                        className="w-full bg-transparent outline-none text-slate-300 text-xs h-12 resize-none"
                    />
                    <div className="flex items-center gap-2">
                         <Clock size={10} className="text-slate-500"/>
                         <input 
                            type="datetime-local"
                            value={new Date(note.timestamp).toISOString().slice(0, 16)}
                            onChange={(e) => {
                                const newNotes = [...(editedOutlook.notes || [])];
                                newNotes[i].timestamp = new Date(e.target.value).getTime();
                                setEditedOutlook({...editedOutlook, notes: newNotes});
                            }}
                            className="bg-transparent text-[10px] text-slate-400 outline-none"
                         />
                    </div>
                </div>
                <button 
                    onClick={() => setEditedOutlook(prev => ({...prev, notes: prev.notes.filter((_, idx) => idx !== i)}))}
                    className="text-slate-600 hover:text-red-400 p-1"
                >
                    <Trash2 size={14}/>
                </button>
            </div>
        ))}
        {(!editedOutlook.notes || editedOutlook.notes.length === 0) && (
            <p className="text-center text-slate-600 text-xs italic py-2">No live updates added.</p>
        )}
    </div>
</div>

{/* 2. KEY LEVELS EDITOR */}
<div className="glass-panel p-4 rounded-xl border border-slate-700/50 bg-slate-800/20">
    <div className="flex justify-between items-center mb-3">
        <label className="text-xs font-bold text-gold-500 uppercase flex items-center gap-2">
            <Target size={14} /> Key Levels & POIs
        </label>
        <button 
            onClick={() => setEditedOutlook({
                ...editedOutlook, 
                levels: [...editedOutlook.levels, { price: 0, type: 'support', strength: 'medium', note: '' }]
            })}
            className="text-xs text-gold-500 hover:text-white flex items-center gap-1 font-bold"
        >
            <Plus size={12}/> Add Level
        </button>
    </div>
    
    <div className="space-y-3">
        {editedOutlook.levels.length === 0 && <p className="text-slate-500 text-xs italic">No key levels added yet.</p>}
        
        {editedOutlook.levels.map((level, i) => (
            <div key={i} className="flex gap-2 items-center bg-dark-900 p-2 rounded-lg border border-slate-700">
                <input 
                    type="number" 
                    placeholder="Price"
                    value={level.price}
                    onChange={(e) => {
                        const newLevels = [...editedOutlook.levels];
                        newLevels[i].price = parseFloat(e.target.value);
                        setEditedOutlook({...editedOutlook, levels: newLevels});
                    }}
                    className="w-24 bg-transparent border-b border-slate-700 focus:border-gold-500 outline-none text-white text-sm font-mono"
                />
                
                <select
                    value={level.type}
                    onChange={(e) => {
                        const newLevels = [...editedOutlook.levels];
                        newLevels[i].type = e.target.value as any;
                        setEditedOutlook({...editedOutlook, levels: newLevels});
                    }}
                    className={`bg-transparent text-xs font-bold uppercase outline-none cursor-pointer ${level.type === 'resistance' ? 'text-red-400' : 'text-green-400'}`}
                >
                    <option value="resistance">RES</option>
                    <option value="support">SUP</option>
                </select>

                <input 
                    type="text" 
                    placeholder="Note (e.g. Weekly High)"
                    value={level.note || ''}
                    onChange={(e) => {
                        const newLevels = [...editedOutlook.levels];
                        newLevels[i].note = e.target.value;
                        setEditedOutlook({...editedOutlook, levels: newLevels});
                    }}
                    className="flex-1 bg-transparent outline-none text-slate-300 text-xs"
                />
                
                <button 
                    onClick={() => setEditedOutlook(prev => ({...prev, levels: prev.levels.filter((_, idx) => idx !== i)}))}
                    className="text-slate-600 hover:text-red-400 transition-colors"
                >
                    <Trash2 size={14}/>
                </button>
            </div>
        ))}
    </div>
</div>

                    {/* Timeline Editor */}
                    <div>
                         <div className="flex justify-between items-center mb-3">
                            <label className="text-xs font-bold text-slate-500 uppercase">Timeline Events</label>
                            <button 
                                onClick={() => setEditedOutlook(prev => ({...prev, timeline: [...prev.timeline, { id: Date.now().toString(), label: '', title: '', type: 'structure', impact: 'low' }]}))}
                                className="text-xs text-gold-500 hover:text-white flex items-center gap-1"
                            >
                                <Plus size={12}/> Add Event
                            </button>
                         </div>
                         <div className="space-y-2">
                            {editedOutlook.timeline.map((item, i) => (
                                <div key={i} className="flex gap-2 items-center">
                                    <input 
                                        type="text" 
                                        placeholder="Label (e.g. 08:00)"
                                        value={item.label}
                                        onChange={(e) => {
                                            const newTimeline = [...editedOutlook.timeline];
                                            newTimeline[i].label = e.target.value;
                                            setEditedOutlook({...editedOutlook, timeline: newTimeline});
                                        }}
                                        className="w-24 bg-dark-900 border border-slate-700 rounded p-2 text-white text-xs"
                                    />
                                    <input 
                                        type="text" 
                                        placeholder="Description"
                                        value={item.title}
                                        onChange={(e) => {
                                            const newTimeline = [...editedOutlook.timeline];
                                            newTimeline[i].title = e.target.value;
                                            setEditedOutlook({...editedOutlook, timeline: newTimeline});
                                        }}
                                        className="flex-1 bg-dark-900 border border-slate-700 rounded p-2 text-white text-xs"
                                    />
                                    <select
                                        value={item.type}
                                        onChange={(e) => {
                                            const newTimeline = [...editedOutlook.timeline];
                                            newTimeline[i].type = e.target.value as any;
                                            setEditedOutlook({...editedOutlook, timeline: newTimeline});
                                        }}
                                        className="bg-dark-900 border border-slate-700 rounded p-2 text-white text-xs w-24"
                                    >
                                        <option value="structure">Structure</option>
                                        <option value="news">News</option>
                                        <option value="mentor">Mentor</option>
                                    </select>
                                    <button 
                                        onClick={() => setEditedOutlook(prev => ({...prev, timeline: prev.timeline.filter((_, idx) => idx !== i)}))}
                                        className="text-red-500 p-1 hover:bg-red-500/10 rounded"
                                    >
                                        <Trash2 size={14}/>
                                    </button>
                                </div>
                            ))}
                         </div>
                    </div>

                </div>
            </div>
        </div>
      )}

      {activeTab === 'access' && (
          <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold text-white">Registration Tokens</h3>
                  <button 
                    onClick={handleGenerateToken} 
                    disabled={loadingTokens}
                    className="bg-gold-500 text-dark-900 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-gold-400 disabled:opacity-50"
                  >
                      {loadingTokens ? 'Generating...' : <><Plus size={18} /> Generate Token</>}
                  </button>
              </div>

              <div className="glass-panel rounded-2xl overflow-hidden">
                  <div className="grid grid-cols-12 gap-4 p-4 bg-slate-800/50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <div className="col-span-4">Token Code</div>
                      <div className="col-span-2">Status</div>
                      <div className="col-span-3">Created</div>
                      <div className="col-span-3">Used By</div>
                  </div>
                  {tokens.length === 0 ? (
                      <div className="p-8 text-center text-slate-500">No tokens generated yet.</div>
                  ) : (
                      tokens.map((token, idx) => (
                          <div key={idx} className="grid grid-cols-12 gap-4 p-4 border-t border-slate-800 items-center text-sm hover:bg-slate-800/30 transition-colors">
                              <div className="col-span-4 flex items-center gap-2 font-mono text-gold-500 font-bold">
                                  {token.code}
                                  <button onClick={() => copyToClipboard(token.code)} className="text-slate-500 hover:text-white p-1">
                                      <Copy size={12} />
                                  </button>
                              </div>
                              <div className="col-span-2">
                                  {token.isUsed ? (
                                      <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-xs font-bold uppercase">Used</span>
                                  ) : (
                                      <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-bold uppercase">Available</span>
                                  )}
                              </div>
                              <div className="col-span-3 text-slate-400 text-xs">
                                  {new Date(token.generatedAt).toLocaleString()}
                              </div>
                              <div className="col-span-3 text-slate-300">
                                  {token.usedBy ? `User ID: ${token.usedBy}` : '-'}
                              </div>
                          </div>
                      ))
                  )}
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminPanel;
