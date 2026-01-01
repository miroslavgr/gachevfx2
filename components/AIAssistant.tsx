
import React, { useState, useEffect, useRef } from 'react';
import { Bot, Mic, X, Send, Sparkles, Brain, Volume2 } from 'lucide-react';
import { chatWithAssistant, transcribeAudio, generateSpeech, getMarketNews } from '../services/geminiService';

const AIAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user'|'model', text: string}[]>([
      { role: 'model', text: "Hello trader. I am MentorBot. How can I assist your scalping session today?" }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mode, setMode] = useState<'standard' | 'thinking' | 'search'>('standard');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
      if (!input.trim()) return;

      const userMsg = input;
      setInput('');
      setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
      setIsThinking(true);

      // Prepare history for API
      const history = messages.map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
      }));

      try {
          let responseText = '';
          
          if (mode === 'search') {
              const res = await getMarketNews(userMsg);
              responseText = res.text;
              if (res.chunks && res.chunks.length > 0) {
                  responseText += "\n\nSources:\n" + res.chunks.map((c: any) => `- ${c.web?.title || 'Link'}: ${c.web?.uri}`).join('\n');
              }
          } else {
              responseText = await chatWithAssistant(userMsg, history, mode === 'thinking');
          }
          
          setMessages(prev => [...prev, { role: 'model', text: responseText }]);

          // Auto-play TTS if it's a short response or requested? 
          // For now, let's keep TTS manual or implicit.
          
      } catch (e) {
          setMessages(prev => [...prev, { role: 'model', text: "System Error." }]);
      } finally {
          setIsThinking(false);
      }
  };

  const startRecording = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;
          const chunks: BlobPart[] = [];

          mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
          mediaRecorder.onstop = async () => {
              const blob = new Blob(chunks, { type: 'audio/wav' }); // or webm
              // Convert blob to base64
              const reader = new FileReader();
              reader.readAsDataURL(blob);
              reader.onloadend = async () => {
                  const base64 = (reader.result as string).split(',')[1];
                  setIsThinking(true);
                  const text = await transcribeAudio(base64);
                  setIsThinking(false);
                  if (text) {
                      setInput(text);
                  }
              };
          };

          mediaRecorder.start();
          setIsRecording(true);
      } catch (err) {
          console.error("Mic access denied", err);
      }
  };

  const stopRecording = () => {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
  };

  const playTTS = async (text: string) => {
      const audioData = await generateSpeech(text);
      if (audioData) {
          const audio = new Audio(`data:audio/mp3;base64,${audioData}`);
          audio.play();
      }
  };

  return (
    <>
      {/* Trigger Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gold-500 rounded-full shadow-[0_0_20px_rgba(234,179,8,0.4)] flex items-center justify-center text-dark-900 hover:scale-110 transition-transform z-50"
      >
        <Bot size={28} />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[600px] glass-panel rounded-2xl border border-slate-600 shadow-2xl flex flex-col z-50 overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Bot className="text-gold-500" />
                    <span className="font-bold text-white">MentorBot</span>
                </div>
                <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
                    <X size={20} />
                </button>
            </div>

            {/* Mode Selector */}
            <div className="flex p-2 bg-slate-900 gap-1">
                <button 
                    onClick={() => setMode('standard')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded ${mode === 'standard' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}
                >
                    Chat
                </button>
                <button 
                    onClick={() => setMode('thinking')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded flex items-center justify-center gap-1 ${mode === 'thinking' ? 'bg-purple-900/40 text-purple-300' : 'text-slate-500'}`}
                >
                    <Brain size={12} />
                    Think
                </button>
                <button 
                    onClick={() => setMode('search')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded flex items-center justify-center gap-1 ${mode === 'search' ? 'bg-blue-900/40 text-blue-300' : 'text-slate-500'}`}
                >
                    <Sparkles size={12} />
                    Search
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/50">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                            msg.role === 'user' 
                            ? 'bg-gold-600 text-dark-900 font-medium rounded-tr-none' 
                            : 'bg-slate-700 text-slate-200 rounded-tl-none'
                        }`}>
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                            {msg.role === 'model' && (
                                <button 
                                    onClick={() => playTTS(msg.text)}
                                    className="mt-2 text-slate-400 hover:text-white"
                                    title="Read Aloud"
                                >
                                    <Volume2 size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
                {isThinking && (
                    <div className="flex justify-start">
                        <div className="bg-slate-700 p-3 rounded-2xl rounded-tl-none flex items-center gap-2">
                             <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                             <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></div>
                             <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-slate-800 border-t border-slate-700">
                <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-xl border border-slate-700">
                    <button 
                        onMouseDown={startRecording}
                        onMouseUp={stopRecording}
                        onTouchStart={startRecording}
                        onTouchEnd={stopRecording}
                        className={`p-2 rounded-lg transition-colors ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'text-slate-400 hover:text-gold-500'}`}
                    >
                        <Mic size={20} />
                    </button>
                    <input 
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder={isRecording ? "Listening..." : "Ask Mentor..."}
                        className="flex-1 bg-transparent border-none outline-none text-white text-sm"
                        disabled={isThinking || isRecording}
                    />
                    <button 
                        onClick={handleSend}
                        disabled={!input.trim() || isThinking}
                        className="p-2 text-gold-500 hover:bg-gold-500/10 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <Send size={20} />
                    </button>
                </div>
            </div>
        </div>
      )}
    </>
  );
};

export default AIAssistant;