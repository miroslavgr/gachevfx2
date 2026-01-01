import { User, RegistrationToken, UserRole,CourseLesson,CourseModule,UserCourseProgress } from '../types';
import { auth, db } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut } from 'firebase/auth';
import { collection, doc, getDoc, setDoc, getDocs, query, where, updateDoc, addDoc, orderBy, limit, deleteDoc } from 'firebase/firestore';
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


// services/api.ts

export const CourseService = {
    // 1. Get All Modules (The Curriculum)
    getModules: async (): Promise<ApiResponse<CourseModule[]>> => {
        try {
            // Fetch modules from 'course_modules' collection
            // We order by 'order' or 'id' to keep them in sequence
            const q = query(collection(db, "course_modules"), orderBy("id", "asc"));
            const querySnapshot = await getDocs(q);
            
            const modules: CourseModule[] = [];
            querySnapshot.forEach((doc) => {
                modules.push(doc.data() as CourseModule);
            });
            return { success: true, data: modules };
        } catch (e: any) {
            console.error("Fetch Course Error", e);
            return { success: false, message: e.message };
        }
    },
    getAllContent: async (): Promise<ApiResponse<CourseLesson[]>> => {
        try {
            const q = query(collection(db, "course_content"), orderBy("order", "asc"));
            const querySnapshot = await getDocs(q);
            const content: CourseLesson[] = [];
            querySnapshot.forEach((doc) => {
                content.push(doc.data() as CourseLesson);
            });
            return { success: true, data: content };
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    },
    // 2. Save User Progress (Mark Lesson as Complete)
    updateProgress: async (userId: string, progress: UserCourseProgress): Promise<ApiResponse<any>> => {
        try {
            // Save to a sub-collection: users/{uid}/progress/course_main
            await setDoc(doc(db, "users", userId, "progress", "course_main"), progress);
            return { success: true };
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    },

    // 3. Get User Progress
    getProgress: async (userId: string): Promise<UserCourseProgress | null> => {
        try {
            const docRef = doc(db, "users", userId, "progress", "course_main");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return docSnap.data() as UserCourseProgress;
            }
            return null;
        } catch (e) {
            console.error(e);
            return null;
        }
    },

    // 4. (ADMIN ONLY) Migrate Mock Data to DB
    seedCourseData: async (modules: CourseModule[]) => {
        try {
            for (const mod of modules) {
                await setDoc(doc(db, "course_modules", mod.id), mod);
            }
            console.log("Migration Complete!");
            return { success: true };
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    },

    saveModule: async (module: CourseModule) => {
        await setDoc(doc(db, "course_modules", module.id), module);
    },

    // Delete a Module
    deleteModule: async (moduleId: string) => {
        await deleteDoc(doc(db, "course_modules", moduleId));
    },

    // Save/Update a Content Item (Lesson)
    saveContent: async (content: CourseLesson) => {
        await setDoc(doc(db, "course_content", content.id), content);
    },

    // Delete a Content Item
    deleteContent: async (contentId: string) => {
        await deleteDoc(doc(db, "course_content", contentId));
    }

};
