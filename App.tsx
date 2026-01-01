import React, { useState, useEffect } from 'react'; 
import { User, UserRole, Trade, Notification, MentorOutlook, VideoResource, CourseModule, CourseContent, UserCourseProgress, Channel } from './types';
import { MOCK_USERS, MOCK_NOTIFICATIONS, MOCK_VIDEOS, CHANNELS } from './constants';
import { onAuthStateChanged } from 'firebase/auth';
import { AuthService, TradeService, OutlookService, CourseService } from './services/api';
import { collection, query, getDocs } from 'firebase/firestore';
import { auth, db } from './services/firebase';
import Layout from './components/Layout';
import Landing from './components/Landing';
import Dashboard from './components/Dashboard';
import TradeCenter from './components/TradeCenter';
import Community from './components/Community';
import Notifications from './components/Notifications';
import AIAssistant from './components/AIAssistant';
import MentorOutlookComponent from './components/MentorOutlook';
import AdminPanel from './components/AdminPanel';
import UserProfile from './components/UserProfile';
import TradersList from './components/TradersList';
import VideoArchive from './components/VideoArchive';
import CourseLMS from './components/CourseLMS';
import { LanguageProvider } from './contexts/LanguageContext';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState('dashboard');
  const [trades, setTrades] = useState<Trade[]>([]);

  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [selectedNotificationTradeId, setSelectedNotificationTradeId] = useState<string | null>(null);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [videos, setVideos] = useState<VideoResource[]>(MOCK_VIDEOS);
  
  // Lifted State for Mentor to Edit
  const [outlooks, setOutlooks] = useState<MentorOutlook[]>([]);

  // Mentor System Instructions for AI Reviews
  const [mentorSystemInstruction, setMentorSystemInstruction] = useState<string>(
      "You are a professional forex trading mentor. Be critical but constructive. Analyze the risk-to-reward ratio and market structure."
  );

  useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
            const profile = await AuthService.getUserProfile(firebaseUser.uid);
            if (profile) {
                setCurrentUser(profile);
            }
        } else {
            setCurrentUser(null);
            setPage('dashboard');
        }
        setLoading(false);
        });

        return () => unsubscribe(); 
  }, []);

  // Lifted State for Channels (Chat Rooms)
  const [channels, setChannels] = useState<Channel[]>(CHANNELS);

  // Course State
  const [courseModules, setCourseModules] = useState<CourseModule[]>([]);
  const [courseContent, setCourseContent] = useState<CourseContent[]>([]); 
  const [userProgress, setUserProgress] = useState<UserCourseProgress[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  useEffect(() => {
    const loadData = async () => {
      // Load Trades
      const tradeRes = await TradeService.getTrades();
      if (tradeRes.success && tradeRes.data) {
        setTrades(tradeRes.data);
      }

      // Load Outlooks
      const outlookRes = await OutlookService.getAll();
      if (outlookRes.success && outlookRes.data) {
        setOutlooks(outlookRes.data);
      }

      // Load Course
      const courseRes = await CourseService.getModules(); 
      const contentRes = await CourseService.getAllContent();
      if (courseRes.success && courseRes.data) {
        setCourseModules(courseRes.data);
        // We don't need to flatMap lessons if we fetch content separately, 
        // but keeping existing logic safe:
      }

      if (contentRes.success && contentRes.data) {
        setCourseContent(contentRes.data); 
      }
      
    };
    loadData();
  }, [currentUser]);

  useEffect(() => {
    if (currentUser?.role === UserRole.ADMIN) {
         const fetchUsers = async () => {
             const q = query(collection(db, "users"));
             const snap = await getDocs(q);
             const users = snap.docs.map(d => d.data() as User);
             setAllUsers(users);
         };
         fetchUsers();
    }
  }, [currentUser]);
  
  const handleUpdateModules = async (newModules: CourseModule[]) => {
      setCourseModules(newModules);
      newModules.forEach(m => CourseService.saveModule(m));
  };

  const handleUpdateContent = async (newContent: CourseContent[]) => {
      setCourseContent(newContent);
      newContent.forEach(c => CourseService.saveContent(c));
  };

  // --- NEW DELETE HANDLERS ---
  const handleDeleteModule = async (moduleId: string) => {
      // 1. Update Local State
      setCourseModules(prev => prev.filter(m => m.id !== moduleId));
      
      // 2. Delete Module from DB
      await CourseService.deleteModule(moduleId);

      // 3. Cleanup associated content (Optional but recommended)
      const contentToDelete = courseContent.filter(c => c.moduleId === moduleId);
      contentToDelete.forEach(c => CourseService.deleteContent(c.id));
      setCourseContent(prev => prev.filter(c => c.moduleId !== moduleId));
  };

  const handleDeleteContent = async (contentId: string) => {
      // 1. Update Local State
      setCourseContent(prev => prev.filter(c => c.id !== contentId));
      
      // 2. Delete Content from DB
      await CourseService.deleteContent(contentId);
  };
  // ---------------------------

  useEffect(() => {
    const loadProgress = async () => {
        if (currentUser) {
            const progress = await CourseService.getProgress(currentUser.id);
            if (progress) {
                setUserProgress([progress]); 
            } else {
                setUserProgress([]); 
            }
        }
    };
    loadProgress();
  }, [currentUser]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    if (user.role === UserRole.ADMIN) {
        setPage('admin');
    } else {
        setPage('dashboard');
    }
  };

  const handleLogout = async () => {
    await AuthService.logout(); 
    setCurrentUser(null);
    setPage('dashboard');
  };

  const markNotificationAsRead = (id: string) => {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleNotificationClick = (notification: Notification) => {
      markNotificationAsRead(notification.id);
      if (notification.relatedId) {
          setSelectedNotificationTradeId(notification.relatedId);
          setPage('trades');
      }
  };
  
  const updateUser = (updatedUser: User) => {
      setCurrentUser(updatedUser);
      const userIndex = MOCK_USERS.findIndex(u => u.id === updatedUser.id);
      if(userIndex >= 0) MOCK_USERS[userIndex] = updatedUser;
  };

  const handleNavigateToProfile = (userId: string) => {
      setViewingUserId(userId);
      setPage('user-profile');
  };

  const handleNavigateToTrade = (tradeId: string) => {
      setSelectedNotificationTradeId(tradeId);
      setPage('trades');
  };

  const handleToggleFollow = (targetId: string) => {
      if(!currentUser) return;
      let newFollowing = [...currentUser.following];
      if (newFollowing.includes(targetId)) {
          newFollowing = newFollowing.filter(id => id !== targetId);
      } else {
          newFollowing.push(targetId);
      }
      updateUser({ ...currentUser, following: newFollowing });
  };

  const handleAddVideo = (video: VideoResource) => {
      setVideos(prev => [video, ...prev]);
  };

  const handleTradeUpdate = (updatedTrade: Trade) => {
      setTrades(prevTrades => prevTrades.map(t => t.id === updatedTrade.id ? updatedTrade : t));
  };

  const handleUpdateProgress = (newProgress: UserCourseProgress) => {
      setUserProgress(prev => {
          const exists = prev.find(p => p.userId === newProgress.userId);
          if (exists) {
              return prev.map(p => p.userId === newProgress.userId ? newProgress : p);
          }
          return [...prev, newProgress];
      });
  };

  const handleAddChannel = (channel: Channel) => {
      setChannels(prev => [...prev, channel]);
  };

  const handleDeleteChannel = (channelId: string) => {
      setChannels(prev => prev.filter(c => c.id !== channelId));
  };

  // --- RENDER FUNCTION (Moved outside of a component definition) ---
  const renderPageContent = () => {
    switch (page) {
        case 'dashboard':
          return (
              <Dashboard 
                  user={currentUser!} 
                  trades={trades} 
                  onUpdateTrade={handleTradeUpdate}
              />
          );
        case 'course':
            return (
                <CourseLMS 
                    currentUser={currentUser!}
                    allUsers={allUsers} 
                    modules={courseModules}
                    content={courseContent}
                    userProgress={userProgress}
                    onUpdateModules={handleUpdateModules}
                    onUpdateContent={handleUpdateContent}
                    onDeleteModule={handleDeleteModule}   // <--- Passed Here
                    onDeleteContent={handleDeleteContent} // <--- Passed Here
                    onUpdateProgress={handleUpdateProgress}
                />
            );
        case 'outlook':
          return <MentorOutlookComponent outlooks={outlooks} />;
        case 'trades':
          return (
              <TradeCenter 
                  currentUser={currentUser!} 
                  trades={trades} 
                  setTrades={setTrades}
                  onUpdateTrade={handleTradeUpdate}
                  initialTradeId={selectedNotificationTradeId}
                  onTradeClosed={() => setSelectedNotificationTradeId(null)}
                  onUpdateUser={updateUser}
                  onNavigateToProfile={handleNavigateToProfile}
              />
          );
        case 'archive':
            return (
                <VideoArchive 
                  currentUser={currentUser!}
                  videos={videos}
                  onAddVideo={handleAddVideo}
                />
            );
        case 'traders':
            return (
                <TradersList 
                  currentUser={currentUser!}
                  users={MOCK_USERS} 
                  trades={trades}
                  onNavigateToProfile={handleNavigateToProfile}
                  onToggleFollow={handleToggleFollow}
                />
            );
        case 'community':
          return (
              <Community 
                  currentUser={currentUser!} 
                  trades={trades}
                  channels={channels}
                  onAddChannel={handleAddChannel}
                  onDeleteChannel={handleDeleteChannel}
                  onNavigateToProfile={handleNavigateToProfile}
                  onNavigateToTrade={handleNavigateToTrade}
                  onSaveRecording={handleAddVideo}
              />
          );
        case 'notifications':
          return (
              <Notifications 
                  notifications={notifications} 
                  markAsRead={markNotificationAsRead}
                  onNotificationClick={handleNotificationClick} 
              />
          );
        case 'profile':
            return (
                <UserProfile 
                    viewingUser={currentUser!}
                    currentUser={currentUser!}
                    onUpdateUser={updateUser}
                    trades={trades}
                    onNavigateToTrade={handleNavigateToTrade}
                />
            );
        case 'user-profile':
            const targetUser = MOCK_USERS.find(u => u.id === viewingUserId);
            if (!targetUser) return <div>User not found</div>;
            return (
                <UserProfile 
                    viewingUser={targetUser}
                    currentUser={currentUser!}
                    onUpdateUser={() => {}}
                    trades={trades}
                    onToggleFollow={handleToggleFollow}
                    onNavigateToTrade={handleNavigateToTrade}
                />
            );
        case 'admin':
          if (currentUser?.role !== UserRole.ADMIN) return <Dashboard user={currentUser!} trades={trades} onUpdateTrade={handleTradeUpdate} />;
          return (
              <AdminPanel 
                  trades={trades} 
                  setTrades={setTrades} 
                  outlooks={outlooks}
                  setOutlooks={setOutlooks}
                  mentorInstruction={mentorSystemInstruction}
                  setMentorInstruction={setMentorSystemInstruction}
              />
          );
        default:
          return <Dashboard user={currentUser!} trades={trades} onUpdateTrade={handleTradeUpdate} />;
      }
  };

  if (loading) {
      return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-gold-500">Loading ProScalp...</div>;
  }
  
  return (
    <LanguageProvider>
        {!currentUser ? (
             <Landing onLoginSuccess={handleLogin} />
        ) : (
            <Layout 
                currentUser={currentUser} 
                onNavigate={(p) => {
                    if(p === 'profile') {
                        setViewingUserId(currentUser.id);
                    }
                    setPage(p);
                }} 
                currentPage={page}
                onLogout={handleLogout}
                notifications={notifications}
            >
                {renderPageContent()}
                <AIAssistant />
            </Layout>
        )}
    </LanguageProvider>
  );
};

export default App;