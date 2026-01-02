import React, { useState, useRef } from 'react';
import { VideoResource, User } from '../types';
import { PlayCircle, Upload, Search, X, Check, Loader, Clock } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { VideoService } from '../services/api'; 

interface VideoArchiveProps {
    currentUser: User;
    videos: VideoResource[];
    onAddVideo: (video: VideoResource) => void;
}

const VideoArchive: React.FC<VideoArchiveProps> = ({ currentUser, videos, onAddVideo }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | 'live_recording' | 'upload'>('all');
    const [isUploading, setIsUploading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    
    // --- NEW: Active Video State for Player ---
    const [activeVideo, setActiveVideo] = useState<VideoResource | null>(null);
    // ------------------------------------------

    const { t } = useLanguage();
    
    // Upload State
    const [uploadTitle, setUploadTitle] = useState('');
    const [uploadDesc, setUploadDesc] = useState('');
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const filteredVideos = videos.filter(v => {
        if (typeFilter !== 'all' && v.type !== typeFilter) return false;
        if (searchQuery && !v.title.toLowerCase().includes(searchQuery.toLowerCase()) && !v.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    }).sort((a,b) => b.timestamp - a.timestamp);

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uploadFile) return;

        setIsProcessing(true);

        try {
            const permUrl = await VideoService.uploadVideo(uploadFile);
            
            const newVideo: VideoResource = {
                id: Date.now().toString(),
                title: uploadTitle,
                description: uploadDesc,
                url: permUrl,
                authorName: currentUser.name,
                timestamp: Date.now(),
                type: 'upload',
                duration: '00:00' 
            };

            onAddVideo(newVideo);
            
            setIsUploading(false);
            setUploadTitle('');
            setUploadDesc('');
            setUploadFile(null);
        } catch (err) {
            console.error("Upload failed", err);
            alert("Failed to upload video.");
        } finally {
            setIsProcessing(false);
        }
    };

    // --- NEW: Video Player Modal ---
    const renderVideoPlayer = () => {
        if (!activeVideo) return null;

        return (
            <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200">
                {/* Close Button */}
                <button 
                    onClick={() => setActiveVideo(null)}
                    className="absolute top-6 right-6 z-50 bg-slate-800/50 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
                >
                    <X size={32} />
                </button>
                
                {/* Player Container */}
                <div className="w-full max-w-6xl flex flex-col bg-dark-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 max-h-full">
                    <div className="bg-black w-full aspect-video flex items-center justify-center">
                        <video 
                            src={activeVideo.url} 
                            controls 
                            autoPlay 
                            className="w-full h-full"
                        />
                    </div>
                    <div className="p-6 overflow-y-auto">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-2">{activeVideo.title}</h3>
                                <div className="flex items-center gap-3 text-sm">
                                    <span className={`px-2 py-0.5 rounded uppercase font-bold text-[10px] ${activeVideo.type === 'live_recording' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                        {activeVideo.type === 'live_recording' ? 'Live Session' : 'Upload'}
                                    </span>
                                    <span className="text-slate-500 flex items-center gap-1">
                                        <Clock size={12}/> {new Date(activeVideo.timestamp).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-full">
                                <div className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold text-white">
                                    {activeVideo.authorName.charAt(0)}
                                </div>
                                <span className="text-sm text-slate-300 font-medium">{activeVideo.authorName}</span>
                            </div>
                        </div>
                        <p className="text-slate-400 leading-relaxed border-t border-slate-800 pt-4">
                            {activeVideo.description || "No description provided."}
                        </p>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Render the Player Overlay */}
            {renderVideoPlayer()}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h2 className="text-4xl font-serif font-bold text-white mb-2">{t('video.title')}</h2>
                    <p className="text-slate-400 text-sm">{t('video.subtitle')}</p>
                </div>
                
                <div className="flex gap-4">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-gold-500 transition-colors" size={16} />
                        <input 
                            type="text" 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('video.search')}
                            className="bg-dark-900 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:border-gold-500 outline-none w-64 shadow-inner"
                        />
                    </div>
                    
                    <button 
                        onClick={() => setIsUploading(!isUploading)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${isUploading ? 'bg-slate-700 text-white' : 'bg-gold-500 text-dark-900 shadow-glow'}`}
                    >
                        {isUploading ? <X size={18}/> : <Upload size={18}/>}
                        {isUploading ? t('video.cancel') : t('video.upload')}
                    </button>
                </div>
            </div>

            {isUploading && (
                <div className="glass-panel p-6 rounded-2xl border-dashed border-2 border-slate-600 bg-slate-800/30 animate-in slide-in-from-top-4">
                     <h3 className="text-lg font-bold text-white mb-4">{t('video.upload_new')}</h3>
                     <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-4">
                             <div>
                                 <label className="text-xs font-bold text-slate-500 uppercase">{t('video.vid_title')}</label>
                                 <input 
                                    type="text" 
                                    value={uploadTitle}
                                    onChange={(e) => setUploadTitle(e.target.value)}
                                    className="w-full bg-dark-900 border border-slate-700 rounded-lg p-3 text-white focus:border-gold-500 outline-none mt-1"
                                    required
                                 />
                             </div>
                             <div>
                                 <label className="text-xs font-bold text-slate-500 uppercase">{t('video.vid_desc')}</label>
                                 <textarea 
                                    value={uploadDesc}
                                    onChange={(e) => setUploadDesc(e.target.value)}
                                    className="w-full bg-dark-900 border border-slate-700 rounded-lg p-3 text-white focus:border-gold-500 outline-none mt-1 h-24 resize-none"
                                    required
                                 />
                             </div>
                         </div>
                         <div className="flex flex-col justify-between">
                             <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="flex-1 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-500 hover:border-gold-500 hover:text-gold-500 hover:bg-gold-500/5 transition-all cursor-pointer p-6"
                             >
                                 {uploadFile ? (
                                     <div className="text-center">
                                         <Check size={32} className="mx-auto mb-2 text-green-500"/>
                                         <p className="text-white font-bold">{uploadFile.name}</p>
                                     </div>
                                 ) : (
                                     <>
                                        <Upload size={32} className="mb-2"/>
                                        <p>{t('video.select_file')}</p>
                                     </>
                                 )}
                                 <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    accept="video/*" 
                                    className="hidden" 
                                    onChange={(e) => e.target.files?.[0] && setUploadFile(e.target.files[0])} 
                                 />
                             </div>
                             <button 
                                type="submit" 
                                disabled={isProcessing}
                                className="w-full py-3 bg-gold-500 text-dark-900 font-bold rounded-xl mt-4 hover:bg-gold-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                             >
                                 {isProcessing && <Loader size={16} className="animate-spin" />}
                                 {isProcessing ? 'Uploading...' : t('video.publish')}
                             </button>
                         </div>
                     </form>
                </div>
            )}

            <div className="flex gap-2 border-b border-slate-800 pb-4">
                <button 
                    onClick={() => setTypeFilter('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${typeFilter === 'all' ? 'bg-white text-dark-900' : 'text-slate-400 hover:text-white'}`}
                >
                    {t('video.tab.all')}
                </button>
                <button 
                    onClick={() => setTypeFilter('live_recording')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${typeFilter === 'live_recording' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'text-slate-400 hover:text-red-400'}`}
                >
                    {t('video.tab.live')}
                </button>
                <button 
                    onClick={() => setTypeFilter('upload')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${typeFilter === 'upload' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-blue-400'}`}
                >
                    {t('video.tab.upload')}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVideos.map(video => (
                    <div 
                        key={video.id} 
                        onClick={() => setActiveVideo(video)} // <--- CLICK TO PLAY
                        className="glass-panel rounded-2xl overflow-hidden group hover:border-gold-500/50 transition-all cursor-pointer hover:-translate-y-1 duration-300"
                    >
                        <div className="aspect-video bg-black relative group-hover:opacity-90 transition-opacity">
                            {video.thumbnail ? (
                                <img src={video.thumbnail} className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity"/>
                            ) : (
                                <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900">
                                    {/* Preview video (muted) */}
                                    <video src={video.url} className="w-full h-full object-cover opacity-60 group-hover:opacity-40" muted />
                                </div>
                            )}
                            
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <PlayCircle size={48} className="text-white drop-shadow-lg" />
                                </div>
                            </div>

                            <div className="absolute top-3 left-3 flex gap-2">
                                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded backdrop-blur-md ${video.type === 'live_recording' ? 'bg-red-500/80 text-white' : 'bg-blue-500/80 text-white'}`}>
                                    {video.type === 'live_recording' ? 'Live Rec' : 'Upload'}
                                </span>
                            </div>
                            
                            <div className="absolute bottom-3 right-3 bg-black/60 px-2 py-1 rounded text-xs font-mono font-bold text-white">
                                {video.duration}
                            </div>
                        </div>
                        
                        <div className="p-5">
                            <h3 className="font-bold text-white text-lg mb-2 line-clamp-1 group-hover:text-gold-400 transition-colors">{video.title}</h3>
                            <p className="text-slate-400 text-sm mb-4 line-clamp-2 h-10">{video.description}</p>
                            
                            <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                                        {video.authorName.charAt(0)}
                                    </div>
                                    <span className="text-xs text-slate-400">{video.authorName}</span>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-slate-500">
                                    <Clock size={12} />
                                    {new Date(video.timestamp).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                {filteredVideos.length === 0 && (
                    <div className="col-span-full glass-panel p-16 text-center text-slate-500">
                        <PlayCircle size={48} className="mx-auto mb-4 opacity-20" />
                        <p>{t('video.no_videos')}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VideoArchive;