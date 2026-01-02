import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { MentorOutlook, TimelineEvent } from '../types';
import { NewsService } from '../services/api';
import { 
    TrendingUp, TrendingDown, Clock, Layers, 
    RefreshCw, Activity, Filter, MousePointer2, ZoomIn, ZoomOut, Globe, Sun, Moon
} from 'lucide-react';

// --- CONFIGURATION ---
const CURRENCY_TO_PAIRS: Record<string, string[]> = {
    'USD': ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'USDCAD', 'NAS100', 'US30'],
    'EUR': ['EURUSD', 'EURGBP', 'EURJPY', 'EURAUD'],
    'GBP': ['GBPUSD', 'EURGBP', 'GBPJPY'],
    'JPY': ['USDJPY', 'EURJPY', 'GBPJPY'],
    'CAD': ['USDCAD', 'CADJPY'],
    'AUD': ['AUDUSD', 'EURAUD'],
    'CHF': ['USDCHF'],
    'CNY': ['XAUUSD', 'AUDUSD'],
};

// Zoom constraints (in milliseconds)
const MIN_ZOOM = 1000 * 60 * 30; // 30 mins
const MAX_ZOOM = 1000 * 60 * 60 * 24 * 30; // 30 days
const DEFAULT_ZOOM = 1000 * 60 * 60 * 12; // 12 hours

interface MentorOutlookProps {
    outlooks: MentorOutlook[];
}

const MentorOutlookComponent: React.FC<MentorOutlookProps> = ({ outlooks }) => {
  // --- STATE: VIEWPORT ---
  const [viewCenter, setViewCenter] = useState<number>(Date.now());
  const [viewDuration, setViewDuration] = useState<number>(DEFAULT_ZOOM);
  
  // --- STATE: INTERACTION ---
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef<number>(0);
  const dragStartCenter = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [cursorTime, setCursorTime] = useState<number | null>(null);

  // --- STATE: SELECTION & DATA ---
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  // Holds 60 days of news (Past & Future)
  const [rawNews, setRawNews] = useState<(TimelineEvent & { dateString?: string, timestamp: number })[]>([]);
  
  // --- STATE: FILTERS ---
  const [filterImpact, setFilterImpact] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [filterCurrency, setFilterCurrency] = useState<string>('ALL');
  const [filterPair, setFilterPair] = useState<string>('ALL');

  // --- 1. DATA PREPARATION ---

  // Convert all Outlooks into unified Range objects
  const unifiedOutlooks = useMemo(() => {
      return outlooks.map(o => {
          const baseDate = new Date(o.date).getTime();
          let startMs = baseDate;
          let endMs = baseDate + (24 * 3600000); // Default 1 day

          if (o.type === 'session') {
              startMs = baseDate + (o.startHour || 0) * 3600000;
              endMs = baseDate + (o.endHour || 24) * 3600000;
          } else if (o.type === 'weekly') {
               endMs = baseDate + (5 * 24 * 3600000);
          }

          return {
              ...o,
              startTime: startMs,
              endTime: endMs,
              isContext: o.type === 'weekly' || o.type === 'monthly'
          };
      });
  }, [outlooks]);

  // FETCH BROAD NEWS (+/- 30 Days from View Center)
  useEffect(() => {
      const loadNews = async () => {
          const dateStr = new Date(viewCenter).toISOString().split('T')[0];
          try {
              // Fetch broad range (NewsService handles +/- 30 days logic internally or we simulate it)
              const events = await NewsService.getEconomicEvents(dateStr);
              
              const enhancedEvents = events.map(e => {
                  const [h, m] = e.label.includes(':') ? e.label.split(':').map(Number) : [12, 0];
                  // Use the event's actual date string if available, otherwise default to center
                  const baseT = e.dateString ? new Date(e.dateString).getTime() : new Date(dateStr).getTime();
                  const t = baseT + (h * 3600000) + (m * 60000);
                  return { ...e, timestamp: t };
              });
              setRawNews(enhancedEvents);
          } catch (e) { console.error(e); }
      };
      
      const t = setTimeout(loadNews, 500); // Debounce
      return () => clearTimeout(t);
  }, [Math.floor(viewCenter / (1000 * 60 * 60 * 24 * 7))]); // Re-fetch only if we scroll by ~1 week

  // Filter News
  const filteredNews = useMemo(() => {
      return rawNews.filter(item => {
          if (filterImpact !== 'all' && item.impact !== filterImpact) return false;
          if (filterCurrency !== 'ALL' && item.currency !== filterCurrency) return false;
          if (filterPair !== 'ALL') {
              const relevantCurrencies = Object.entries(CURRENCY_TO_PAIRS)
                  .filter(([_, pairs]) => pairs.includes(filterPair))
                  .map(([curr]) => curr);
              if (!relevantCurrencies.includes(item.currency || '')) return false;
          }
          return true;
      }).sort((a, b) => a.timestamp - b.timestamp); // Sort chronological
  }, [rawNews, filterImpact, filterCurrency, filterPair]);

  // --- 2. INTERACTION HANDLERS ---

  const handleMouseDown = (e: React.MouseEvent) => {
      setIsDragging(true);
      dragStartX.current = e.clientX;
      dragStartCenter.current = viewCenter;
      document.body.style.cursor = 'grabbing';
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      
      const timeAtCursor = (viewCenter - viewDuration / 2) + (x / rect.width) * viewDuration;
      setCursorTime(timeAtCursor);

      if (isDragging) {
          const dx = e.clientX - dragStartX.current;
          const timeShift = (dx / rect.width) * viewDuration;
          setViewCenter(dragStartCenter.current - timeShift);
      }
  }, [isDragging, viewCenter, viewDuration]);

  const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = 'default';
  };

  useEffect(() => {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
      };
  }, [handleMouseMove]);

  const handleWheel = (e: React.WheelEvent) => {
      if (!containerRef.current) return;
      e.preventDefault();
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const width = rect.width;
      const timeAtMouse = (viewCenter - viewDuration / 2) + (mouseX / width) * viewDuration;

      if (e.ctrlKey || e.metaKey || Math.abs(e.deltaY) < 50) {
          const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
          const newDuration = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, viewDuration * zoomFactor));
          const newStart = timeAtMouse - (mouseX / width) * newDuration;
          setViewDuration(newDuration);
          setViewCenter(newStart + newDuration / 2);
      } else {
          const timeShift = (e.deltaY / width) * viewDuration;
          setViewCenter(prev => prev + timeShift);
      }
  };

  // --- 3. RENDER HELPERS ---

  const t2x = (t: number) => {
      const start = viewCenter - viewDuration / 2;
      return ((t - start) / viewDuration) * 100;
  };

  const getTicks = () => {
      const start = viewCenter - viewDuration / 2;
      const end = viewCenter + viewDuration / 2;
      const ticks = [];
      let step = 1000 * 60 * 60;
      let format: 'time' | 'date' | 'full' = 'time';

      if (viewDuration < 1000 * 60 * 60 * 3) { step = 1000 * 60 * 15; format = 'time'; }
      else if (viewDuration < 1000 * 60 * 60 * 24) { step = 1000 * 60 * 60; format = 'time'; }
      else if (viewDuration < 1000 * 60 * 60 * 24 * 3) { step = 1000 * 60 * 60 * 6; format = 'full'; }
      else { step = 1000 * 60 * 60 * 24; format = 'date'; }

      const firstTick = Math.ceil(start / step) * step;
      for (let t = firstTick; t <= end; t += step) {
          ticks.push({ t, format });
      }
      return ticks;
  };

  const ticks = getTicks();
  const activeItem = unifiedOutlooks.find(o => o.id === selectedEventId) || unifiedOutlooks.find(o => !o.isContext && o.startTime <= viewCenter && o.endTime >= viewCenter) || null;

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500 pb-20">
      
      {/* HEADER CONTROLS */}
      <div className="flex justify-between items-end">
          <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Activity className="text-gold-500" /> Market Timeline
              </h2>
              <p className="text-xs text-slate-400">Scroll to zoom • Drag to pan • Click events for details</p>
          </div>
          <div className="flex gap-2">
              <button onClick={() => setViewCenter(Date.now())} className="bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-700 hover:bg-slate-700 flex items-center gap-2">
                  <RefreshCw size={12}/> Reset View
              </button>
          </div>
      </div>

      {/* --- VISUALIZER --- */}
      <div className="glass-panel p-0 rounded-xl border border-slate-700 overflow-hidden relative select-none bg-dark-950">
          <div 
            ref={containerRef}
            className="relative h-[320px] cursor-grab active:cursor-grabbing overflow-hidden"
            onMouseDown={handleMouseDown}
            onWheel={handleWheel}
          >
              {/* 1. GRID LAYER */}
              {ticks.map(({ t }) => {
                  const x = t2x(t);
                  const isDayStart = new Date(t).getHours() === 0 && new Date(t).getMinutes() === 0;
                  return (
                      <div key={t} className="absolute top-0 bottom-8 border-l pointer-events-none transition-opacity"
                           style={{ 
                               left: `${x}%`, 
                               borderColor: isDayStart ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
                               borderWidth: isDayStart ? 1 : 1
                           }}>
                      </div>
                  );
              })}

              {/* 2. BACKGROUND CONTEXT */}
              {unifiedOutlooks.filter(o => o.isContext).map(o => {
                  const startX = t2x(o.startTime);
                  const endX = t2x(o.endTime);
                  const width = Math.max(0, endX - startX);
                  if (endX < 0 || startX > 100) return null;

                  return (
                      <div key={o.id} className="absolute top-0 bottom-8 bg-blue-900/5 border-x border-blue-500/10 pointer-events-none flex justify-center pt-2"
                           style={{ left: `${startX}%`, width: `${width}%` }}>
                          <span className="text-[10px] font-black uppercase text-blue-500/30 tracking-[0.2em]">{o.title}</span>
                      </div>
                  )
              })}

              {/* 3. FOREGROUND OUTLOOKS */}
              {unifiedOutlooks.filter(o => !o.isContext).map(o => {
                  const startX = t2x(o.startTime);
                  const endX = t2x(o.endTime);
                  const width = Math.max(0.5, endX - startX);
                  if (endX < 0 || startX > 100) return null; 

                  const isSelected = selectedEventId === o.id;

                  return (
                      <div 
                        key={o.id}
                        onClick={(e) => { e.stopPropagation(); setSelectedEventId(o.id); }}
                        className={`absolute top-16 h-12 rounded-lg border backdrop-blur-sm flex items-center px-3 cursor-pointer group transition-all
                            ${isSelected ? 'bg-gold-500/20 border-gold-500 z-20' : 'bg-slate-800/60 border-slate-700 hover:bg-slate-700 hover:border-slate-500 z-10'}
                        `}
                        style={{ left: `${startX}%`, width: `${width}%`, minWidth: '24px' }}
                      >
                          <div className={`truncate text-xs font-bold flex items-center gap-2 ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                              {o.type === 'session' ? <Clock size={10}/> : <Layers size={10}/>}
                              <span className="hidden sm:inline">{o.title}</span>
                          </div>
                      </div>
                  )
              })}

              {/* 4. NEWS DOTS (Only visible on timeline if zoomed in enough) */}
              {viewDuration < 1000 * 60 * 60 * 24 * 7 && filteredNews.map(n => {
                  const x = t2x(n.timestamp);
                  if (x < -2 || x > 102) return null;
                  const isHigh = n.impact === 'high';

                  return (
                      <div 
                        key={n.id}
                        onClick={(e) => { e.stopPropagation(); /* select if needed */ }}
                        className="absolute top-[60%] w-4 -ml-2 flex flex-col items-center group cursor-pointer z-30"
                        style={{ left: `${x}%` }}
                      >
                          <div className={`w-2 h-2 rounded-full mb-1 ${isHigh ? 'bg-red-500 animate-pulse' : 'bg-slate-400'}`}></div>
                          <div className="w-px h-8 bg-slate-700 group-hover:bg-slate-500"></div>
                          <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-dark-900 border border-slate-600 p-2 rounded text-[10px] whitespace-nowrap z-50 pointer-events-none shadow-xl">
                              <div className={`font-bold ${isHigh ? 'text-red-400' : 'text-white'}`}>{n.title}</div>
                              <div className="text-slate-500">{new Date(n.timestamp).toLocaleTimeString()}</div>
                          </div>
                      </div>
                  )
              })}

              {/* 5. CURRENT TIME & CROSSHAIR */}
              <div className="absolute top-0 bottom-8 w-px bg-red-500 z-20 pointer-events-none" style={{ left: `${t2x(Date.now())}%` }}>
                  <div className="absolute top-0 -translate-x-1/2 bg-red-600 text-[8px] text-white px-1 rounded-b font-bold">NOW</div>
              </div>
              {cursorTime && (
                  <div className="absolute top-0 bottom-8 w-px bg-white/20 z-40 pointer-events-none border-l border-dashed border-white/50" style={{ left: `${t2x(cursorTime)}%` }}>
                      <div className="absolute bottom-0 translate-y-full -translate-x-1/2 bg-slate-800 text-slate-300 text-[9px] px-1 rounded border border-slate-700">
                          {new Date(cursorTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                      </div>
                  </div>
              )}

              {/* 6. TIME AXIS */}
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-dark-950 border-t border-slate-800 flex items-center overflow-hidden">
                  {ticks.map(({ t, format }) => {
                      const x = t2x(t);
                      const label = format === 'date' 
                        ? new Date(t).toLocaleDateString([], { month:'short', day:'numeric' })
                        : new Date(t).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
                      return (
                          <div key={t} className="absolute text-[9px] font-mono text-slate-500 -translate-x-1/2 whitespace-nowrap" style={{ left: `${x}%` }}>
                              {label}
                          </div>
                      )
                  })}
              </div>
          </div>
      </div>

      {/* --- BOTTOM: FILTERABLE DETAILS & FEED --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT: Contextual Narrative */}
          <div className="lg:col-span-2 bg-slate-900/50 rounded-xl p-6 border border-slate-700 h-[500px] flex flex-col">
              {activeItem ? (
                  <>
                      <div className="flex justify-between items-start mb-4">
                          <h3 className="text-white font-bold text-lg flex items-center gap-2">
                             {activeItem.type === 'session' ? <Sun size={18} className="text-gold-500"/> : <Layers size={18} className="text-blue-500"/>}
                             {activeItem.title}
                          </h3>
                          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                              activeItem.bias === 'bullish' ? 'bg-green-500/10 text-green-500' :
                              activeItem.bias === 'bearish' ? 'bg-red-500/10 text-red-500' : 'bg-slate-700 text-slate-400'
                          }`}>
                              {activeItem.bias}
                          </span>
                      </div>
                      <p className="text-slate-400 text-sm mb-6 leading-relaxed border-b border-slate-800 pb-4">{activeItem.summary}</p>
                      
                      <div className="overflow-y-auto custom-scrollbar flex-1 space-y-4 pr-2">
                          <h4 className="text-xs font-bold text-gold-500 uppercase sticky top-0 bg-slate-900/90 backdrop-blur py-2 z-10">
                              Mentor Updates & Events
                          </h4>
                          {(activeItem as any).timeline && (activeItem as any).timeline.map((e: any, i: number) => (
                              <div key={i} className="flex gap-4 p-3 bg-slate-800/50 rounded border border-slate-800">
                                  <div className="text-xs font-mono text-slate-500 min-w-[40px] pt-0.5">{e.label}</div>
                                  <div>
                                      <div className="text-xs font-bold text-white">{e.title}</div>
                                      {e.type === 'news' && (
                                          <div className="text-[10px] text-slate-500 mt-1">Impact: {e.impact}</div>
                                      )}
                                  </div>
                              </div>
                          ))}
                          
                          {/* Fallback if timeline is empty */}
                          {(!(activeItem as any).timeline || (activeItem as any).timeline.length === 0) && (
                              <div className="text-center py-10 opacity-50 text-sm text-slate-500 italic">
                                  No specific timeline events for this outlook.
                              </div>
                          )}
                      </div>
                  </>
              ) : (
                  <div className="flex flex-col items-center justify-center h-full opacity-50">
                      <MousePointer2 size={48} className="mb-4 text-slate-600"/>
                      <p className="text-slate-400">Select an item on the timeline above to view narrative.</p>
                  </div>
              )}
          </div>

          {/* RIGHT: Global Feed (Past & Future) */}
          <div className="lg:col-span-1 space-y-4">
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 space-y-3">
                  <div className="flex justify-between text-xs font-bold text-slate-400 uppercase">
                      <span>Global Filters</span>
                      <span className="text-gold-500">{filteredNews.length} Events</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                      <select value={filterImpact} onChange={(e) => setFilterImpact(e.target.value as any)} className="bg-dark-950 border border-slate-700 rounded p-2 text-xs text-white outline-none">
                          <option value="all">Impact: All</option>
                          <option value="high">High Only</option>
                      </select>
                      <select value={filterCurrency} onChange={(e) => setFilterCurrency(e.target.value)} className="bg-dark-950 border border-slate-700 rounded p-2 text-xs text-white outline-none">
                          <option value="ALL">Currencies: All</option>
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                      </select>
                  </div>
                  <select value={filterPair} onChange={(e) => setFilterPair(e.target.value)} className="w-full bg-dark-950 border border-slate-700 rounded p-2 text-xs text-gold-500 font-bold outline-none">
                      <option value="ALL">All Pairs</option>
                      <option value="XAUUSD">XAUUSD</option>
                      <option value="EURUSD">EURUSD</option>
                      <option value="NAS100">NAS100</option>
                  </select>
              </div>

              {/* Feed Container */}
              <div className="bg-dark-950 rounded-xl border border-slate-700 overflow-hidden shadow-2xl h-[500px] flex flex-col">
                  <div className="bg-slate-900 p-3 border-b border-slate-800 text-xs font-bold text-slate-300 flex justify-between">
                      <span>Terminal Feed (+/- 30 Days)</span>
                      <Activity size={12} className="text-green-500 animate-pulse"/>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                      {filteredNews.length === 0 ? (
                          <div className="p-8 text-center text-xs text-slate-500 italic">
                              No news found for this period.
                          </div>
                      ) : (
                          filteredNews.map(n => {
                              // Highlight events near the cursor/view center
                              const isNearView = Math.abs(n.timestamp - viewCenter) < viewDuration / 2;
                              return (
                                  <div key={n.id} className={`p-3 border-b border-slate-800/50 hover:bg-slate-800/50 transition-colors ${!isNearView ? 'opacity-50 hover:opacity-100' : ''}`}>
                                      <div className="flex justify-between mb-1">
                                          <span className="text-[10px] text-slate-500 font-mono">
                                              {new Date(n.timestamp).toLocaleDateString()} {new Date(n.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                          </span>
                                          <span className={`text-[9px] font-bold uppercase ${n.impact==='high'?'text-red-500':'text-slate-500'}`}>{n.impact}</span>
                                      </div>
                                      <div className="text-xs font-bold text-slate-200">{n.title}</div>
                                      {n.currency && <div className="mt-1 inline-block text-[9px] bg-slate-900 text-slate-400 px-1 rounded border border-slate-800">{n.currency}</div>}
                                  </div>
                              )
                          })
                      )}
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default MentorOutlookComponent;