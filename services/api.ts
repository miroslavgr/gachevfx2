import { User, RegistrationToken, UserRole,CourseLesson,CourseModule,UserCourseProgress,AppTranslations ,VideoResource,ChatMessage,Channel} from '../types';
import { auth, db } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut } from 'firebase/auth';
import { collection, doc, getDoc, setDoc, getDocs, query, where, updateDoc, addDoc, orderBy, limit, deleteDoc,onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Standard API Response Wrapper
 */
interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
}

/**
 * Authentication Service (PURE FIREBASE)
 */
export const AuthService = {
    
    // 1. Validate Registration Token
    validateToken: async (tokenCode: string): Promise<ApiResponse<RegistrationToken>> => {
        try {
            // Query 'tokens' collection where code == tokenCode
            const q = query(collection(db, "tokens"), where("code", "==", tokenCode));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                return { success: false, message: 'Invalid Token' };
            }

            const docData = querySnapshot.docs[0].data() as RegistrationToken;

            if (docData.isUsed) {
                return { success: false, message: 'Token already used' };
            }

            return { success: true, data: docData };
        } catch (e: any) {
            console.error("Firebase Error", e);
            return { success: false, message: e.message || 'Validation failed' };
        }
    },

    // 2. Register User
    register: async (userData: { name: string; email: string; password: string; token: string }): Promise<ApiResponse<User>> => {
        try {
            // A. Validate Token again (Security)
            const q = query(collection(db, "tokens"), where("code", "==", userData.token));
            const tokenSnapshot = await getDocs(q);
            
            if (tokenSnapshot.empty) {
                return { success: false, message: 'Invalid Token' };
            }
            
            const tokenDoc = tokenSnapshot.docs[0];
            if (tokenDoc.data().isUsed) {
                return { success: false, message: 'Token already used' };
            }

            // B. Create Auth User (Email/Password)
            const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
            const firebaseUser = userCredential.user;

            // C. Update Profile (Display Name)
            await updateProfile(firebaseUser, { displayName: userData.name });

            // D. Create User Document in 'users' collection
            const newUser: User = {
                id: firebaseUser.uid,
                name: userData.name,
                email: userData.email,
                role: UserRole.TRADER, // Default role
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
                following: [],
                privacy: 'public'
            };

            await setDoc(doc(db, "users", firebaseUser.uid), newUser);

            // E. Mark Token as Used
            await updateDoc(tokenDoc.ref, {
                isUsed: true,
                usedBy: firebaseUser.uid,
                usedAt: Date.now()
            });

            return { success: true, data: newUser };

        } catch (e: any) {
            console.error("Firebase Registration Error", e);
            return { success: false, message: e.message || 'Registration Failed' };
        }
    },

    // 3. Login
    login: async (email: string, password: string): Promise<ApiResponse<User>> => {
         try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const uid = userCredential.user.uid;

            // Fetch extra user details from Firestore 'users' collection
            const userDoc = await getDoc(doc(db, "users", uid));
            
            if (userDoc.exists()) {
                return { success: true, data: userDoc.data() as User };
            } else {
                return { success: false, message: "User profile not found." };
            }
        } catch (e: any) {
            console.error("Firebase Login Error", e);
            return { success: false, message: e.message || 'Login Failed' };
        }
    },

    // 4. Logout
    logout: async () => {
        await signOut(auth);
    },

    // 5. Get Current User Profile (For Page Refresh)
    getUserProfile: async (uid: string): Promise<User | null> => {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) {
            return userDoc.data() as User;
        }
        return null;
    }
};

/**
 * Admin Service (PURE FIREBASE)
 */
export const AdminService = {
    // Generate new token
    generateToken: async (adminId: string): Promise<ApiResponse<RegistrationToken>> => {
         try {
            const code = `INV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
            const newToken: RegistrationToken = {
                code: code,
                isUsed: false,
                generatedBy: adminId,
                generatedAt: Date.now()
            };

            // Add to 'tokens' collection
            await addDoc(collection(db, "tokens"), newToken);
            
            return { success: true, data: newToken };
        } catch (e: any) {
            return { success: false, message: e.message || 'Failed to generate token' };
        }
    },

    // Get all tokens
    getTokens: async (): Promise<ApiResponse<RegistrationToken[]>> => {
         try {
            const querySnapshot = await getDocs(collection(db, "tokens"));
            const tokens: RegistrationToken[] = [];
            querySnapshot.forEach((doc) => {
                tokens.push(doc.data() as RegistrationToken);
            });
            // Sort by date desc
            tokens.sort((a,b) => b.generatedAt - a.generatedAt);
            return { success: true, data: tokens };
        } catch (e: any) {
            return { success: false, message: e.message || 'Failed to fetch tokens' };
        }
    }
};

export const TranslationService = {
    getTranslations: async (): Promise<AppTranslations | null> => {
        try {
            const docRef = doc(db, "system", "translations");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return docSnap.data() as AppTranslations;
            }
            return null;
        } catch (e) {
            console.error("Failed to fetch translations:", e);
            return null;
        }
    },
    saveTranslations: async (translations: AppTranslations): Promise<boolean> => {
        try {
            await setDoc(doc(db, "system", "translations"), translations);
            return true;
        } catch (e) {
            console.error("Failed to save translations:", e);
            return false;
        }
    }
};


export const TradeService = {
    // A. Upload Image to Firebase Storage
    uploadImage: async (file: File): Promise<string> => {
        try {
            // Create a unique filename: trades/17099283_mychart.png
            const storageRef = ref(storage, `trades/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            return await getDownloadURL(snapshot.ref);
        } catch (e) {
            console.error("Upload failed", e);
            throw new Error("Failed to upload image");
        }
    },

    // B. Create Trade in Firestore
    createTrade: async (tradeData: any): Promise<ApiResponse<any>> => {
        try {
            // Save to 'trades' collection
            await setDoc(doc(db, "trades", tradeData.id), tradeData);
            return { success: true, data: tradeData };
        } catch (e: any) {
            console.error("Create Trade Error", e);
            return { success: false, message: e.message };
        }
    },
updateTrade: async (tradeData: any): Promise<ApiResponse<any>> => {
        try {
            await setDoc(doc(db, "trades", tradeData.id), tradeData, { merge: true });
            return { success: true, data: tradeData };
        } catch (e: any) { return { success: false, message: e.message }; }
    },
    // C. Fetch Real Trades (for the Feed)
    getTrades: async (): Promise<ApiResponse<any[]>> => {
        try {
            const q = query(collection(db, "trades"), orderBy("timestamp", "desc"), limit(50));
            const querySnapshot = await getDocs(q);
            const trades: any[] = [];
            querySnapshot.forEach((doc) => {
                trades.push(doc.data());
            });
            return { success: true, data: trades };
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    }
};

export const OutlookService = {
    // A. Get All Outlooks
    getAll: async (): Promise<ApiResponse<any[]>> => {
        try {
            const q = query(collection(db, "outlooks"));
            const querySnapshot = await getDocs(q);
            const outlooks: any[] = [];
            querySnapshot.forEach((doc) => {
                outlooks.push(doc.data());
            });
            // Sort by timestamp desc (newest first)
            outlooks.sort((a, b) => b.timestamp - a.timestamp);
            return { success: true, data: outlooks };
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    },

    // B. Save Outlook (Create or Update)
    save: async (outlookData: any): Promise<ApiResponse<any>> => {
        try {
            await setDoc(doc(db, "outlooks", outlookData.id), outlookData);
            return { success: true, data: outlookData };
        } catch (e: any) {
            console.error("Save Outlook Error", e);
            return { success: false, message: e.message };
        }
    },

    // C. Delete Outlook
    delete: async (id: string): Promise<ApiResponse<any>> => {
        try {
            await deleteDoc(doc(db, "outlooks", id));
            return { success: true };
        } catch (e: any) {
            console.error("Delete Outlook Error", e);
            return { success: false, message: e.message };
        }
    }
};

export const CourseService = {
    getModules: async (): Promise<ApiResponse<CourseModule[]>> => {
        try {
            const q = query(collection(db, "course_modules"), orderBy("id", "asc"));
            const querySnapshot = await getDocs(q);
            const modules: CourseModule[] = [];
            querySnapshot.forEach((doc) => modules.push(doc.data() as CourseModule));
            return { success: true, data: modules };
        } catch (e: any) { return { success: false, message: e.message }; }
    },
    getAllContent: async (): Promise<ApiResponse<CourseLesson[]>> => {
        try {
            const q = query(collection(db, "course_content"), orderBy("order", "asc"));
            const querySnapshot = await getDocs(q);
            const content: CourseLesson[] = [];
            querySnapshot.forEach((doc) => content.push(doc.data() as CourseLesson));
            return { success: true, data: content };
        } catch (e: any) { return { success: false, message: e.message }; }
    },
    updateProgress: async (userId: string, progress: UserCourseProgress): Promise<ApiResponse<any>> => {
        try {
            await setDoc(doc(db, "users", userId, "progress", "course_main"), progress);
            return { success: true };
        } catch (e: any) { return { success: false, message: e.message }; }
    },
    getProgress: async (userId: string): Promise<UserCourseProgress | null> => {
        try {
            const docRef = doc(db, "users", userId, "progress", "course_main");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) return docSnap.data() as UserCourseProgress;
            return null;
        } catch (e) { return null; }
    },
    seedCourseData: async (modules: CourseModule[]) => {
        try {
            for (const mod of modules) { await setDoc(doc(db, "course_modules", mod.id), mod); }
            return { success: true };
        } catch (e: any) { return { success: false, message: e.message }; }
    },
    saveModule: async (module: CourseModule) => {
        try {
            await setDoc(doc(db, "course_modules", module.id), module);
        } catch (e) { console.error("Error saving module:", e); }
    },
    deleteModule: async (moduleId: string) => {
        try {
            await deleteDoc(doc(db, "course_modules", moduleId));
        } catch (e) { console.error("Error deleting module:", e); }
    },
    saveContent: async (content: CourseLesson) => {
        try {
            // Firestore crashes if you pass 'undefined' values.
            await setDoc(doc(db, "course_content", content.id), content);
        } catch (e) { 
            console.error("Error saving content:", e); 
            // Important: Throw or handle this so the UI knows
        }
    },
    deleteContent: async (contentId: string) => {
        try {
            await deleteDoc(doc(db, "course_content", contentId));
        } catch (e) { console.error("Error deleting content:", e); }
    }
};

// ... inside UserService object ...

export const UserService = {
    getAll: async (): Promise<ApiResponse<User[]>> => {
        try {
            const q = query(collection(db, "users"));
            const snapshot = await getDocs(q);
            const users = snapshot.docs.map(d => d.data() as User);
            return { success: true, data: users };
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    },
setScreenShareStatus: async (userId: string, isSharing: boolean) => {
        try {
            await setDoc(doc(db, "users", userId), { isSharingScreen: isSharing }, { merge: true });
        } catch (e) {
            console.error("Presence Error", e);
        }
    },
    updateUser: async (user: User): Promise<ApiResponse<User>> => {
        try {
            await setDoc(doc(db, "users", user.id), user, { merge: true });
            return { success: true, data: user };
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    },
    // --- NEW: Real-time User Listener ---
    subscribeToUsers: (callback: (users: User[]) => void) => {
        const q = query(collection(db, "users"));
        return onSnapshot(q, (snapshot) => {
            const users: User[] = [];
            snapshot.forEach((doc) => {
                users.push(doc.data() as User);
            });
            callback(users);
        });
    }
};

export const VideoService = {
    getAll: async (): Promise<ApiResponse<VideoResource[]>> => {
        try {
            const q = query(collection(db, "videos"), orderBy("timestamp", "desc"));
            const snapshot = await getDocs(q);
            const videos = snapshot.docs.map(d => d.data() as VideoResource);
            return { success: true, data: videos };
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    },
    save: async (video: VideoResource): Promise<ApiResponse<VideoResource>> => {
        try {
            await setDoc(doc(db, "videos", video.id), video);
            return { success: true, data: video };
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    },
    uploadVideo: async (file: Blob | File): Promise<string> => {
        try {
            const filename = `videos/${Date.now()}_recording.webm`;
            const storageRef = ref(storage, filename);
            const snapshot = await uploadBytes(storageRef, file);
            return await getDownloadURL(snapshot.ref);
        } catch (e) {
            throw new Error("Video upload failed");
        }
    }
};
export const ChatService = {
    sendMessage: async (message: ChatMessage): Promise<ApiResponse<any>> => {
        try {
            await setDoc(doc(db, "messages", message.id), message);
            return { success: true };
        } catch (e: any) {
            console.error("Send Message Error", e);
            return { success: false, message: e.message };
        }
    },

    uploadImage: async (file: File): Promise<string> => {
        try {
            const storageRef = ref(storage, `chat_images/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            return await getDownloadURL(snapshot.ref);
        } catch (e) {
            throw new Error("Image upload failed");
        }
    },

    subscribeToChannel: (channelId: string, callback: (messages: ChatMessage[]) => void) => {
        const q = query(
            collection(db, "messages"), 
            where("channelId", "==", channelId),
    
        );

        return onSnapshot(q, (snapshot) => {
            const msgs: ChatMessage[] = [];
            snapshot.forEach((doc) => {
                msgs.push(doc.data() as ChatMessage);
            });
            // Client-side sort
            msgs.sort((a, b) => a.timestamp - b.timestamp);
            callback(msgs);
        }, (error) => {
            console.error("Chat Listener Error:", error);
            if (error.code === 'permission-denied') {
                alert("Database permission denied. Check Firestore Rules.");
            }
        });
    }
};

export const ChannelService = {
    // 1. Get All Channels
    getAll: async (): Promise<ApiResponse<Channel[]>> => {
        try {
            const q = query(collection(db, "channels"));
            const snapshot = await getDocs(q);
            const channels = snapshot.docs.map(d => d.data() as Channel);
            return { success: true, data: channels };
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    },

    // 2. Create Channel
    createChannel: async (channel: Channel): Promise<ApiResponse<Channel>> => {
        try {
            await setDoc(doc(db, "channels", channel.id), channel);
            return { success: true, data: channel };
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    },

    // 3. Delete Channel
    deleteChannel: async (channelId: string): Promise<ApiResponse<any>> => {
        try {
            await deleteDoc(doc(db, "channels", channelId));
            return { success: true };
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    }
};


// services/api.ts

// --- NEW NOTIFICATION SERVICE ---
export const NotificationService = {
    // 1. Subscribe to real-time updates for a specific user
    subscribeToNotifications: (userId: string, callback: (notifications: Notification[]) => void) => {
        const q = query(
            collection(db, "notifications"),
            where("userId", "==", userId),
            orderBy("timestamp", "desc")
        );

        return onSnapshot(q, (snapshot) => {
            const notifications: Notification[] = [];
            snapshot.forEach((doc) => {
                notifications.push({ id: doc.id, ...doc.data() } as Notification);
            });
            callback(notifications);
        }, (error) => {
            console.error("Notification Listener Error:", error);
        });
    },

    // 2. Mark a notification as read
    markAsRead: async (notificationId: string) => {
        try {
            const docRef = doc(db, "notifications", notificationId);
            await updateDoc(docRef, { read: true });
        } catch (e) {
            console.error("Error marking notification as read:", e);
        }
    },

    // 3. Helper to create a notification (Used by Mentor/Systems)
    createNotification: async (notification: Omit<Notification, 'id'>) => {
        try {
            await addDoc(collection(db, "notifications"), notification);
        } catch (e) {
            console.error("Error creating notification:", e);
        }
    }
};
// services/api.ts

export const NewsService = {
    getHighImpactEvents: async (centerDateStr: string): Promise<any[]> => {
        const FMP_API_KEY = "dk3vkG8pQp0qWkdGGl7cDp7ijiVSDp6h"; // Get free key at financialmodelingprep.com
        
       try {
         // 1. Calculate Date Radius (Current Date +/- 30 Days)
            const centerDate = new Date(centerDateStr);
            
            const startDate = new Date(centerDate);
            startDate.setDate(centerDate.getDate() - 30); // 1 Month Prior
            
            const endDate = new Date(centerDate);
            endDate.setDate(centerDate.getDate() + 30);   // 1 Month Future

            // Format YYYY-MM-DD
            const from = startDate.toISOString().split('T')[0];
            const to = endDate.toISOString().split('T')[0];

            // 2. Fetch Broad Range
            const url = `https://financialmodelingprep.com/stable/economic-calendar?from=${from}&to=${to}&apikey=${FMP_API_KEY}`;
            
            const response = await fetch(url);
            const data = await response.json();

            if (data['Error Message']) throw new Error(data['Error Message']);

            if (Array.isArray(data)) {
                return data.map((e: any) => ({
                    id: `news-${e.event.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}-${Math.random()}`,
                    // Extract safe time
                    label: e.date.includes(' ') ? e.date.split(' ')[1].slice(0, 5) : "All Day",
                    // Store the full date string for filtering later
                    dateString: e.date.split(' ')[0], 
                    title: e.event,
                    type: 'news',
                    impact: e.impact ? e.impact.toLowerCase() : 'low', 
                    currency: e.currency || 'GLOBAL',
                    forecast: e.estimate || '',
                    previous: e.previous || '',
                    actual: e.actual || '',
                    country: e.country || ''
                }));
            }
            return [];

        } catch (error) {
            console.warn("News API Error (Falling back to Simulation):", error);
            
            // FALLBACK SIMULATION (So your app doesn't break if API fails)
            // ... (Keep the simulation logic from previous step here) ...
            return []; // Simplified return for this snippet
        }
    }
};
