import React, { useState, useMemo, useEffect } from 'react';
import { User, CourseModule, CourseContent, UserCourseProgress, UserRole, QuizQuestion } from '../types';
import { CheckCircle, Circle, Play, FileText, ListChecks, Lock, ChevronRight, Edit3, Plus, Trash2, ArrowUp, ArrowDown, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface CourseLMSProps {
    currentUser: User;
    allUsers: User[]; 
    modules: CourseModule[];
    content: CourseContent[];
    userProgress: UserCourseProgress[];
    onUpdateContent: (content: CourseContent[]) => void;
    onUpdateModules: (modules: CourseModule[]) => void;
    onUpdateProgress: (progress: UserCourseProgress) => void;
}

const CourseLMS: React.FC<CourseLMSProps> = ({ currentUser, allUsers, modules, content, userProgress, onUpdateContent, onUpdateModules, onUpdateProgress }) => {
    const isAdmin = currentUser.role === UserRole.ADMIN;
    const [isEditMode, setIsEditMode] = useState(false);
    const { t } = useLanguage();
    
    // View State
    const [activeModuleId, setActiveModuleId] = useState<string>(modules[0]?.id || '');
    const [activeContentId, setActiveContentId] = useState<string>('');
    const [viewingProgressUserId, setViewingProgressUserId] = useState<string>(currentUser.id);

    // Quiz State (Local for session)
    const [userAnswers, setUserAnswers] = useState<Record<string, number>>({}); 

    // Admin State for New Module
    const [isAddingModule, setIsAddingModule] = useState(false);
    const [newModuleTitle, setNewModuleTitle] = useState('');
    const [newContentTitle, setNewContentTitle] = useState('');
    const [newContentType, setNewContentType] = useState<'video'|'text'|'quiz'>('text');

    // --- Derived Data ---
    
    // Get content for active module sorted by order
    const activeModuleContent = useMemo(() => {
        return content
            .filter(c => c.moduleId === activeModuleId)
            .sort((a, b) => a.order - b.order);
    }, [content, activeModuleId]);

    // Determine whose progress we are viewing
    const targetUserId = (isAdmin && viewingProgressUserId) ? viewingProgressUserId : currentUser.id;

    // Calculate Target Progress
    const targetProgress = useMemo(() => {
        return userProgress.find(p => p.userId === targetUserId) || { userId: targetUserId, completedContentIds: [], totalProgress: 0 };
    }, [userProgress, targetUserId]);

    // Set initial content if not set
    useEffect(() => {
        if (!activeContentId && activeModuleContent.length > 0) {
            setActiveContentId(activeModuleContent[0].id);
        }
    }, [activeModuleContent, activeContentId]);

    // Determine lock status for Modules (Sequential)
    const moduleLockStatus = useMemo(() => {
        const status: Record<string, boolean> = {}; 
        let previousModuleCompleted = true; 

        const sortedModules = [...modules].sort((a,b) => a.order - b.order);
        
        sortedModules.forEach(mod => {
            if (isAdmin) {
                status[mod.id] = false;
                return;
            }

            if (!previousModuleCompleted) {
                status[mod.id] = true;
            } else {
                status[mod.id] = false;
            }
            
            const modContent = content.filter(c => c.moduleId === mod.id);
            const isCompleted = modContent.length === 0 || modContent.every(c => targetProgress.completedContentIds.includes(c.id));
            previousModuleCompleted = isCompleted;
        });
        return status;
    }, [modules, content, targetProgress, isAdmin]);

    // Determine lock status for Content within Module
    const contentLockStatus = useMemo(() => {
         const status: Record<string, boolean> = {};
         let previousContentCompleted = true;
         
         activeModuleContent.forEach(c => {
             if (isAdmin) {
                 status[c.id] = false;
                 return;
             }

             if (!previousContentCompleted) {
                 status[c.id] = true;
             } else {
                 status[c.id] = false;
             }
             previousContentCompleted = targetProgress.completedContentIds.includes(c.id);
         });
         return status;
    }, [activeModuleContent, targetProgress, isAdmin]);

    // --- ACTIONS ---

    const handleComplete = (contentId: string) => {
        if (targetUserId !== currentUser.id) return;

        if (!targetProgress.completedContentIds.includes(contentId)) {
            const newProgress = {
                ...targetProgress,
                completedContentIds: [...targetProgress.completedContentIds, contentId]
            };
            onUpdateProgress(newProgress);
        }
        
        const currentIndex = activeModuleContent.findIndex(c => c.id === contentId);
        if (currentIndex < activeModuleContent.length - 1) {
            setActiveContentId(activeModuleContent[currentIndex + 1].id);
        }
    };

    const handleQuizSelection = (questionId: string, optionIndex: number) => {
        setUserAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
    };

    // --- ADMIN ACTIONS ---

    const handleAddContent = () => {
        if (!newContentTitle) return;
        const newOrder = activeModuleContent.length + 1;
        const newId = Date.now().toString();
        
        const newContentItem: CourseContent = {
            id: newId,
            moduleId: activeModuleId,
            type: newContentType,
            title: newContentTitle,
            duration: '5:00',
            order: newOrder,
            textContent: newContentType === 'text' ? 'New text content...' : undefined,
            videoUrl: newContentType === 'video' ? '' : undefined,
            quizData: newContentType === 'quiz' ? [{ id: `q-${Date.now()}`, question: 'New Question', options: ['Option 1', 'Option 2'], correctOptionIndex: 0 }] : undefined
        };

        onUpdateContent([...content, newContentItem]);
        setNewContentTitle('');
    };

    const handleDeleteContent = (id: string) => {
        if (confirm("Delete this content?")) {
            onUpdateContent(content.filter(c => c.id !== id));
        }
    };

    const handleMoveContent = (id: string, direction: 'up' | 'down') => {
        const index = activeModuleContent.findIndex(c => c.id === id);
        if (index === -1) return;
        
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        if (swapIndex < 0 || swapIndex >= activeModuleContent.length) return;

        const itemA = activeModuleContent[index];
        const itemB = activeModuleContent[swapIndex];

        const newOrderA = itemB.order;
        const newOrderB = itemA.order;

        const updatedContent = content.map(c => {
            if (c.id === itemA.id) return { ...c, order: newOrderA };
            if (c.id === itemB.id) return { ...c, order: newOrderB };
            return c;
        });

        onUpdateContent(updatedContent);
    };

    const handleEditContentData = (id: string, field: string, value: any) => {
        onUpdateContent(content.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    // --- Quiz Admin Helpers ---
    const updateQuizData = (contentId: string, newQuizData: QuizQuestion[]) => {
        handleEditContentData(contentId, 'quizData', newQuizData);
    };

    const handleAddQuestion = (contentId: string) => {
        const item = content.find(c => c.id === contentId);
        if (!item || !item.quizData) return;
        updateQuizData(contentId, [...item.quizData, { id: `q-${Date.now()}`, question: 'New Question', options: ['Option 1', 'Option 2'], correctOptionIndex: 0 }]);
    };

    const handleDeleteQuestion = (contentId: string, qIdx: number) => {
        const item = content.find(c => c.id === contentId);
        if (!item || !item.quizData) return;
        updateQuizData(contentId, item.quizData.filter((_, idx) => idx !== qIdx));
    };

    const handleUpdateQuestion = (contentId: string, qIdx: number, field: keyof QuizQuestion, value: any) => {
        const item = content.find(c => c.id === contentId);
        if (!item || !item.quizData) return;
        const newData = [...item.quizData];
        newData[qIdx] = { ...newData[qIdx], [field]: value };
        updateQuizData(contentId, newData);
    };

    const handleAddOption = (contentId: string, qIdx: number) => {
        const item = content.find(c => c.id === contentId);
        if (!item || !item.quizData) return;
        const newData = [...item.quizData];
        newData[qIdx].options.push(`Option ${newData[qIdx].options.length + 1}`);
        updateQuizData(contentId, newData);
    };

    const handleDeleteOption = (contentId: string, qIdx: number, oIdx: number) => {
        const item = content.find(c => c.id === contentId);
        if (!item || !item.quizData) return;
        const newData = [...item.quizData];
        if (newData[qIdx].options.length <= 2) { alert("Min 2 options"); return; }
        newData[qIdx].options = newData[qIdx].options.filter((_, idx) => idx !== oIdx);
        if (newData[qIdx].correctOptionIndex >= oIdx) newData[qIdx].correctOptionIndex = Math.max(0, newData[qIdx].correctOptionIndex - 1);
        updateQuizData(contentId, newData);
    };

    const handleUpdateOptionText = (contentId: string, qIdx: number, oIdx: number, text: string) => {
        const item = content.find(c => c.id === contentId);
        if (!item || !item.quizData) return;
        const newData = [...item.quizData];
        newData[qIdx].options[oIdx] = text;
        updateQuizData(contentId, newData);
    };

    // --- Module Management ---

    const handleAddModule = () => {
        if (!newModuleTitle.trim()) return;
        const newModule: CourseModule = {
            id: `mod-${Date.now()}`,
            title: newModuleTitle,
            description: '',
            order: modules.length + 1,
            lessons: []
        };
        onUpdateModules([...modules, newModule]);
        setNewModuleTitle(''); 
        // Note: setIsAddingModule(false) is REMOVED so the form stays open
    };

    const handleDeleteModule = (moduleId: string) => {
        if (confirm("Delete this module and all its content?")) {
            onUpdateModules(modules.filter(m => m.id !== moduleId));
            onUpdateContent(content.filter(c => c.moduleId !== moduleId));
            if (activeModuleId === moduleId) setActiveModuleId(modules[0]?.id || '');
        }
    };

    // --- RENDER HELPERS ---

    const renderActiveContent = () => {
        const activeItem = activeModuleContent.find(c => c.id === activeContentId);
        if (!activeItem) return <div className="p-8 text-center text-slate-500">{t('course.select_content')}</div>;

        const isCompleted = targetProgress.completedContentIds.includes(activeItem.id);

        return (
            <div className="animate-in fade-in duration-300">
                <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
                     <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                         {activeItem.type === 'video' && <Play size={24} className="text-blue-400"/>}
                         {activeItem.type === 'text' && <FileText size={24} className="text-gold-500"/>}
                         {activeItem.type === 'quiz' && <ListChecks size={24} className="text-purple-400"/>}
                         {isEditMode && isAdmin ? (
                             <input 
                                value={activeItem.title} 
                                onChange={(e) => handleEditContentData(activeItem.id, 'title', e.target.value)}
                                className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-lg font-bold w-full max-w-md focus:border-gold-500 outline-none"
                             />
                         ) : (
                             activeItem.title
                         )}
                     </h2>
                     {isCompleted && <div className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle size={14}/> {t('course.completed')}</div>}
                </div>

                <div className="bg-dark-900/50 rounded-xl p-6 border border-slate-800 mb-6 min-h-[400px]">
                    {/* VIDEO */}
                    {activeItem.type === 'video' && (
                        <div className="space-y-4">
                            <div className="aspect-video bg-black rounded-lg flex items-center justify-center border border-slate-700 relative overflow-hidden group">
                                {activeItem.videoUrl && activeItem.videoUrl !== '#' ? (
                                    <video src={activeItem.videoUrl} controls className="w-full h-full" />
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <Play size={48} className="text-slate-600 mb-2"/>
                                        <p className="text-slate-500">Video Placeholder</p>
                                    </div>
                                )}
                            </div>
                            {isEditMode && isAdmin ? (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Video URL (mp4/webm)</label>
                                    <input 
                                        type="text" 
                                        value={activeItem.videoUrl || ''} 
                                        onChange={(e) => handleEditContentData(activeItem.id, 'videoUrl', e.target.value)}
                                        className="w-full bg-slate-800 p-3 rounded text-white text-sm border border-slate-700 focus:border-gold-500 outline-none"
                                        placeholder="https://example.com/video.mp4"
                                    />
                                </div>
                            ) : (
                                <p className="text-sm text-slate-400 text-center">Watch video to complete.</p>
                            )}
                        </div>
                    )}

                    {/* TEXT */}
                    {activeItem.type === 'text' && (
                        <div>
                            {isEditMode && isAdmin ? (
                                <textarea 
                                    value={activeItem.textContent || ''}
                                    onChange={(e) => handleEditContentData(activeItem.id, 'textContent', e.target.value)}
                                    className="w-full h-96 bg-slate-800 p-4 rounded text-white text-sm border border-slate-700 focus:border-gold-500 outline-none resize-none leading-relaxed"
                                    placeholder="Enter content..."
                                />
                            ) : (
                                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap text-lg">
                                    {activeItem.textContent}
                                </p>
                            )}
                        </div>
                    )}

                    {/* QUIZ */}
                    {activeItem.type === 'quiz' && (
                        <div className="space-y-6">
                            {activeItem.quizData?.map((q, qIdx) => (
                                <div key={q.id} className="p-6 bg-slate-800/30 rounded-xl border border-slate-700">
                                    <div className="flex justify-between items-start mb-4">
                                        {isEditMode && isAdmin ? (
                                            <div className="w-full mr-4">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase">Question {qIdx + 1}</label>
                                                <input 
                                                    type="text" 
                                                    value={q.question} 
                                                    onChange={(e) => handleUpdateQuestion(activeItem.id, qIdx, 'question', e.target.value)} 
                                                    className="bg-slate-900 border border-slate-600 rounded p-2 text-white text-sm w-full mt-1 focus:border-gold-500 outline-none"
                                                />
                                            </div>
                                        ) : (
                                            <p className="font-bold text-white text-lg">{qIdx + 1}. {q.question}</p>
                                        )}
                                        {isEditMode && isAdmin && (
                                            <button onClick={() => handleDeleteQuestion(activeItem.id, qIdx)} className="text-red-500 p-2"><Trash2 size={16}/></button>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        {q.options.map((opt, oIdx) => {
                                            const isSelected = userAnswers[q.id] === oIdx;
                                            const isCorrect = q.correctOptionIndex === oIdx;
                                            let btnClass = 'bg-slate-900 border-slate-700 hover:border-gold-500/50';
                                            if (isSelected) btnClass = isCorrect ? 'bg-green-500/20 border-green-500 text-green-300' : 'bg-red-500/20 border-red-500 text-red-300';
                                            else if (userAnswers[q.id] !== undefined && isCorrect) btnClass = 'bg-slate-900 border-green-500 text-green-400';

                                            return (
                                                <div key={oIdx} className="flex items-center gap-3">
                                                    {isEditMode && isAdmin ? (
                                                        <div className="flex items-center gap-2 w-full">
                                                            <input type="radio" checked={q.correctOptionIndex === oIdx} onChange={() => handleUpdateQuestion(activeItem.id, qIdx, 'correctOptionIndex', oIdx)} className="accent-green-500 cursor-pointer"/>
                                                            <input type="text" value={opt} onChange={(e) => handleUpdateOptionText(activeItem.id, qIdx, oIdx, e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm focus:border-gold-500 outline-none"/>
                                                            <button onClick={() => handleDeleteOption(activeItem.id, qIdx, oIdx)} className="text-slate-500 hover:text-red-400"><X size={14} /></button>
                                                        </div>
                                                    ) : (
                                                        <button onClick={() => handleQuizSelection(q.id, oIdx)} className={`w-full text-left p-3 rounded-lg border transition-all flex items-center gap-3 ${btnClass}`}>
                                                            {opt}
                                                            {isSelected && isCorrect && <CheckCircle size={16} className="ml-auto text-green-500" />}
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {isEditMode && isAdmin && <button onClick={() => handleAddOption(activeItem.id, qIdx)} className="mt-3 text-xs font-bold text-blue-400 flex items-center gap-1"><Plus size={12}/> Option</button>}
                                </div>
                            ))}
                            {isEditMode && isAdmin && <button onClick={() => handleAddQuestion(activeItem.id)} className="w-full py-3 border-2 border-dashed border-slate-600 rounded-xl text-slate-400 font-bold hover:text-white flex items-center justify-center gap-2"><Plus size={18}/> Add Question</button>}
                        </div>
                    )}
                </div>

                <div className="flex justify-end">
                    <button 
                        onClick={() => handleComplete(activeItem.id)}
                        disabled={isCompleted && !isEditMode}
                        className={`px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${isCompleted ? 'bg-slate-700 text-slate-400' : 'bg-gold-500 text-dark-900 hover:scale-105 shadow-glow'}`}
                    >
                        {isCompleted ? t('course.completed') : t('course.continue')} <ChevronRight size={18}/>
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="flex h-[calc(100vh-100px)] gap-6">
            
            {/* --- LEFT COLUMN: SIDEBAR --- */}
            <div className="w-80 flex flex-col gap-4">
                
                {/* 1. Header & Edit Toggle */}
                <div className="glass-panel p-4 rounded-xl flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <h3 className="font-serif font-bold text-white text-lg">{t('course.map')}</h3>
                        {/* Only show "Edit" icon if we are NOT in edit mode */}
                        {isAdmin && !isEditMode && (
                            <button 
                                onClick={() => setIsEditMode(true)} 
                                className="text-gold-500 hover:text-white text-xs font-bold flex items-center gap-1"
                            >
                                <Edit3 size={14} /> EDIT COURSE
                            </button>
                        )}
                    </div>

                    {/* Big Red Exit Button - Only visible when Editing */}
                    {isAdmin && isEditMode && (
                        <button 
                            onClick={() => setIsEditMode(false)}
                            className="w-full bg-red-500/20 border border-red-500 text-red-400 py-2 rounded-lg text-xs font-bold hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                        >
                            <X size={14} /> EXIT EDIT MODE
                        </button>
                    )}
                </div>
                
                {/* 2. Admin Progress Viewer */}
                {isAdmin && isEditMode && (
                     <div className="glass-panel p-4 rounded-xl">
                         <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">{t('course.view_progress')}</label>
                         <select 
                            className="w-full bg-dark-900 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-gold-500"
                            onChange={(e) => setViewingProgressUserId(e.target.value)}
                            value={viewingProgressUserId}
                         >
                             <option value={currentUser.id}>-- Me (Admin) --</option>
                             {allUsers.filter(u => u.id !== currentUser.id).map(u => (
                                 <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                             ))}
                         </select>
                     </div>
                )}

                {/* 3. Module List */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                    {modules.map(mod => {
                        const isLocked = !isAdmin && moduleLockStatus[mod.id];
                        const isActive = mod.id === activeModuleId;
                        const modContent = content.filter(c => c.moduleId === mod.id);
                        const completedCount = modContent.filter(c => targetProgress.completedContentIds.includes(c.id)).length;
                        const progressPct = modContent.length > 0 ? (completedCount / modContent.length) * 100 : 0;

                        return (
                            <div key={mod.id} className={`glass-panel rounded-xl overflow-hidden transition-all ${isActive ? 'border-gold-500' : 'border-transparent'}`}>
                                <div onClick={() => !isLocked && setActiveModuleId(mod.id)} className={`p-4 cursor-pointer flex items-center justify-between group ${isLocked ? 'opacity-50 cursor-not-allowed bg-slate-900' : 'hover:bg-slate-800/50'}`}>
                                    <div className="flex-1 min-w-0 pr-2">
                                        <h4 className={`font-bold text-sm truncate ${isActive ? 'text-gold-500' : 'text-white'}`}>{mod.title}</h4>
                                        <p className="text-[10px] text-slate-500 mt-1">{modContent.length} {t('course.steps')}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                         {isAdmin && isEditMode && <button onClick={(e) => { e.stopPropagation(); handleDeleteModule(mod.id); }} className="p-1 text-red-500 hover:bg-red-500/10 rounded"><Trash2 size={12}/></button>}
                                         {isLocked ? <Lock size={16} className="text-slate-600" /> : progressPct >= 100 ? <CheckCircle size={16} className="text-green-500"/> : <div className="text-xs font-mono text-slate-400">{Math.round(progressPct)}%</div>}
                                    </div>
                                </div>
                                {isActive && !isLocked && (
                                    <div className="bg-dark-900/50 border-t border-slate-800">
                                        {activeModuleContent.map((c) => {
                                            const isContentLocked = !isAdmin && contentLockStatus[c.id];
                                            const isDone = targetProgress.completedContentIds.includes(c.id);
                                            return (
                                                <div key={c.id} onClick={() => !isContentLocked && setActiveContentId(c.id)} className={`px-4 py-3 flex items-center justify-between border-b border-slate-800/50 last:border-0 text-xs transition-colors ${activeContentId === c.id ? 'bg-gold-500/10 text-gold-400' : isContentLocked ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 hover:text-white cursor-pointer hover:bg-slate-800'}`}>
                                                    <div className="flex items-center gap-2">
                                                        {c.type === 'video' ? <Play size={12}/> : c.type === 'text' ? <FileText size={12}/> : <ListChecks size={12}/>}
                                                        <span className="truncate max-w-[140px]">{c.title}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {isEditMode && isAdmin ? (
                                                            <div className="flex gap-1">
                                                                <button onClick={(e) => { e.stopPropagation(); handleMoveContent(c.id, 'up') }} className="hover:text-gold-500"><ArrowUp size={10}/></button>
                                                                <button onClick={(e) => { e.stopPropagation(); handleMoveContent(c.id, 'down') }} className="hover:text-gold-500"><ArrowDown size={10}/></button>
                                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteContent(c.id) }} className="hover:text-red-500"><Trash2 size={10}/></button>
                                                            </div>
                                                        ) : ( isDone ? <CheckCircle size={12} className="text-green-500"/> : isContentLocked ? <Lock size={12}/> : <Circle size={12}/> )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {isEditMode && isAdmin && (
                                            <div className="p-3 bg-slate-800 border-t border-slate-700">
                                                <input type="text" placeholder="New Content Title" className="w-full bg-dark-900 border border-slate-600 rounded p-1 text-xs text-white mb-2" value={newContentTitle} onChange={(e) => setNewContentTitle(e.target.value)}/>
                                                <div className="flex gap-2">
                                                    <select className="bg-dark-900 border border-slate-600 rounded p-1 text-xs text-white flex-1" value={newContentType} onChange={(e) => setNewContentType(e.target.value as any)}>
                                                        <option value="text">Text</option>
                                                        <option value="video">Video</option>
                                                        <option value="quiz">Quiz</option>
                                                    </select>
                                                    <button onClick={handleAddContent} className="bg-gold-500 text-dark-900 px-3 py-1 rounded text-xs font-bold hover:bg-gold-400">Add</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                
                {/* 4. Add Module Form */}
                {isAdmin && isEditMode && (
                    <div className="glass-panel p-3 rounded-xl border-dashed border-slate-600">
                         {isAddingModule ? (
                             <div className="space-y-2 animate-in slide-in-from-bottom-2">
                                 <input type="text" placeholder="Module Name" value={newModuleTitle} onChange={e => setNewModuleTitle(e.target.value)} className="w-full bg-dark-900 border border-slate-600 rounded p-2 text-xs text-white outline-none"/>
                                 <div className="flex gap-2">
                                     <button onClick={handleAddModule} className="flex-1 bg-gold-500 text-dark-900 text-xs font-bold rounded py-1 hover:bg-gold-400">Save</button>
                                     <button onClick={() => setIsAddingModule(false)} className="flex-1 bg-slate-700 text-white text-xs font-bold rounded py-1 hover:bg-slate-600">Cancel</button>
                                 </div>
                             </div>
                         ) : (
                             <button onClick={() => setIsAddingModule(true)} className="w-full flex items-center justify-center gap-2 text-gold-500 text-xs font-bold py-2 hover:bg-gold-500/10 rounded transition-colors"><Plus size={14}/> Add New Section</button>
                         )}
                    </div>
                )}
            </div>

            {/* --- RIGHT COLUMN: MAIN CONTENT --- */}
            <div className="flex-1 glass-panel rounded-2xl p-8 overflow-y-auto">
                {renderActiveContent()}
            </div>

        </div>
    );
};

export default CourseLMS;