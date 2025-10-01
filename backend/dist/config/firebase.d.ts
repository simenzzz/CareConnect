import admin from 'firebase-admin';
export declare const initializeFirebase: () => void;
export declare const getFirebaseApp: () => admin.app.App;
export declare const getAuth: () => import("firebase-admin/lib/auth/auth").Auth;
export declare const verifyIdToken: (idToken: string) => Promise<import("firebase-admin/lib/auth/token-verifier").DecodedIdToken>;
//# sourceMappingURL=firebase.d.ts.map