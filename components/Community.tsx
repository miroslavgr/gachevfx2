import React, { useState, useRef, useEffect, useCallback } from 'react';
import { User, Channel, ChatMessage, Trade, VideoResource, UserRole } from '../types';
import { Hash, Mic, MicOff, Send, Monitor, PhoneOff, Video, Users, MessageSquare, AtSign, TrendingUp, X, Filter, Image as ImageIcon, Circle, StopCircle, Plus, Trash2, Loader, Bot, Volume2, VolumeX } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { VideoService, ChatService } from '../services/api';

interface CommunityProps {
  currentUser: User;
  trades: Trade[];
  channels: Channel[];
  allUsers: User[]; // <--- New Prop: Real Users
  onAddChannel: (channel: Channel) => void;
  onDeleteChannel: (channelId: string) => void;
  onNavigateToProfile: (userId: string) => void;
  onNavigateToTrade: (tradeId: string) => void;
  onSaveRecording?: (video: VideoResource) => void;
}

// Helper for audio buffer conversion (Float32 -> Int16)
const floatTo16BitPCM = (input: Float32Array) => {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]));
        output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return output;
};

const Community: React.FC<CommunityProps> = ({ currentUser, trades, channels, allUsers, onAddChannel, onDeleteChannel, onNavigateToProfile, onNavigateToTrade, onSaveRecording }) => {
  const [activeChannel, setActiveChannel] = useState<Channel>(channels[0] || { id: 'general', name: 'General', type: 'public' });
  const [messages, setMessages] = useState<ChatMessage[]>([]); // <--- No Mocks
  const [inputText, setInputText] = useState('');
  const { t } = useLanguage();
  
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const chatFileRef = useRef<HTMLInputElement>(null);
  
  // Voice & Media State
  const [isMuted, setIsMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [screenShareError, setScreenShareError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingRecording, setIsProcessingRecording] = useState(false);
  
  // Audio Visualizer State
  const [localVolume, setLocalVolume] = useState(0); 
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Gemini Live State
  const [isAIConnected, setIsAIConnected] = useState(false);
  const [isAIMuted, setIsAIMuted] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionType, setSuggestionType] = useState<'user' | 'trade' | null>(null);
  const [suggestionQuery, setSuggestionQuery] = useState('');
  const [cursorPos, setCursorPos] = useState(0);

  const [isAddingChannel, setIsAddingChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState<'public' | 'voice'>('public');

  const inputRef = useRef<HTMLInputElement>(null);

  // --- 1. REAL-TIME MESSAGING SUBSCRIPTION ---
  useEffect(() => {
      // Subscribe to messages when channel changes
      const unsubscribe = ChatService.subscribeToChannel(activeChannel.id, (newMessages) => {
          setMessages(newMessages);
      });
      return () => unsubscribe();
  }, [activeChannel.id]);
  // -------------------------------------------

  useEffect(() => {
      if (!channels.find(c => c.id === activeChannel.id) && channels.length > 0) {
          setActiveChannel(channels[0]);
      }
  }, [channels, activeChannel]);

  useEffect(() => {
      return () => {
          if (audioContextRef.current) audioContextRef.current.close();
          if (wsRef.current) wsRef.current.close();
          if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      };
  }, []);

  const videoRef = useCallback((node: HTMLVideoElement) => {
    if (node && screenStream) {
      node.srcObject = screenStream;
    }
  }, [screenStream]);

  // --- GEMINI LIVE HANDLERS ---
  const connectToGemini = async () => {
      if (isAIConnected) {
          disconnectGemini();
          return;
      }

      // @ts-ignore
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) {
          alert("VITE_GEMINI_API_KEY is missing in .env");
          return;
      }

      try {
          if (!audioContextRef.current) {
              audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
          }

          const url = `wss://generativelanguage.googleapis.com/v1alpha/models/gemini-2.0-flash-exp:predict-stream?key=${apiKey}`;
          const ws = new WebSocket(url);
          
          ws.onopen = () => {
              setIsAIConnected(true);
              const setupMsg = {
                  setup: {
                      model: "models/gemini-2.0-flash-exp",
                      generationConfig: { responseModalities: ["AUDIO"] }
                  }
              };
              ws.send(JSON.stringify(setupMsg));
          };

          ws.onmessage = async (event) => {
              const data = JSON.parse(event.data);
              if (data.serverContent?.modelTurn?.parts?.[0]?.inlineData) {
                  const base64Audio = data.serverContent.modelTurn.parts[0].inlineData.data;
                  playAiAudio(base64Audio);
                  setAiSpeaking(true);
                  setTimeout(() => setAiSpeaking(false), 500); 
              }
          };

          ws.onclose = () => setIsAIConnected(false);
          wsRef.current = ws;
          startAudioStreamToGemini();

      } catch (err) {
          alert("Could not connect to Gemini Live.");
      }
  };

  const disconnectGemini = () => {
      if (wsRef.current) {
          wsRef.current.close();
          wsRef.current = null;
      }
      setIsAIConnected(false);
  };

  const startAudioStreamToGemini = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setupVisualizer(stream);

      if (!audioContextRef.current) return;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      const processor = audioContextRef.current.createScriptProcessor(512, 1, 1);

      source.connect(processor);
      processor.connect(audioContextRef.current.destination);

      processor.onaudioprocess = (e) => {
          if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || isMuted) return;
          const inputData = e.inputBuffer.getChannelData(0);
          const pcm16 = floatTo16BitPCM(inputData);
          const base64String = btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)));
          const msg = { realtimeInput: { mediaChunks: [{ mimeType: "audio/pcm", data: base64String }] } };
          wsRef.current.send(JSON.stringify(msg));
      };
  };

  const playAiAudio = async (base64String: string) => {
      if (isAIMuted || !audioContextRef.current) return;
      const binaryString = atob(base64String);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;
      const audioBuffer = audioContextRef.current.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start();
  };

  const setupVisualizer = (stream: MediaStream) => {
      if (!audioContextRef.current) return;
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;
      
      const updateVolume = () => {
          if (analyserRef.current) {
              const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
              analyserRef.current.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
              setLocalVolume(sum / dataArray.length);
          }
          animationFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();
  };

  // --- UPDATED SEND HANDLER ---
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !imageFile) return;

    let publicImageUrl = undefined;
    if (imageFile) {
        try {
            publicImageUrl = await ChatService.uploadImage(imageFile);
        } catch (err) {
            console.error("Image upload failed", err);
            return;
        }
    }

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      userId: currentUser.id,
      userName: currentUser.name,
      content: inputText,
      imageUrl: publicImageUrl,
      timestamp: Date.now(),
      channelId: activeChannel.id
    };

    // Send to API (Listeners will update UI)
    await ChatService.sendMessage(newMessage);

    setInputText('');
    setAttachedImage(null);
    setImageFile(null);
    setShowSuggestions(false);
  };

  const handleCreateChannel = () => {
      if (!newChannelName.trim()) return;
      const newChan: Channel = {
          id: newChannelName.toLowerCase().replace(/\s+/g, '-'),
          name: newChannelName,
          type: newChannelType
      };
      onAddChannel(newChan);
      setIsAddingChannel(false);
      setNewChannelName('');
  };

  const handleChatImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) {
          const file = e.target.files[0];
          setImageFile(file);
          const reader = new FileReader();
          reader.onloadend = () => {
              setAttachedImage(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  // Use state messages instead of filter
  const channelMessages = messages; 

  const toggleScreenShare = async () => {
      setScreenShareError(null);
      if (isScreenSharing) {
          if (screenStream) {
              screenStream.getTracks().forEach(track => track.stop());
              setScreenStream(null);
          }
          setIsScreenSharing(false);
      } else {
          try {
              const stream = await navigator.mediaDevices.getDisplayMedia({ 
                  video: { cursor: "always" } as any, 
                  audio: true 
              });
              setScreenStream(stream);
              setIsScreenSharing(true);
              stream.getVideoTracks()[0].onended = () => {
                  setScreenStream(null);
                  setIsScreenSharing(false);
              };
          } catch (err: any) {
              setScreenShareError("Failed to start screen share.");
          }
      }
  };

  const toggleRecording = () => {
      if (isRecording) {
          stopRecording();
      } else {
          startRecording();
      }
  };

  const startRecording = async () => {
      try {
          let videoStream: MediaStream;
          if (isScreenSharing && screenStream) {
              videoStream = screenStream;
          } else {
              videoStream = await navigator.mediaDevices.getDisplayMedia({ 
                  video: { cursor: "always" } as any, 
                  audio: true 
              });
          }

          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const combinedStream = new MediaStream();
          videoStream.getVideoTracks().forEach(track => combinedStream.addTrack(track));

          if (videoStream.getAudioTracks().length > 0) combinedStream.addTrack(videoStream.getAudioTracks()[0]);
          if (audioStream.getAudioTracks().length > 0) combinedStream.addTrack(audioStream.getAudioTracks()[0]);

          recordedChunksRef.current = [];
          const recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm' });
          mediaRecorderRef.current = recorder;

          recorder.ondataavailable = (event) => {
              if (event.data && event.data.size > 0) {
                  recordedChunksRef.current.push(event.data);
              }
          };

          recorder.onstop = () => {
              audioStream.getTracks().forEach(t => t.stop());
              if (!isScreenSharing && videoStream) {
                  videoStream.getTracks().forEach(t => t.stop());
              }
              
              setTimeout(async () => {
                  const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
                  if (blob.size === 0) return; 

                  if (onSaveRecording) {
                      setIsProcessingRecording(true); 
                      try {
                          const permUrl = await VideoService.uploadVideo(blob);
                          const newVideo: VideoResource = {
                              id: Date.now().toString(),
                              title: `Live Session - ${new Date().toLocaleString()}`,
                              description: 'Recording with Screen & Voice',
                              url: permUrl, 
                              authorName: currentUser.name,
                              timestamp: Date.now(),
                              type: 'live_recording',
                              duration: 'Recorded',
                          };
                          onSaveRecording(newVideo);
                          alert("Session automatically saved to Video Archive!");
                      } catch (err) {
                          console.error("Failed to upload recording", err);
                          alert("Failed to save recording to cloud.");
                      } finally {
                          setIsProcessingRecording(false);
                      }
                  }
              }, 500);
          };

          recorder.start(1000);
          setIsRecording(true);

      } catch (err) {
          console.error("Recording setup failed", err);
          setScreenShareError("Failed to start recording.");
      }
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
      }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      const pos = e.target.selectionStart || 0;
      setInputText(val);
      setCursorPos(pos);

      const textBeforeCursor = val.slice(0, pos);
      const lastWordMatch = textBeforeCursor.match(/(\S+)$/);
      const currentWord = lastWordMatch ? lastWordMatch[0] : '';

      if (currentWord.startsWith('@')) {
          setSuggestionType('user');
          setSuggestionQuery(currentWord.slice(1));
          setShowSuggestions(true);
      } else if (currentWord.startsWith('#')) {
          setSuggestionType('trade');
          setSuggestionQuery(currentWord.slice(1));
          setShowSuggestions(true);
      } else {
          setShowSuggestions(false);
      }
  };

  const insertTag = (tag: string) => {
      const textBeforeCursor = inputText.slice(0, cursorPos);
      const textAfterCursor = inputText.slice(cursorPos);
      const lastWordMatch = textBeforeCursor.match(/(\S+)$/);
      
      if (lastWordMatch) {
          const matchIndex = lastWordMatch.index!;
          const newTextBefore = textBeforeCursor.slice(0, matchIndex) + tag + ' ';
          const newText = newTextBefore + textAfterCursor;
          setInputText(newText);
          setShowSuggestions(false);
          if (inputRef.current) inputRef.current.focus();
      }
  };

  const filteredSuggestions = () => {
      const query = suggestionQuery.toLowerCase();
      if (suggestionType === 'user') {
          return allUsers.filter(u => u.name.toLowerCase().includes(query)).slice(0, 5); // <--- Using Real Users
      }
      if (suggestionType === 'trade') {
          return trades.filter(t => 
              t.id.toLowerCase().includes(query) ||
              t.pair.toLowerCase().includes(query) ||
              t.strategy.toLowerCase().includes(query) ||
              t.timeframe.toLowerCase().includes(query) ||
              t.userName.toLowerCase().includes(query)
          ).slice(0, 5);
      }
      return [];
  };

  const renderMessageContent = (content: string) => {
      const words = content.split(/(\s+)/);
      return words.map((word, i) => {
          if (word.match(/^@\w+/)) {
              const cleanName = word.substring(1).replace(/[^a-zA-Z0-9 ]/g, ''); 
              // Look up in Real Users
              const user = allUsers.find(u => u.name.replace(/\s/g, '') === cleanName || u.name.split(' ')[0] === cleanName);
              if (user) {
                   return (
                       <span key={i} onClick={() => onNavigateToProfile(user.id)} className="text-gold-500 font-bold cursor-pointer hover:underline bg-gold-500/10 rounded px-1">{word}</span>
                   );
              }
              return <span key={i} className="text-gold-500/70 font-bold">{word}</span>;
          }
          if (word.match(/^#t[a-zA-Z0-9]+/)) {
               const tradeId = word.substring(1).replace(/[^a-zA-Z0-9]/g, '');
               const trade = trades.find(t => t.id === tradeId);
               if (trade) {
                   return (
                       <span key={i} onClick={() => onNavigateToTrade(tradeId)} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-xs cursor-pointer hover:bg-blue-500/20 transition-all align-middle mx-1">
                           <span className={`w-1.5 h-1.5 rounded-full ${trade.pnl > 0 ? 'bg-green-500' : 'bg-red-500'}`}></span>
                           <span className="font-bold text-blue-300">{trade.pair}</span>
                       </span>
                   );
               }
               return <span key={i} className="text-blue-400 font-bold">{word}</span>;
          }
          return word;
      });
  };

  return (
    <div className="flex h-[calc(100vh-80px)] glass-panel rounded-2xl overflow-hidden border border-slate-700">
       <div className="w-64 bg-dark-800 border-r border-slate-700 flex flex-col hidden md:flex">
          <div className="p-4 border-b border-slate-700 flex justify-between items-center">
             <h3 className="font-bold text-white">{t('comm.rooms')}</h3>
             {currentUser.role === UserRole.ADMIN && (
                 <button 
                    onClick={() => setIsAddingChannel(!isAddingChannel)} 
                    className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                    title="Add Channel"
                 >
                     <Plus size={16} />
                 </button>
             )}
          </div>
          
          {isAddingChannel && (
              <div className="p-3 bg-slate-900 border-b border-slate-700 space-y-2 animate-in slide-in-from-top-2">
                  <input 
                    type="text" 
                    placeholder="Channel Name" 
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-white outline-none"
                  />
                  <div className="flex gap-2">
                      <select 
                        value={newChannelType} 
                        onChange={(e) => setNewChannelType(e.target.value as any)}
                        className="bg-slate-800 border border-slate-700 rounded p-1 text-xs text-white flex-1"
                      >
                          <option value="public">Text</option>
                          <option value="voice">Voice</option>
                      </select>
                      <button onClick={handleCreateChannel} className="bg-gold-500 text-dark-900 px-3 rounded text-xs font-bold hover:bg-gold-400">Add</button>
                  </div>
              </div>
          )}

          <div className="p-2 space-y-1 overflow-y-auto flex-1">
             {channels.map(channel => (
                 <div key={channel.id} className="group relative">
                     <button 
                        onClick={() => setActiveChannel(channel)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${activeChannel.id === channel.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'}`}
                     >
                        {channel.type === 'voice' ? <Mic size={16} /> : <Hash size={16} />}
                        <span className="truncate flex-1 text-left">{channel.name}</span>
                     </button>
                     {currentUser.role === UserRole.ADMIN && (
                         <button 
                            onClick={(e) => { e.stopPropagation(); if(confirm(`Delete ${channel.name}?`)) onDeleteChannel(channel.id); }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                         >
                             <Trash2 size={12} />
                         </button>
                     )}
                 </div>
             ))}
          </div>
          <div className="p-4 bg-dark-900 border-t border-slate-800">
              <div className="flex items-center gap-2 text-green-400 text-xs">
                 <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                 {allUsers.length} {t('comm.online')}
              </div>
          </div>
       </div>

       <div className="flex-1 flex flex-col bg-slate-900/50 relative">
          
          <div className="h-14 border-b border-slate-700 flex items-center justify-between px-6 bg-slate-800/50 backdrop-blur-sm z-10">
             <div className="flex items-center gap-2">
                 <div className="md:hidden mr-2">
                    <Hash size={20} className="text-slate-500"/>
                 </div>
                 {activeChannel.type === 'voice' ? <Mic size={20} className="text-gold-500" /> : <Hash size={20} className="text-slate-400" />}
                 <h3 className="font-bold text-white">{activeChannel.name}</h3>
             </div>
             {activeChannel.type === 'voice' && (
                 <div className="flex items-center gap-4">
                     <button 
                        onClick={connectToGemini}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isAIConnected ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'bg-slate-800 text-purple-400 border border-purple-500/30 hover:bg-purple-900/20'}`}
                     >
                         <Bot size={14} />
                         {isAIConnected ? 'Disconnect AI' : 'Connect AI'}
                     </button>

                     <div className="flex items-center gap-2">
                         <Users size={16} className="text-slate-400"/>
                         <span className="text-xs text-slate-400 font-bold">Active</span>
                     </div>
                 </div>
             )}
          </div>

          {activeChannel.type === 'voice' ? (
              <div className="flex-1 flex flex-col">
                  <div className="flex-1 bg-dark-950 relative p-4 grid place-items-center overflow-hidden">
                      {isScreenSharing ? (
                          <div className="w-full h-full bg-black rounded-xl overflow-hidden border border-slate-700 relative group flex items-center justify-center">
                              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain" />
                              {/* ... (Existing Screen Share UI) ... */}
                          </div>
                      ) : (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-4xl p-4">
                              {/* 1. CURRENT USER */}
                              <div className="aspect-video bg-slate-800 rounded-xl flex flex-col items-center justify-center border-2 relative shadow-lg transition-all duration-75" style={{ borderColor: localVolume > 20 ? '#EAB308' : '#334155' }}>
                                  <div className="relative">
                                      <img src={currentUser.avatar} className="w-16 h-16 rounded-full mb-2 border-2 border-slate-600 z-10 relative" />
                                      {localVolume > 20 && (
                                          <div 
                                            className="absolute inset-0 rounded-full bg-gold-500/50 animate-ping" 
                                            style={{ transform: `scale(${1 + localVolume / 100})` }}
                                          ></div>
                                      )}
                                  </div>
                                  <span className="text-sm font-bold text-slate-300">{currentUser.name} (You)</span>
                                  {isMuted && <MicOff size={14} className="absolute top-3 right-3 text-red-500" />}
                              </div>

                              {/* 2. GEMINI AI AGENT */}
                              {isAIConnected && (
                                  <div className={`aspect-video bg-purple-900/10 rounded-xl flex flex-col items-center justify-center border-2 relative shadow-lg ${aiSpeaking ? 'border-purple-500 shadow-purple-500/20' : 'border-slate-700'}`}>
                                      <div className="relative">
                                          <div className={`w-16 h-16 rounded-full mb-2 flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-inner ${aiSpeaking ? 'animate-pulse' : ''}`}>
                                              <Bot size={32} />
                                          </div>
                                          {aiSpeaking && <div className="absolute inset-0 bg-purple-500/30 rounded-full animate-ping"></div>}
                                      </div>
                                      <span className="text-sm font-bold text-purple-300">Gemini Live</span>
                                      
                                      <button 
                                        onClick={() => setIsAIMuted(!isAIMuted)}
                                        className="absolute top-3 right-3 p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-slate-300 hover:text-white transition-colors"
                                      >
                                          {isAIMuted ? <VolumeX size={14}/> : <Volume2 size={14}/>}
                                      </button>
                                  </div>
                              )}
                          </div>
                      )}
                      
                      {screenShareError && (
                          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-xl flex items-center gap-2">
                              <X size={16} /> {screenShareError}
                              <button onClick={() => setScreenShareError(null)} className="ml-2 bg-black/20 p-1 rounded hover:bg-black/40"><X size={12}/></button>
                          </div>
                      )}

                      {isProcessingRecording && (
                          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50">
                              <Loader size={48} className="text-gold-500 animate-spin mb-4" />
                              <p className="text-white font-bold">Uploading Recording to Archive...</p>
                              <p className="text-slate-400 text-xs mt-2">Please wait, do not close.</p>
                          </div>
                      )}
                  </div>

                  <div className="h-20 bg-dark-900 border-t border-slate-800 flex items-center justify-center gap-6 shadow-2xl z-20">
                      <button 
                          onClick={() => setIsMuted(!isMuted)} 
                          className={`p-4 rounded-full transition-all duration-200 transform hover:scale-105 ${isMuted ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
                      >
                          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                      </button>
                      
                      <button 
                          onClick={toggleScreenShare}
                          className={`p-4 rounded-full transition-all duration-200 transform hover:scale-105 ${isScreenSharing ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
                          title={isScreenSharing ? "Stop Sharing" : "Share Screen"}
                      >
                          <Monitor size={24} />
                      </button>

                      <button 
                        onClick={toggleRecording}
                        className={`p-4 rounded-full transition-all duration-200 transform hover:scale-105 ${isRecording ? 'bg-red-600 text-white shadow-lg shadow-red-600/30 animate-pulse' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
                        title={isRecording ? "Stop Recording" : "Start Recording"}
                        disabled={isProcessingRecording}
                      >
                         {isRecording ? <StopCircle size={24} /> : <Circle size={24} fill="red" className="text-red-500" />}
                      </button>

                      <button 
                         className="p-4 rounded-full bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/20 transform hover:scale-105"
                         title="Disconnect"
                      >
                          <PhoneOff size={24} />
                      </button>
                  </div>
              </div>
          ) : (
            // Text Chat View
            <>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {channelMessages.map(msg => (
                        <div key={msg.id} className="flex gap-4 group">
                            <div className="w-10 h-10 rounded-full bg-slate-700 flex-shrink-0 flex items-center justify-center overflow-hidden border border-slate-600">
                                {(() => {
                                    // Lookup User
                                    const u = allUsers.find(user => user.id === msg.userId);
                                    return u ? <img src={u.avatar} className="w-full h-full object-cover"/> : msg.userName.charAt(0);
                                })()}
                            </div>
                            <div>
                                <div className="flex items-baseline gap-2">
                                    <span 
                                        onClick={() => onNavigateToProfile(msg.userId)}
                                        className={`font-bold text-sm cursor-pointer hover:underline ${msg.userName === currentUser.name ? 'text-gold-500' : 'text-white'}`}
                                    >
                                        {msg.userName}
                                    </span>
                                    <span className="text-xs text-slate-500">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                </div>
                                
                                {msg.imageUrl && (
                                    <div className="mt-2 mb-1">
                                        <img src={msg.imageUrl} className="max-w-[250px] max-h-[200px] rounded-lg border border-slate-700 cursor-pointer hover:border-gold-500 transition-colors" />
                                    </div>
                                )}
                                
                                {msg.content && (
                                    <div className="text-slate-300 text-sm mt-1 leading-relaxed">
                                        {renderMessageContent(msg.content)}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-4 bg-dark-800 border-t border-slate-700 relative">
                    
                    {showSuggestions && (
                        <div className="absolute bottom-full mb-2 left-4 w-96 bg-slate-800/95 backdrop-blur-xl border border-slate-600 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                            {/* ... Suggestion Box ... */}
                            <div className="px-3 py-2 bg-slate-900/50 border-b border-slate-700 text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                                <span>{suggestionType === 'user' ? 'Mention User' : 'Filter & Link Trade'}</span>
                                {suggestionType === 'trade' && <Filter size={10} />}
                            </div>
                            <div className="max-h-64 overflow-y-auto">
                                {filteredSuggestions().map((item: any) => (
                                    <button
                                        key={item.id}
                                        onClick={() => insertTag(suggestionType === 'user' ? `@${item.name.split(' ')[0]}` : `#${item.id}`)}
                                        className="w-full text-left px-4 py-3 hover:bg-gold-500/10 hover:text-gold-400 transition-colors flex items-center gap-3 border-b border-slate-700/50 last:border-0"
                                    >
                                        {suggestionType === 'user' ? (
                                            <>
                                                <img src={item.avatar} className="w-8 h-8 rounded-full border border-slate-600" />
                                                <span className="font-bold text-sm">{item.name}</span>
                                            </>
                                        ) : (
                                            <>
                                                <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-[10px] font-bold ${item.pnl > 0 ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                                                    {item.pnl > 0 ? 'W' : 'L'}
                                                </div>
                                                <div className="flex flex-col overflow-hidden">
                                                    <span className="font-bold text-sm text-white flex items-center gap-2 truncate">
                                                        {item.userName} 
                                                        <span className="text-slate-500 font-normal text-xs">• {item.pair}</span>
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 flex items-center gap-2">
                                                        <span className="bg-slate-700 px-1.5 rounded text-slate-300">{item.strategy}</span>
                                                        <span className="font-mono">{item.timeframe}</span>
                                                        <span>•</span>
                                                        <span>#{item.id}</span>
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {attachedImage && (
                        <div className="absolute bottom-full mb-4 left-4 p-2 bg-slate-900 border border-slate-700 rounded-lg shadow-xl flex items-center gap-2 animate-in slide-in-from-bottom-2">
                            <img src={attachedImage} className="w-12 h-12 object-cover rounded border border-slate-600" />
                            <div className="text-xs text-slate-300">
                                <p className="font-bold">{t('comm.image_attached')}</p>
                                <p className="text-[10px] opacity-70">{t('comm.ready_send')}</p>
                            </div>
                            <button onClick={() => { setAttachedImage(null); setImageFile(null); }} className="p-1 hover:bg-slate-800 rounded-full text-slate-500 hover:text-white">
                                <X size={14} />
                            </button>
                        </div>
                    )}

                    <form onSubmit={handleSend} className="relative flex items-center gap-2">
                        <button 
                            type="button" 
                            onClick={() => chatFileRef.current?.click()}
                            className="p-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-gold-500 hover:border-gold-500/50 transition-all"
                        >
                            <ImageIcon size={20} />
                        </button>
                        <input type="file" ref={chatFileRef} className="hidden" accept="image/*" onChange={handleChatImageSelect} />

                        <div className="relative flex-1">
                            <input 
                                ref={inputRef}
                                type="text"
                                value={inputText}
                                onChange={handleInputChange}
                                placeholder={`${t('comm.placeholder')} #${activeChannel.name}`}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3.5 px-4 text-white focus:outline-none focus:border-gold-500 pr-12 transition-all shadow-inner placeholder:text-slate-600"
                            />
                            <button 
                                type="submit"
                                disabled={!inputText.trim() && !attachedImage}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-gold-500 transition-colors hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Send size={20} />
                            </button>
                        </div>
                    </form>
                </div>
            </>
          )}
       </div>
    </div>
  );
};

export default Community;