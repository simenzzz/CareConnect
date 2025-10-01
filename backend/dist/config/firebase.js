"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyIdToken = exports.getAuth = exports.getFirebaseApp = exports.initializeFirebase = void 0;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
let firebaseApp;
const initializeFirebase = () => {
    try {
        if (firebase_admin_1.default.apps.length === 0) {
            const serviceAccount = {
                type: "service_account",
                project_id: process.env.FIREBASE_PROJECT_ID,
                private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
                private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                client_email: process.env.FIREBASE_CLIENT_EMAIL,
                client_id: process.env.FIREBASE_CLIENT_ID,
                auth_uri: "https://accounts.google.com/o/oauth2/auth",
                token_uri: "https://oauth2.googleapis.com/token",
                auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
                client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
            };
            firebaseApp = firebase_admin_1.default.initializeApp({
                credential: firebase_admin_1.default.credential.cert(serviceAccount),
                projectId: process.env.FIREBASE_PROJECT_ID,
            });
            console.log('✅ Firebase Admin initialized successfully');
        }
        else {
            firebaseApp = firebase_admin_1.default.app();
            console.log('✅ Firebase Admin already initialized');
        }
    }
    catch (error) {
        console.error('❌ Firebase initialization error:', error);
        throw error;
    }
};
exports.initializeFirebase = initializeFirebase;
const getFirebaseApp = () => {
    if (!firebaseApp) {
        throw new Error('Firebase not initialized');
    }
    return firebaseApp;
};
exports.getFirebaseApp = getFirebaseApp;
const getAuth = () => {
    return firebase_admin_1.default.auth();
};
exports.getAuth = getAuth;
const verifyIdToken = async (idToken) => {
    try {
        const decodedToken = await firebase_admin_1.default.auth().verifyIdToken(idToken);
        return decodedToken;
    }
    catch (error) {
        console.error('Error verifying ID token:', error);
        throw new Error('Invalid ID token');
    }
};
exports.verifyIdToken = verifyIdToken;
//# sourceMappingURL=firebase.js.map