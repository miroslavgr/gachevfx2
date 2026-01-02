
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { initializeFirestore } from 'firebase/firestore';

// --- FIREBASE CONFIGURATION ---
// Replace the values below with your actual Firebase project configuration.
const firebaseConfig = {
  apiKey: "AIzaSyCVVXQL-erRKDVgaTHg6J6imP2ICzrKfd8",
  authDomain: "proscalp-mentorship.firebaseapp.com",
  projectId: "proscalp-mentorship",
  storageBucket: "proscalp-mentorship.firebasestorage.app",
  messagingSenderId: "804848416864",
  appId: "1:804848416864:web:f02bebb29705a8dc6beb05",
  measurementId: "G-0DWB0KBPTG"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Services
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
    ignoreUndefinedProperties: true 
});
export const storage = getStorage(app);
export const functions = getFunctions(app); 

export default app;
