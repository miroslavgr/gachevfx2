import React, { useState, useEffect } from "react";
import {
  User,
  UserRole,
  Trade,
  Notification,
  MentorOutlook,
  VideoResource,
  CourseModule,
  CourseContent,
  UserCourseProgress,
  Channel,
} from "./types";
import { MOCK_VIDEOS } from "./constants";
import { onAuthStateChanged } from "firebase/auth";
import {
  AuthService,
  TradeService,
  OutlookService,
  CourseService,
  UserService,
  VideoService,
  ChannelService,
  NotificationService,
} from "./services/api";
import { auth, db } from "./services/firebase";
import { collection, query, getDocs } from "firebase/firestore";
import Layout from "./components/Layout";
import Landing from "./components/Landing";
import Dashboard from "./components/Dashboard";
import TradeCenter from "./components/TradeCenter";
import Community from "./components/Community";
import Notifications from "./components/Notifications";
import AIAssistant from "./components/AIAssistant";
import MentorOutlookComponent from "./components/MentorOutlook";
import AdminPanel from "./components/AdminPanel";
import UserProfile from "./components/UserProfile";
import TradersList from "./components/TradersList";
import VideoArchive from "./components/VideoArchive";
import CourseLMS from "./components/CourseLMS";
import { LanguageProvider } from "./contexts/LanguageContext";

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState("dashboard");
  const [trades, setTrades] = useState<Trade[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [selectedNotificationTradeId, setSelectedNotificationTradeId] =
    useState<string | null>(null);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [videos, setVideos] = useState<VideoResource[]>(MOCK_VIDEOS);

  const [outlooks, setOutlooks] = useState<MentorOutlook[]>([]);
  const [mentorSystemInstruction, setMentorSystemInstruction] =
    useState<string>(
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
        setPage("dashboard");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const [channels, setChannels] = useState<Channel[]>([]);
  const [courseModules, setCourseModules] = useState<CourseModule[]>([]);
  const [courseContent, setCourseContent] = useState<CourseContent[]>([]);
  const [userProgress, setUserProgress] = useState<UserCourseProgress[]>([]);

  useEffect(() => {
    const loadData = async () => {
      // 1. Load Trades
      const tradeRes = await TradeService.getTrades();
      if (tradeRes.success && tradeRes.data) {
        setTrades(tradeRes.data);
      }

      // 2. Load Outlooks
      const outlookRes = await OutlookService.getAll();
      if (outlookRes.success && outlookRes.data) {
        setOutlooks(outlookRes.data);
      }

      // 3. Load Users
      const userRes = await UserService.getAll();
      if (userRes.success && userRes.data) {
        setAllUsers(userRes.data);
      }

      // 4. Load Videos (NEW)
      const videoRes = await VideoService.getAll();
      if (videoRes.success && videoRes.data && videoRes.data.length > 0) {
        setVideos(videoRes.data);
      }

      const channelRes = await ChannelService.getAll();
      if (channelRes.success && channelRes.data && channelRes.data.length > 0) {
        setChannels(channelRes.data);
      }

      // 5. Load Course
      const courseRes = await CourseService.getModules();
      const contentRes = await CourseService.getAllContent();
      if (courseRes.success && courseRes.data) {
        setCourseModules(courseRes.data);
      }
      if (contentRes.success && contentRes.data) {
        setCourseContent(contentRes.data);
      } else if (courseRes.success && courseRes.data) {
        const allLessons: CourseContent[] = courseRes.data.flatMap(
          (m) => m.lessons || []
        );
        if (allLessons.length > 0) {
          setCourseContent(allLessons);
        }
      }
    };
    loadData();
  }, [currentUser]);

  const handleUpdateModules = async (newModules: CourseModule[]) => {
    setCourseModules(newModules);
    newModules.forEach((m) => CourseService.saveModule(m));
  };

  const handleUpdateContent = async (newContent: CourseContent[]) => {
    setCourseContent(newContent);
    newContent.forEach((c) => CourseService.saveContent(c));
  };

  const handleDeleteModule = async (moduleId: string) => {
    setCourseModules((prev) => prev.filter((m) => m.id !== moduleId));
    await CourseService.deleteModule(moduleId);
    const contentToDelete = courseContent.filter(
      (c) => c.moduleId === moduleId
    );
    contentToDelete.forEach((c) => CourseService.deleteContent(c.id));
    setCourseContent((prev) => prev.filter((c) => c.moduleId !== moduleId));
  };

  const handleDeleteContent = async (contentId: string) => {
    setCourseContent((prev) => prev.filter((c) => c.id !== contentId));
    await CourseService.deleteContent(contentId);
  };

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

  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }

    // Start listening to the database for this specific user
    const unsubscribe = NotificationService.subscribeToNotifications(
      currentUser.id,
      (data) => {
        setNotifications(data);
      }
    );

    return () => unsubscribe(); // Cleanup on logout or unmount
  }, [currentUser]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    if (user.role === UserRole.ADMIN) {
      setPage("admin");
    } else {
      setPage("dashboard");
    }
  };

  const handleLogout = async () => {
    await AuthService.logout();
    setCurrentUser(null);
    setPage("dashboard");
  };

  // 3. Update the Mark as Read Handler
  const markNotificationAsRead = async (id: string) => {
    // Optimistic Update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    // Database Update
    await NotificationService.markAsRead(id);
  };

  const handleNotificationClick = (notification: Notification) => {
    markNotificationAsRead(notification.id);
    if (notification.relatedId) {
      setSelectedNotificationTradeId(notification.relatedId);
      setPage("trades");
    }
  };

  const updateUser = async (updatedUser: User) => {
    setCurrentUser(updatedUser);
    setAllUsers((prev) =>
      prev.map((u) => (u.id === updatedUser.id ? updatedUser : u))
    );
    await UserService.updateUser(updatedUser);
  };

  const handleNavigateToProfile = (userId: string) => {
    setViewingUserId(userId);
    setPage("user-profile");
  };

  const handleNavigateToTrade = (tradeId: string) => {
    setSelectedNotificationTradeId(tradeId);
    setPage("trades");
  };

  const handleToggleFollow = async (targetId: string) => {
    if (!currentUser) return;
    let newFollowing = [...currentUser.following];
    if (newFollowing.includes(targetId)) {
      newFollowing = newFollowing.filter((id) => id !== targetId);
    } else {
      newFollowing.push(targetId);
    }
    const updatedUser = { ...currentUser, following: newFollowing };
    setCurrentUser(updatedUser);
    await UserService.updateUser(updatedUser);
  };

  // --- UPDATED VIDEO HANDLER ---
  const handleAddVideo = async (video: VideoResource) => {
    // 1. Optimistic Update
    setVideos((prev) => [video, ...prev]);
    // 2. Persist to DB
    await VideoService.save(video);
  };
  // -----------------------------

  const handleTradeUpdate = async (updatedTrade: Trade) => {
    setTrades((prevTrades) =>
      prevTrades.map((t) => (t.id === updatedTrade.id ? updatedTrade : t))
    );
    await TradeService.updateTrade(updatedTrade);
  };

  const handleUpdateProgress = (newProgress: UserCourseProgress) => {
    setUserProgress((prev) => {
      const exists = prev.find((p) => p.userId === newProgress.userId);
      if (exists) {
        return prev.map((p) =>
          p.userId === newProgress.userId ? newProgress : p
        );
      }
      return [...prev, newProgress];
    });
  };

  const handleAddChannel = async (channel: Channel) => {
    // 1. Optimistic Update
    setChannels((prev) => [...prev, channel]);
    // 2. Save to DB
    await ChannelService.createChannel(channel);
  };

  const handleDeleteChannel = async (channelId: string) => {
    // 1. Optimistic Update
    setChannels((prev) => prev.filter((c) => c.id !== channelId));
    // 2. Delete from DB
    await ChannelService.deleteChannel(channelId);
  };

  const renderPageContent = () => {
    switch (page) {
      case "dashboard":
        return (
          <Dashboard
            user={currentUser!}
            trades={trades}
            onUpdateTrade={handleTradeUpdate}
          />
        );
      case "course":
        return (
          <CourseLMS
            currentUser={currentUser!}
            allUsers={allUsers}
            modules={courseModules}
            content={courseContent}
            userProgress={userProgress}
            onUpdateModules={handleUpdateModules}
            onUpdateContent={handleUpdateContent}
            onDeleteModule={handleDeleteModule}
            onDeleteContent={handleDeleteContent}
            onUpdateProgress={handleUpdateProgress}
          />
        );
      case "outlook":
        return <MentorOutlookComponent outlooks={outlooks} />;
      case "trades":
        return (
          <TradeCenter
            currentUser={currentUser!}
            trades={trades}
            allUsers={allUsers}
            setTrades={setTrades}
            onUpdateTrade={handleTradeUpdate}
            initialTradeId={selectedNotificationTradeId}
            onTradeClosed={() => setSelectedNotificationTradeId(null)}
            onUpdateUser={updateUser}
            onNavigateToProfile={handleNavigateToProfile}
          />
        );
      case "archive":
        return (
          <VideoArchive
            currentUser={currentUser!}
            videos={videos}
            onAddVideo={handleAddVideo}
          />
        );
      case "traders":
        return (
          <TradersList
            currentUser={currentUser!}
            users={allUsers}
            trades={trades}
            onNavigateToProfile={handleNavigateToProfile}
            onToggleFollow={handleToggleFollow}
          />
        );
      case "community":
        return (
          <Community
            currentUser={currentUser!}
            trades={trades}
            channels={channels}
            allUsers={allUsers}
            onAddChannel={handleAddChannel}
            onDeleteChannel={handleDeleteChannel}
            onNavigateToProfile={handleNavigateToProfile}
            onNavigateToTrade={handleNavigateToTrade}
            onSaveRecording={handleAddVideo} // <--- Connected here
          />
        );
      case "notifications":
        return (
          <Notifications
            notifications={notifications}
            markAsRead={markNotificationAsRead}
            onNotificationClick={handleNotificationClick}
          />
        );
      case "profile":
        return (
          <UserProfile
            viewingUser={currentUser!}
            currentUser={currentUser!}
            onUpdateUser={updateUser}
            trades={trades}
            onNavigateToTrade={handleNavigateToTrade}
          />
        );
      case "user-profile":
        const targetUser = allUsers.find((u) => u.id === viewingUserId);
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
      case "admin":
        if (currentUser?.role !== UserRole.ADMIN)
          return (
            <Dashboard
              user={currentUser!}
              trades={trades}
              onUpdateTrade={handleTradeUpdate}
            />
          );
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
        return (
          <Dashboard
            user={currentUser!}
            trades={trades}
            onUpdateTrade={handleTradeUpdate}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-gold-500">
        Loading ProScalp...
      </div>
    );
  }

  return (
    <LanguageProvider>
      {!currentUser ? (
        <Landing onLoginSuccess={handleLogin} />
      ) : (
        <Layout
          currentUser={currentUser}
          onNavigate={(p) => {
            if (p === "profile") {
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
