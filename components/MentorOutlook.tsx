
import React, { useState, useMemo, useEffect } from 'react';
import { MentorOutlook, OutlookType } from '../types';
import { Target, TrendingUp, TrendingDown, Minus, Zap, Clock, Radio, Info, MapPin, AlertCircle, Calendar, ChevronDown, Globe, Sun, Moon, Plus, Activity } from 'lucide-react';
interface MentorOutlookProps {
    outlooks: MentorOutlook[];
}

const MentorOutlookComponent: React.FC<MentorOutlookProps> = ({ outlooks }) => {
  const [activeType, setActiveType] = useState<OutlookType>('daily');
  const [selectedOutlookId, setSelectedOutlookId] = useState<string>('');
  
  // Filter outlooks by active type and sort desc by timestamp
  const filteredOutlooks = useMemo(() => {
      return outlooks
        .filter(o => o.type === activeType)
        .sort((a, b) => b.timestamp - a.timestamp);
  }, [outlooks, activeType]);

  // Auto-select latest when type changes
  useEffect(() => {
      if (filteredOutlooks.length > 0) {
          setSelectedOutlookId(filteredOutlooks[0].id);
      } else {
          setSelectedOutlookId('');
      }
  }, [activeType, filteredOutlooks]);

  const activeOutlook = useMemo(() => {
      return outlooks.find(o => o.id === selectedOutlookId) || null;
  }, [outlooks, selectedOutlookId]);

  // --- Visualization Logic ---

  // Determine the visible time range (in hours)
  const viewRange = useMemo(() => {
      if (activeType === 'session' && activeOutlook) {
          const start = activeOutlook.startHour ?? 0;
          const end = activeOutlook.endHour ?? 24;
          // Add 1 hour padding, clamp to 0-24
          const paddedStart = Math.max(0, start - 1);
          const paddedEnd = Math.min(24, end + 1);
          return { start: paddedStart, end: paddedEnd, span: paddedEnd - paddedStart };
      }
      return { start: 0, end: 24, span: 24 }; // Default Daily view 0-24h
  }, [activeType, activeOutlook]);

  const getTimelinePosition = (label: string, type: OutlookType) => {
      if (type === 'weekly') {
          const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
          const idx = days.findIndex(d => label.includes(d));
          return idx >= 0 ? (idx / 4) * 90 + 5 : 50; 
      }
      if (type === 'monthly') {
          const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
          const idx = weeks.findIndex(w => label.includes(w));
          return idx >= 0 ? (idx / 3) * 90 + 5 : 50;
      }
      
      // Daily / Session
      const [h, m] = label.split(':').map(Number);
      if (!isNaN(h)) {
          const time = h + (m || 0) / 60;
          const { start, span } = viewRange;
          // Calculate percentage relative to current view
          const pct = ((time - start) / span) * 100;
          return pct;
      }
      return -999;
  };

  const getTimelineScale = () => {
      if (activeType === 'weekly') return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
      if (activeType === 'monthly') return ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      
      const { start, end, span } = viewRange;
      const labels = [];
      // Adjust step based on zoom level
      const step = span <= 8 ? 1 : span <= 14 ? 2 : 4;

      for (let i = Math.ceil(start); i <= end; i += step) {
          if (i === 24) {
               labels.push('00:00'); // Display 24:00 as 00:00 or 24:00 depending on pref
          } else {
               labels.push(`${i.toString().padStart(2, '0')}:00`);
          }
      }
      return labels;
  };

  // Helper for Date Display
  const getDisplayDate = (o: MentorOutlook) => {
      if (o.type === 'weekly' || o.type === 'monthly') {
          return `${o.startDate} → ${o.endDate}`;
      }
      return o.date;
  };

  // Render Session Background Blocks
  const renderSessionBlocks = () => {
      if (activeType !== 'daily' && activeType !== 'session') return null;
      
      // Define sessions in fixed 24h hours
      const sessions = [
          { name: 'Asia', start: 0, end: 8, color: 'bg-blue-500/5 border-blue-500/10 text-blue-500' },
          { name: 'London', start: 8, end: 17, color: 'bg-purple-500/5 border-purple-500/10 text-purple-500' },
          { name: 'NY', start: 13, end: 22, color: 'bg-gold-500/5 border-gold-500/10 text-gold-500' },
      ];

      const { start: viewStart, end: viewEnd, span } = viewRange;

      return sessions.map((s) => {
          // Calculate intersection of session with current view
          const blockStart = Math.max(viewStart, s.start);
          const blockEnd = Math.min(viewEnd, s.end);

          if (blockEnd <= blockStart) return null; // Not visible in current view

          const left = ((blockStart - viewStart) / span) * 100;
          const width = ((blockEnd - blockStart) / span) * 100;

          return (
            <div 
                key={s.name}
                className={`absolute top-0 bottom-0 border-x border-t rounded-t-lg ${s.color} flex items-start justify-center pt-1 z-0`}
                style={{ left: `${left}%`, width: `${width}%`, height: '100%' }}
            >
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40 sticky top-2">{s.name}</span>
            </div>
          );
      });
  };

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500 pb-20">
      
      {/* Navigation Header */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
          <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 w-full md:w-auto">
             {(['session', 'daily', 'weekly', 'monthly'] as const).map(type => (
                 <button
                    key={type}
                    onClick={() => setActiveType(type)}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 font-bold uppercase tracking-wider text-[10px] transition-all whitespace-nowrap ${
                        activeType === type 
                        ? 'bg-gold-500 text-dark-900 shadow-glow' 
                        : 'bg-dark-900 border border-slate-700 text-slate-400 hover:text-white'
                    }`}
                 >
                    {type === 'session' && <Clock size={12}/>}
                    {type === 'daily' && <Radio size={12}/>}
                    {type === 'weekly' && <Calendar size={12}/>}
                    {type === 'monthly' && <MapPin size={12}/>}
                    {type}
                 </button>
             ))}
          </div>

          <div className="relative group w-full md:w-64">
              <select 
                value={selectedOutlookId}
                onChange={(e) => setSelectedOutlookId(e.target.value)}
                className="w-full appearance-none bg-dark-900 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm font-medium focus:border-gold-500 outline-none cursor-pointer"
                disabled={filteredOutlooks.length === 0}
              >
                  {filteredOutlooks.length === 0 ? <option>No outlooks found</option> : null}
                  {filteredOutlooks.map(o => (
                      <option key={o.id} value={o.id}>
                          {o.title} ({getDisplayDate(o)})
                      </option>
                  ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
          </div>
      </div>

      {activeOutlook ? (
        <>
            {/* Hero Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="bg-gold-500 text-dark-900 text-xs font-black uppercase px-2 py-0.5 rounded animate-pulse">Published</span>
                        <span className="text-slate-400 text-sm font-medium font-mono">{getDisplayDate(activeOutlook)}</span>
                    </div>
                    
                    <h2 className="text-4xl font-serif font-bold text-white tracking-tight flex items-center gap-3">
                        {activeOutlook.title}
                        {activeOutlook.type === 'session' && (
                             <span className="text-2xl text-slate-500 flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-xl">
                                {activeOutlook.sessionName === 'Asia' && <Moon size={24} className="text-blue-400"/>}
                                {activeOutlook.sessionName === 'London' && <Globe size={24} className="text-purple-400"/>}
                                {activeOutlook.sessionName === 'New York' && <Sun size={24} className="text-gold-500"/>}
                                <span className="text-sm font-sans font-bold uppercase tracking-wider text-slate-300">
                                    {activeOutlook.startHour}:00 - {activeOutlook.endHour}:00
                                </span>
                             </span>
                        )}
                    </h2>
                    
                    <p className="text-slate-400 max-w-2xl mt-2">{activeOutlook.summary}</p>
                </div>
                
                {/* Bias HUD */}
                <div className={`glass-panel px-6 py-4 rounded-2xl flex items-center gap-6 border-l-4 shadow-2xl relative overflow-hidden min-w-[280px] ${
                    activeOutlook.bias === 'bullish' ? 'border-green-500' : activeOutlook.bias === 'bearish' ? 'border-red-500' : 'border-slate-500'
                }`}>
                    <div className={`absolute inset-0 opacity-10 ${
                        activeOutlook.bias === 'bullish' ? 'bg-green-500' : activeOutlook.bias === 'bearish' ? 'bg-red-500' : 'bg-slate-500'
                    }`}></div>
                    
                    <div className="relative z-10 text-center flex-1">
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Market Bias</p>
                        <div className="flex items-center justify-center gap-2">
                            {activeOutlook.bias === 'bullish' ? <TrendingUp size={28} className="text-green-400" /> : 
                            activeOutlook.bias === 'bearish' ? <TrendingDown size={28} className="text-red-400" /> : 
                            <Minus size={28} className="text-slate-400" />}
                            <span className={`text-3xl font-black uppercase ${
                                activeOutlook.bias === 'bullish' ? 'text-green-400' : activeOutlook.bias === 'bearish' ? 'text-red-400' : 'text-slate-400'
                            }`}>
                                {activeOutlook.bias}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ADAPTIVE TIMELINE VISUALIZER */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-700/50">
                <div className="flex justify-between items-end mb-8">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Zap size={18} className="text-gold-500" />
                        {activeType === 'weekly' ? 'Weekly Roadmap' : activeType === 'monthly' ? 'Monthly Cycle' : 'Session Timeline'}
                    </h3>
                </div>

                {/* Timeline Container */}
                <div className="relative h-48 bg-dark-900/50 rounded-xl border border-slate-800 overflow-hidden select-none mb-4">
                    
                    {/* Session Blocks (Background) */}
                    {renderSessionBlocks()}

                    {/* Grid Lines */}
                    {getTimelineScale().map((label, idx, arr) => {
                        // Calculate position for grid line
                        const [h] = label.split(':').map(Number);
                        const pos = ((h - viewRange.start) / viewRange.span) * 100;
                        if (h === 0 && label !== '00:00') return null; // Edge case handling

                        return (
                            <div 
                                key={idx} 
                                className="absolute top-0 bottom-0 border-l border-slate-800/50 z-0" 
                                style={{ left: `${pos}%` }}
                            >
                                <span className="absolute top-1 left-1 text-[10px] text-slate-600 font-mono bg-dark-900/50 px-1 rounded">
                                    {label}
                                </span>
                            </div>
                        );
                    })}

                    {/* Event Markers */}
                    {activeOutlook.timeline.map((event) => {
                        const pos = getTimelinePosition(event.label, activeType);
                        
                        // Hide if out of view
                        if (pos < 0 || pos > 100) return null;

                        return (
                            <div 
                                key={event.id}
                                className="absolute top-1/2 -translate-y-1/2 group cursor-pointer z-20"
                                style={{ left: `${pos}%` }}
                            >
                                <div className="flex flex-col items-center gap-1 -translate-x-1/2">
                                    <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase whitespace-nowrap shadow-lg border backdrop-blur-sm ${
                                        event.type === 'news' ? 'bg-red-500/20 text-red-400 border-red-500/50' :
                                        event.type === 'mentor' ? 'bg-gold-500 text-dark-900 border-gold-500' :
                                        'bg-blue-500/20 text-blue-400 border-blue-500/50'
                                    }`}>
                                        {event.label}
                                    </div>
                                    <div className={`w-3 h-3 rounded-full border-2 border-slate-900 ${
                                        event.type === 'news' ? 'bg-red-500' : 
                                        event.type === 'mentor' ? 'bg-gold-500' : 
                                        'bg-blue-500'
                                    }`}></div>
                                    <div className="absolute top-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 p-3 rounded-lg border border-slate-700 w-48 text-center z-30 shadow-xl pointer-events-none">
                                        <p className="font-bold text-white text-sm">{event.title}</p>
                                        <p className="text-xs text-slate-400 uppercase mt-1">{event.type} • {event.impact} impact</p>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Key Levels List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="glass-panel p-6 rounded-2xl">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <Target size={18} className="text-blue-400" />
                            Key Levels & POIs
                        </h3>
                        <div className="space-y-3">
                            {activeOutlook.levels.map((level, idx) => (
                                <div key={idx} className="flex items-center gap-4 group">
                                    <div className="w-20 text-right font-mono text-sm font-bold text-slate-400 group-hover:text-white transition-colors">{level.price.toFixed(2)}</div>
                                    
                                    <div className="flex-1 p-3 bg-slate-800/30 rounded-lg flex items-center relative overflow-hidden group-hover:bg-slate-800 transition-all border border-slate-700/50 group-hover:border-slate-600">
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                                            level.type === 'resistance' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-green-500 shadow-[0_0_8px_rgba(74,222,128,0.5)]'
                                        }`}></div>
                                        
                                        <div className="flex-1 flex justify-between items-center pl-3">
                                            <div className="flex flex-col">
                                                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                                                    level.type === 'resistance' ? 'text-red-400' : 'text-green-400'
                                                }`}>
                                                    {level.type}
                                                </span>
                                                <span className="text-xs text-slate-300 font-medium">{level.note}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-800/30 p-6 rounded-xl border border-slate-700/50 h-full flex flex-col">
                    <h3 className="text-gold-500 text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Activity size={14} /> Live Mentor Updates
                    </h3>
                    
                    <div className="space-y-6 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                        {activeOutlook.notes && activeOutlook.notes.length > 0 ? (
                            activeOutlook.notes
                                .sort((a, b) => b.timestamp - a.timestamp) // Sort by Newest First
                                .map((note) => (
                                <div key={note.id} className="relative pl-6 border-l-2 border-slate-700 pb-1 last:pb-0 group">
                                    {/* Timestamp Dot */}
                                    <div className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full bg-slate-700 group-hover:bg-gold-500 transition-colors border-2 border-dark-900"></div>
                                    
                                    {/* Time Label */}
                                    <div className="text-[10px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                                        {new Date(note.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        <span className="text-slate-600">•</span>
                                        <span>{new Date(note.timestamp).toLocaleDateString()}</span>
                                    </div>
                                    
                                    {/* Content */}
                                    <p className="text-slate-300 text-sm leading-relaxed italic">
                                        "{note.content}"
                                    </p>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 opacity-50">
                                <p className="text-slate-400 text-sm italic">"{activeOutlook.summary || "No updates yet."}"</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
      ) : (
          <div className="glass-panel p-20 text-center rounded-2xl">
              <Info size={48} className="mx-auto mb-4 text-slate-600"/>
              <p className="text-slate-400">No outlook published for this category yet.</p>
          </div>
      )}
    </div>
  );
};

export default MentorOutlookComponent;
