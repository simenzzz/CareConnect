import admin from 'firebase-admin';
import { logger } from '../utils/logger';
import { getEnv } from './env';

let firebaseApp: admin.app.App;

export const initializeFirebase = () => {
  try {
    if (admin.apps.length === 0) {
      const env = getEnv();
      const serviceAccount = {
        type: "service_account",
        project_id: env.FIREBASE_PROJECT_ID,
        private_key_id: env.FIREBASE_PRIVATE_KEY_ID,
        private_key: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: env.FIREBASE_CLIENT_EMAIL,
        client_id: env.FIREBASE_CLIENT_ID,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${env.FIREBASE_CLIENT_EMAIL}`
      };

      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
        projectId: env.FIREBASE_PROJECT_ID,
      });
      
      logger.info('✅ Firebase Admin initialized successfully');
    } else {
      firebaseApp = admin.app();
      logger.info('✅ Firebase Admin already initialized');
    }
  } catch (error) {
    logger.error('❌ Firebase initialization error:', error);
    throw error;
  }
};

export const getAuth = () => {
  return admin.auth();
};

export const verifyIdToken = async (idToken: string) => {
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    logger.error('Error verifying ID token:', error);
    throw new Error('Invalid ID token');
  }
};