import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { env } from './env';

// Firebase configuration (public client identifiers, sourced from VITE_* env)
const firebaseConfig = env.firebase;

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Firebase Storage and get a reference to the service
// Explicitly set the storage bucket to ensure we're using the correct one
export const storage = getStorage(app, `gs://${env.firebase.storageBucket}`);

export default app;
