import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  User,
  Channel,
  ChatMessage,
  Trade,
  VideoResource,
  UserRole,
} from "../types";
import {
  Hash,
  Mic,
  MicOff,
  Send,
  Monitor,
  PhoneOff,
  Video,
  Users,
  MessageSquare,
  AtSign,
  TrendingUp,
  X,
  Filter,
  Image as ImageIcon,
  Circle,
  StopCircle,
  Plus,
  Trash2,
  Loader,
  Bot,
  Volume2,
  VolumeX,
  Check,
} from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import { VideoService, ChatService, UserService } from "../services/api";
import Peer from "simple-peer/simplepeer.min.js";

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
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return output;
};

const Community: React.FC<CommunityProps> = ({
  currentUser,
  trades,
  channels,
  allUsers,
  onAddChannel,
  onDeleteChannel,
  onNavigateToProfile,
  onNavigateToTrade,
  onSaveRecording,
}) => {
  const [activeChannel, setActiveChannel] = useState<Channel>(
    channels[0] || { id: "general", name: "General", type: "public" }
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]); // <--- No Mocks
  const [inputText, setInputText] = useState("");
  const { t } = useLanguage();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const chatFileRef = useRef<HTMLInputElement>(null);

  const [recordedVideoBlob, setRecordedVideoBlob] = useState<Blob | null>(null);
  const [showSaveOption, setShowSaveOption] = useState(false);

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
  const [suggestionType, setSuggestionType] = useState<"user" | "trade" | null>(
    null
  );
  const [suggestionQuery, setSuggestionQuery] = useState("");
  const [cursorPos, setCursorPos] = useState(0);

  const [isAddingChannel, setIsAddingChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelType, setNewChannelType] = useState<"public" | "voice">(
    "public"
  );

  // Inside the Community component:
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const peersRef = useRef<{ [key: string]: Peer.Instance }>({});
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  // --- REAL-TIME PRESENCE ---
  const [peers, setPeers] = useState<User[]>([]);
  const aiStreamRef = useRef<MediaStream | null>(null);
  // 1. Update my presence when channel changes

  useEffect(() => {
    return () => {
      // Close all peer connections on unmount/room change
      Object.values(peersRef.current).forEach((peer) => peer.destroy());
      peersRef.current = {};
      setRemoteStream(null);
    };
  }, [activeChannel.id]);

  useEffect(() => {
    if (currentUser && activeChannel.type === "voice") {
      // Mark myself as present in this channel
      UserService.updateUser({
        ...currentUser,
        currentChannelId: activeChannel.id,
      } as any);
    }

    // Cleanup: Leave channel when component unmounts or channel changes
    return () => {
      if (currentUser && activeChannel.type === "voice") {
        // We don't await this to keep UI snappy, fire and forget
        UserService.updateUser({
          ...currentUser,
          currentChannelId: null,
        } as any);
      }
    };
  }, [activeChannel.id, currentUser.id]);

  // 2. Listen for other users in this channel
  useEffect(() => {
    const unsubscribe = ChatService.subscribeToChannel(
      activeChannel.id,
      (newMessages) => {
        const chatMsgs = newMessages.filter((m) => {
          // DETECT WEBRTC SIGNALS (The "Handshake")
          if (m.content.startsWith('{"type":"signal"')) {
            try {
              const data = JSON.parse(m.content);
              // Only handle it if it is meant for ME
              if (data.to === currentUser.id) {
                handleIncomingSignal({ ...data, from: m.userId });
              }
            } catch (e) {
              console.error("Signal error", e);
            }
            return false; // Hide this JSON "beep" from the chat UI
          }
          return true;
        });
        setMessages(chatMsgs);
      }
    );
    return () => unsubscribe();
  }, [activeChannel.id, currentUser.id]);

  // --- 1. REAL-TIME MESSAGING SUBSCRIPTION ---
  useEffect(() => {
    // Subscribe to messages when channel changes
    const unsubscribe = ChatService.subscribeToChannel(
      activeChannel.id,
      (newMessages) => {
        setMessages(newMessages);
      }
    );
    return () => unsubscribe();
  }, [activeChannel.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (
      !channels.find((c) => c.id === activeChannel.id) &&
      channels.length > 0
    ) {
      setActiveChannel(channels[0]);
    }
  }, [channels, activeChannel]);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) audioContextRef.current.close();
      if (wsRef.current) wsRef.current.close();
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const videoRef = useCallback(
    (node: HTMLVideoElement) => {
      if (node && screenStream) {
        node.srcObject = screenStream;
      }
    },
    [screenStream]
  );

  // --- GEMINI LIVE HANDLERS (FIXED) ---
  const connectToGemini = async () => {
    if (isAIConnected) {
      disconnectGemini();
      return;
    }

    // @ts-ignore
    const apiKey =
      import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      alert("VITE_GEMINI_API_KEY is missing in .env");
      return;
    }

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BiDiGenerateContent?key=${apiKey}`;
      const ws = new WebSocket(url);
      ws.onopen = () => {
        console.log("Connected to Gemini");
        setIsAIConnected(true);

        const setupMsg = {
          setup: {
            model: "models/gemini-2.0-flash-exp",
            generation_config: {
              response_modalities: ["audio"],
            },
          },
        };
        ws.send(JSON.stringify(setupMsg));
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.serverContent?.modelTurn?.parts?.[0]?.inlineData) {
            const base64Audio =
              data.serverContent.modelTurn.parts[0].inlineData.data;
            playAiAudio(base64Audio);
            setAiSpeaking(true);
            setTimeout(() => setAiSpeaking(false), 500);
          }
        } catch (e) {
          console.error("Failed to parse Gemini message", e);
        }
      };

      ws.onerror = (error) => {
        console.error("Gemini WebSocket Error:", error);
        alert(
          "Failed to connect to Gemini AI. Check your API Key and Console."
        );
        setIsAIConnected(false);
      };

      ws.onclose = () => {
        console.log("Gemini Disconnected");
        setIsAIConnected(false);
        // Ensure mic is stopped if connection drops
        if (aiStreamRef.current) {
          aiStreamRef.current.getTracks().forEach((t) => t.stop());
          aiStreamRef.current = null;
        }
      };

      wsRef.current = ws;
      await startAudioStreamToGemini();
    } catch (err) {
      console.error("Connection Setup Error:", err);
      alert("Could not initialize AI connection.");
    }
  };

  const disconnectGemini = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    // STOP THE MIC STREAM (Fixes 'It does nothing' on reconnect)
    if (aiStreamRef.current) {
      aiStreamRef.current.getTracks().forEach((t) => t.stop());
      aiStreamRef.current = null;
    }
    setIsAIConnected(false);
  };

  const startAudioStreamToGemini = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      aiStreamRef.current = stream; // Store stream to close it later
      setupVisualizer(stream);

      if (!audioContextRef.current) return;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      const processor = audioContextRef.current.createScriptProcessor(
        512,
        1,
        1
      );

      source.connect(processor);
      processor.connect(audioContextRef.current.destination);
      processor.onaudioprocess = (e) => {
        if (
          !wsRef.current ||
          wsRef.current.readyState !== WebSocket.OPEN ||
          isMuted
        )
          return;

        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = floatTo16BitPCM(inputData);
        const base64String = btoa(
          String.fromCharCode(...new Uint8Array(pcm16.buffer))
        );

        // FIX: Field names use underscores in the WebSocket protocol
        const msg = {
          realtime_input: {
            media_chunks: [
              {
                mime_type: "audio/pcm;rate=24000",
                data: base64String,
              },
            ],
          },
        };
        wsRef.current.send(JSON.stringify(msg));
      };
    } catch (err) {
      console.error("Mic Error:", err);
      alert("Microphone access is required for AI.");
      disconnectGemini();
    }
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
      // FIX: THIS LINE. We use spread syntax to only add 'imageUrl' if it exists.
      // Passing 'undefined' causes Firestore setDoc() to crash immediately.
      ...(publicImageUrl ? { imageUrl: publicImageUrl } : {}),
      timestamp: Date.now(),
      channelId: activeChannel.id,
    };

    // 1. Optimistic Update (Show on screen immediately)
    setMessages((prev) => [...prev, newMessage]);

    // 2. Clear Input
    setInputText("");
    setAttachedImage(null);
    setImageFile(null);
    setShowSuggestions(false);

    // 3. Send to API
    const result = await ChatService.sendMessage(newMessage);

    // 4. Handle Failure (e.g. revert UI if database rejects it)
    if (!result.success) {
      console.error("Failed to save message to DB:", result.message);
      // Optional: Remove the failed message from the list so user knows it failed
      setMessages((prev) => prev.filter((m) => m.id !== newMessage.id));
      alert("Message failed to send. Check console for Firestore error.");
    }
  };

  const handleCreateChannel = () => {
    if (!newChannelName.trim()) return;
    const newChan: Channel = {
      id: newChannelName.toLowerCase().replace(/\s+/g, "-"),
      name: newChannelName,
      type: newChannelType,
    };
    onAddChannel(newChan);
    setIsAddingChannel(false);
    setNewChannelName("");
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
  // --- PEER TO PEER LOGIC ---
  const createPeer = (
    userIdToSignal: string,
    callerId: string,
    stream: MediaStream
  ) => {
    const peer = new Peer({ initiator: true, trickle: false, stream });
    peer.on("signal", (signal) => {
      // Send signal via Firestore/Chat (Signaling)
      ChatService.sendMessage({
        id: `sig-${Date.now()}`,
        userId: currentUser.id,
        userName: currentUser.name,
        content: JSON.stringify({ type: "signal", signal, to: userIdToSignal }),
        channelId: activeChannel.id,
        timestamp: Date.now(),
      });
    });
    return peer;
  };

  // Update toggleScreenShare to start the Peer handshake
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      screenStream?.getTracks().forEach((track) => track.stop());
      setScreenStream(null);
      setIsScreenSharing(false);
      await UserService.setScreenShareStatus(currentUser.id, false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        setScreenStream(stream);
        setIsScreenSharing(true);
        await UserService.setScreenShareStatus(currentUser.id, true);

        // Create peers for everyone else in the room
        peers.forEach((peerUser) => {
          const p = createPeer(peerUser.id, currentUser.id, stream);
          peersRef.current[peerUser.id] = p;
        });
      } catch (err) {
        alert("Failed to share.");
      }
    }
  };
  // --- WEBRTC SIGNALING HANDLERS ---

  const handleIncomingSignal = (data: { signal: any; from: string }) => {
    if (peersRef.current[data.from]) {
      peersRef.current[data.from].signal(data.signal);
    } else {
      // Create a new "Watching" peer
      const peer = new Peer({ initiator: false, trickle: false });

      peer.on("signal", (signal) => {
        // Send "Answer" back to Streamer
        ChatService.sendMessage({
          id: `sig-ans-${Date.now()}`,
          userId: currentUser.id,
          userName: currentUser.name,
          content: JSON.stringify({ type: "signal", signal, to: data.from }),
          channelId: activeChannel.id,
          timestamp: Date.now(),
        });
      });

      peer.on("stream", (stream) => {
        console.log("Pixels Received!");
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }
      });

      peer.signal(data.signal);
      peersRef.current[data.from] = peer;
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop(); // This triggers the onstop event created in startRecording
      setIsRecording(false);
    }
  };

  const startRecording = async () => {
    try {
      // Only use screen stream if sharing is ALREADY on, otherwise just mic
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const combinedStream = new MediaStream();

      if (isScreenSharing && screenStream) {
        screenStream
          .getVideoTracks()
          .forEach((track) => combinedStream.addTrack(track));
      }
      audioStream
        .getAudioTracks()
        .forEach((track) => combinedStream.addTrack(track));

      recordedChunksRef.current = [];
      const recorder = new MediaRecorder(combinedStream, {
        mimeType: "video/webm",
      });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        audioStream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(recordedChunksRef.current, {
          type: "video/webm",
        });
        setRecordedVideoBlob(blob);
        setShowSaveOption(true); // Show the "Save" button instead of auto-uploading
      };

      recorder.start(1000);
      setIsRecording(true);
    } catch (err) {
      alert("Recording failed.");
    }
  };

  const handleManualSave = async () => {
    if (!recordedVideoBlob || !onSaveRecording) return;
    setIsProcessingRecording(true);
    try {
      const permUrl = await VideoService.uploadVideo(recordedVideoBlob);
      onSaveRecording({
        id: Date.now().toString(),
        title: `Live Session - ${new Date().toLocaleString()}`,
        description: "Voice Recording",
        url: permUrl,
        authorName: currentUser.name,
        timestamp: Date.now(),
        type: "live_recording",
        duration: "Recorded",
      });
      alert("Saved to Archive!");
      setShowSaveOption(false);
      setRecordedVideoBlob(null);
    } catch (err) {
      alert("Failed to save.");
    } finally {
      setIsProcessingRecording(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const pos = e.target.selectionStart || 0;
    setInputText(val);
    setCursorPos(pos);

    const textBeforeCursor = val.slice(0, pos);
    const lastWordMatch = textBeforeCursor.match(/(\S+)$/);
    const currentWord = lastWordMatch ? lastWordMatch[0] : "";

    if (currentWord.startsWith("@")) {
      setSuggestionType("user");
      setSuggestionQuery(currentWord.slice(1));
      setShowSuggestions(true);
    } else if (currentWord.startsWith("#")) {
      setSuggestionType("trade");
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
      const newTextBefore = textBeforeCursor.slice(0, matchIndex) + tag + " ";
      const newText = newTextBefore + textAfterCursor;
      setInputText(newText);
      setShowSuggestions(false);
      if (inputRef.current) inputRef.current.focus();
    }
  };

  const filteredSuggestions = () => {
    const query = suggestionQuery.toLowerCase();
    if (suggestionType === "user") {
      return allUsers
        .filter((u) => u.name.toLowerCase().includes(query))
        .slice(0, 5); // <--- Using Real Users
    }
    if (suggestionType === "trade") {
      return trades
        .filter(
          (t) =>
            t.id.toLowerCase().includes(query) ||
            t.pair.toLowerCase().includes(query) ||
            t.strategy.toLowerCase().includes(query) ||
            t.timeframe.toLowerCase().includes(query) ||
            t.userName.toLowerCase().includes(query)
        )
        .slice(0, 5);
    }
    return [];
  };
  const renderMessageContent = (content: string) => {
    // Split by whitespace to process each word
    return content.split(/(\s+)/).map((word, i) => {
      // 1. Handle User Mentions (@Name)
      if (word.match(/^@\w+/)) {
        const name = word.substring(1).replace(/[^a-zA-Z0-9 ]/g, "");
        const u = allUsers.find(
          (u) =>
            u.name.replace(/\s/g, "") === name || u.name.split(" ")[0] === name
        );

        if (u) {
          return (
            <span
              key={i}
              onClick={() => onNavigateToProfile(u.id)}
              className="text-gold-500 font-bold cursor-pointer hover:underline bg-gold-500/10 rounded px-1"
            >
              {word}
            </span>
          );
        }
        return (
          <span key={i} className="text-gold-500/70 font-bold">
            {word}
          </span>
        );
      }

      // 2. Handle Trade References (#ID) - RICH CARD
      // Regex checks for # followed by letters/numbers
      const tradeMatch = word.match(/^#([a-zA-Z0-9]+)/);
      if (tradeMatch) {
        const tid = tradeMatch[1]; // Extract ID without '#'
        const t = trades.find((tr) => tr.id === tid);

        if (t) {
          return (
            <div
              key={i}
              onClick={() => onNavigateToTrade(tid)}
              className="inline-block align-middle my-1 mx-1 w-64 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden cursor-pointer hover:border-gold-500 hover:shadow-lg hover:scale-[1.02] transition-all group select-none relative z-10"
            >
              {/* PnL Color Strip */}
              <div
                className={`h-1 w-full ${
                  t.pnl >= 0 ? "bg-green-500" : "bg-red-500"
                }`}
              />

              <div className="p-3">
                {/* Header: Pair & Badge */}
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="block font-black text-white text-sm tracking-wide">
                      {t.pair}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono uppercase">
                      {t.strategy}
                    </span>
                  </div>
                  <div
                    className={`flex flex-col items-end text-xs font-bold ${
                      t.pnl >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    <span>
                      {t.pnl > 0 ? "+" : ""}
                      {t.pnl} pips
                    </span>
                    <span className="text-[9px] text-slate-500 font-normal">
                      {t.timeframe}
                    </span>
                  </div>
                </div>

                {/* Prices */}
                <div className="flex items-center justify-between bg-dark-900/50 rounded-lg p-2 mb-2 border border-slate-700/50">
                  <div className="text-center">
                    <span className="text-[8px] text-slate-500 uppercase block">
                      Entry
                    </span>
                    <span className="text-[10px] text-white font-mono">
                      {t.entryPrice}
                    </span>
                  </div>
                  <div className="text-slate-600">➜</div>
                  <div className="text-center">
                    <span className="text-[8px] text-slate-500 uppercase block">
                      Exit
                    </span>
                    <span className="text-[10px] text-white font-mono">
                      {t.exitPrice}
                    </span>
                  </div>
                </div>

                {/* Footer: User & Type */}
                <div className="flex justify-between items-center pt-1">
                  <div className="flex items-center gap-1.5 opacity-80">
                    <div className="w-4 h-4 rounded-full bg-slate-600 flex items-center justify-center text-[8px] text-white font-bold">
                      {t.userName.charAt(0)}
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium truncate max-w-[80px]">
                      {t.userName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {t.imageUrl && (
                      <ImageIcon size={12} className="text-gold-500" />
                    )}
                    <span
                      className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                        t.type === "BUY"
                          ? "bg-green-500/10 text-green-500"
                          : "bg-red-500/10 text-red-500"
                      }`}
                    >
                      {t.type}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        }
      }

      // Regular text
      return word;
    });
  };
  return (
    <div className="flex h-[calc(100vh-80px)] glass-panel rounded-2xl overflow-hidden border border-slate-700">
      <div className="w-64 bg-dark-800 border-r border-slate-700 flex flex-col hidden md:flex">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
          <h3 className="font-bold text-white">{t("comm.rooms")}</h3>
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
              <button
                onClick={handleCreateChannel}
                className="bg-gold-500 text-dark-900 px-3 rounded text-xs font-bold hover:bg-gold-400"
              >
                Add
              </button>
            </div>
          </div>
        )}

        <div className="p-2 space-y-1 overflow-y-auto flex-1">
          {channels.map((channel) => (
            <div key={channel.id} className="group relative">
              <button
                onClick={() => setActiveChannel(channel)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  activeChannel.id === channel.id
                    ? "bg-slate-700 text-white"
                    : "text-slate-400 hover:bg-slate-700/50 hover:text-slate-200"
                }`}
              >
                {channel.type === "voice" ? (
                  <Mic size={16} />
                ) : (
                  <Hash size={16} />
                )}
                <span className="truncate flex-1 text-left">
                  {channel.name}
                </span>
              </button>
              {currentUser.role === UserRole.ADMIN && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete ${channel.name}?`))
                      onDeleteChannel(channel.id);
                  }}
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
            {allUsers.length} {t("comm.online")}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-slate-900/50 relative">
        <div className="h-14 border-b border-slate-700 flex items-center justify-between px-6 bg-slate-800/50 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2">
            <div className="md:hidden mr-2">
              <Hash size={20} className="text-slate-500" />
            </div>
            {activeChannel.type === "voice" ? (
              <Mic size={20} className="text-gold-500" />
            ) : (
              <Hash size={20} className="text-slate-400" />
            )}
            <h3 className="font-bold text-white">{activeChannel.name}</h3>
          </div>
          {activeChannel.type === "voice" && (
            <div className="flex items-center gap-4">
              <button
                onClick={connectToGemini}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isAIConnected
                    ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                    : "bg-slate-800 text-purple-400 border border-purple-500/30 hover:bg-purple-900/20"
                }`}
              >
                <Bot size={14} />
                {isAIConnected ? "Disconnect AI" : "Connect AI"}
              </button>

              <div className="flex items-center gap-2">
                <Users size={16} className="text-slate-400" />
                <span className="text-xs text-slate-400 font-bold">Active</span>
              </div>
            </div>
          )}
        </div>

        {activeChannel.type === "voice" ? (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-1 bg-dark-950 relative p-4 flex items-center justify-center overflow-hidden min-h-0">
              {/* Logic: Show video if YOU are sharing OR if any PEER has isSharingScreen === true */}
              {isScreenSharing ||
              peers.some((p) => (p as any).isSharingScreen) ? (
                <div className="w-full h-full max-h-full bg-black rounded-xl overflow-hidden border border-slate-700 relative flex items-center justify-center min-h-0">
                  <video
                    ref={isScreenSharing ? videoRef : remoteVideoRef} // I see local, they see remote
                    autoPlay
                    playsInline
                    muted={isScreenSharing} // Don't echo your own audio
                    className="max-w-full max-h-full object-contain"
                  />
                  <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 rounded text-white text-xs font-bold flex items-center gap-2 backdrop-blur-md z-10">
                    <Monitor size={12} className="text-gold-500" />
                    {isScreenSharing
                      ? "Your Screen"
                      : `${
                          peers.find((p) => (p as any).isSharingScreen)?.name
                        }'s Screen`}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full max-w-6xl p-4 overflow-y-auto max-h-full custom-scrollbar">
                  {/* 1. CURRENT USER (YOU) */}
                  <div
                    className="aspect-video bg-slate-800 rounded-xl flex flex-col items-center justify-center border-2 relative shadow-lg transition-all"
                    style={{
                      borderColor: localVolume > 20 ? "#EAB308" : "#334155",
                    }}
                  >
                    <div className="relative">
                      <img
                        src={currentUser.avatar}
                        className="w-16 h-16 rounded-full mb-2 border-2 border-slate-600 z-10 relative object-cover"
                      />
                      {localVolume > 20 && (
                        <div
                          className="absolute inset-0 rounded-full bg-gold-500/50 animate-ping"
                          style={{
                            transform: `scale(${1 + localVolume / 100})`,
                          }}
                        ></div>
                      )}
                    </div>
                    <span className="text-sm font-bold text-slate-300">
                      {currentUser.name} (You)
                    </span>
                    {isMuted && (
                      <MicOff
                        size={14}
                        className="absolute top-3 right-3 text-red-500"
                      />
                    )}
                  </div>

                  {/* 2. OTHER TRADERS (REAL-TIME) */}
                  {peers.map((peer) => (
                    <div
                      key={peer.id}
                      className="aspect-video bg-slate-800 rounded-xl flex flex-col items-center justify-center border border-slate-700 relative shadow-lg animate-in fade-in zoom-in duration-300"
                    >
                      <div className="relative">
                        <img
                          src={peer.avatar}
                          className="w-16 h-16 rounded-full mb-2 border-2 border-slate-600 object-cover"
                        />
                        {/* Simulate speaking for others (random for now, or could be real if backend supported) */}
                        {Math.random() > 0.95 && (
                          <div className="absolute inset-0 rounded-full bg-green-500/30 animate-pulse"></div>
                        )}
                      </div>
                      <span className="text-sm font-bold text-slate-300">
                        {peer.name}
                      </span>
                      <div className="absolute bottom-3 right-3 w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                  ))}

                  {/* 3. GEMINI AI AGENT (VISUALIZED AS TRADER) */}
                  {isAIConnected && (
                    <div
                      className={`aspect-video bg-indigo-900/20 rounded-xl flex flex-col items-center justify-center border-2 relative shadow-lg transition-all duration-200 ${
                        aiSpeaking
                          ? "border-indigo-500 shadow-indigo-500/20 scale-105"
                          : "border-indigo-500/30"
                      }`}
                    >
                      <div className="relative">
                        <div
                          className={`w-16 h-16 rounded-full mb-2 flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-inner ${
                            aiSpeaking ? "animate-pulse" : ""
                          }`}
                        >
                          <Bot size={32} />
                        </div>
                        {aiSpeaking && (
                          <div className="absolute inset-0 bg-indigo-500/40 rounded-full animate-ping"></div>
                        )}
                      </div>
                      <span className="text-sm font-bold text-indigo-200">
                        Gemini Live
                      </span>
                      <span className="text-[10px] text-indigo-400 uppercase tracking-widest font-bold mt-1">
                        AI Agent
                      </span>

                      <button
                        onClick={() => setIsAIMuted(!isAIMuted)}
                        className="absolute top-3 right-3 p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-slate-300 hover:text-white transition-colors"
                      >
                        {isAIMuted ? (
                          <VolumeX size={14} />
                        ) : (
                          <Volume2 size={14} />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ... Error & Loading states ... */}
              {screenShareError && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-xl flex items-center gap-2">
                  <X size={16} /> {screenShareError}
                  <button
                    onClick={() => setScreenShareError(null)}
                    className="ml-2 bg-black/20 p-1 rounded hover:bg-black/40"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              {/* Processing Overlay */}
              {isProcessingRecording && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50">
                  <Loader
                    size={48}
                    className="text-gold-500 animate-spin mb-4"
                  />
                  <p className="text-white font-bold">Uploading Recording...</p>
                </div>
              )}
            </div>

            <div className="h-20 bg-dark-900 border-t border-slate-800 flex items-center justify-center gap-6 shadow-2xl z-20 flex-shrink-0">
              {showSaveOption && (
                <div className="absolute left-6 flex items-center gap-2">
                  <button
                    onClick={handleManualSave}
                    className="bg-gold-500 text-dark-900 px-4 py-2 rounded-lg font-bold flex items-center gap-2 animate-bounce hover:bg-gold-400"
                  >
                    <Check size={18} /> Save to Archive?
                  </button>
                  <button
                    onClick={() => {
                      setShowSaveOption(false);
                      setRecordedVideoBlob(null);
                    }}
                    className="p-2 text-slate-500 hover:text-white bg-slate-800 rounded-lg"
                    title="Discard"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}

              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`p-4 rounded-full transition-all duration-200 transform hover:scale-105 ${
                  isMuted
                    ? "bg-red-500 text-white shadow-lg shadow-red-500/20"
                    : "bg-slate-700 text-white hover:bg-slate-600"
                }`}
              >
                {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
              </button>

              <button
                onClick={toggleScreenShare}
                className={`p-4 rounded-full transition-all duration-200 transform hover:scale-105 ${
                  isScreenSharing
                    ? "bg-green-500 text-white shadow-lg shadow-green-500/20"
                    : "bg-slate-700 text-white hover:bg-slate-600"
                }`}
                title={isScreenSharing ? "Stop Sharing" : "Share Screen"}
              >
                <Monitor size={24} />
              </button>

              <button
                onClick={toggleRecording}
                className={`p-4 rounded-full transition-all duration-200 transform hover:scale-105 ${
                  isRecording
                    ? "bg-red-600 text-white shadow-lg animate-pulse"
                    : "bg-slate-700 text-white hover:bg-slate-600"
                }`}
                title={isRecording ? "Stop Recording" : "Start Recording"}
                disabled={isProcessingRecording}
              >
                {isRecording ? (
                  <StopCircle size={24} />
                ) : (
                  <Circle size={24} fill="red" className="text-red-500" />
                )}
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
              {channelMessages.map((msg) => (
                <div key={msg.id} className="flex gap-4 group">
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex-shrink-0 flex items-center justify-center overflow-hidden border border-slate-600">
                    {(() => {
                      // Lookup User
                      const u = allUsers.find((user) => user.id === msg.userId);
                      return u ? (
                        <img
                          src={u.avatar}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        msg.userName.charAt(0)
                      );
                    })()}
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span
                        onClick={() => onNavigateToProfile(msg.userId)}
                        className={`font-bold text-sm cursor-pointer hover:underline ${
                          msg.userName === currentUser.name
                            ? "text-gold-500"
                            : "text-white"
                        }`}
                      >
                        {msg.userName}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    {msg.imageUrl && (
                      <div className="mt-2 mb-1">
                        <img
                          src={msg.imageUrl}
                          className="max-w-[250px] max-h-[200px] rounded-lg border border-slate-700 cursor-pointer hover:border-gold-500 transition-colors"
                        />
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
              {/* INVISIBLE ELEMENT TO SCROLL TO */}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-dark-800 border-t border-slate-700 relative">
              {/* LIVE PREVIEW - Only if a trade tag (e.g. #123) is detected */}
              {inputText.match(/#[a-zA-Z0-9]+/) && (
                <div className="mb-3 p-3 bg-slate-900/50 rounded-xl border border-slate-700/50 min-h-[44px] flex flex-wrap items-center gap-1.5 animate-in slide-in-from-bottom-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase mr-2 select-none self-start mt-1.5">
                    Trade Preview:
                  </span>
                  <div className="flex-1 flex flex-wrap gap-1 items-center">
                    {renderMessageContent(inputText)}
                  </div>
                </div>
              )}
              {showSuggestions && (
                <div className="absolute bottom-full mb-2 left-4 w-96 bg-slate-800/95 backdrop-blur-xl border border-slate-600 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                  {/* ... Suggestion Box ... */}
                  <div className="px-3 py-2 bg-slate-900/50 border-b border-slate-700 text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>
                      {suggestionType === "user"
                        ? "Mention User"
                        : "Filter & Link Trade"}
                    </span>
                    {suggestionType === "trade" && <Filter size={10} />}
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {filteredSuggestions().map((item: any) => (
                      <button
                        key={item.id}
                        onClick={() =>
                          insertTag(
                            suggestionType === "user"
                              ? `@${item.name.split(" ")[0]}`
                              : `#${item.id}`
                          )
                        }
                        className="w-full text-left px-4 py-3 hover:bg-gold-500/10 hover:text-gold-400 transition-colors flex items-center gap-3 border-b border-slate-700/50 last:border-0"
                      >
                        {suggestionType === "user" ? (
                          <>
                            <img
                              src={item.avatar}
                              className="w-8 h-8 rounded-full border border-slate-600"
                            />
                            <span className="font-bold text-sm">
                              {item.name}
                            </span>
                          </>
                        ) : (
                          <>
                            <div
                              className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-[10px] font-bold ${
                                item.pnl > 0
                                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                  : "bg-red-500/20 text-red-400 border border-red-500/30"
                              }`}
                            >
                              {item.pnl > 0 ? "W" : "L"}
                            </div>
                            <div className="flex flex-col overflow-hidden">
                              <span className="font-bold text-sm text-white flex items-center gap-2 truncate">
                                {item.userName}
                                <span className="text-slate-500 font-normal text-xs">
                                  • {item.pair}
                                </span>
                              </span>
                              <span className="text-[10px] text-slate-400 flex items-center gap-2">
                                <span className="bg-slate-700 px-1.5 rounded text-slate-300">
                                  {item.strategy}
                                </span>
                                <span className="font-mono">
                                  {item.timeframe}
                                </span>
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
                  <img
                    src={attachedImage}
                    className="w-12 h-12 object-cover rounded border border-slate-600"
                  />
                  <div className="text-xs text-slate-300">
                    <p className="font-bold">{t("comm.image_attached")}</p>
                    <p className="text-[10px] opacity-70">
                      {t("comm.ready_send")}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setAttachedImage(null);
                      setImageFile(null);
                    }}
                    className="p-1 hover:bg-slate-800 rounded-full text-slate-500 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              <form
                onSubmit={handleSend}
                className="relative flex items-center gap-2"
              >
                <button
                  type="button"
                  onClick={() => chatFileRef.current?.click()}
                  className="p-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-gold-500 hover:border-gold-500/50 transition-all"
                >
                  <ImageIcon size={20} />
                </button>
                <input
                  type="file"
                  ref={chatFileRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleChatImageSelect}
                />

                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    onChange={handleInputChange}
                    placeholder={`${t("comm.placeholder")} #${
                      activeChannel.name
                    }`}
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
