/**
 * Centralized access to Vite environment config. All `import.meta.env.VITE_*`
 * reads live here so the rest of the app never hardcodes URLs or keys.
 *
 * Firebase web values and the Maps key are PUBLIC client identifiers (not
 * secrets) — the real protection is Firebase Auth + Security Rules. We still
 * read them from env so the bundle isn't pinned to one project.
 */

const required = (name: string, value: string | undefined): string => {
  if (!value || value.trim() === '') {
    throw new Error(
      `Missing required environment variable ${name}. Copy .env.example to .env and fill it in.`,
    );
  }
  return value;
};

const e = import.meta.env;

export const env = {
  apiBaseUrl: required('VITE_API_URL', e.VITE_API_URL).replace(/\/$/, ''),
  firebase: {
    apiKey: required('VITE_FIREBASE_API_KEY', e.VITE_FIREBASE_API_KEY),
    authDomain: required('VITE_FIREBASE_AUTH_DOMAIN', e.VITE_FIREBASE_AUTH_DOMAIN),
    projectId: required('VITE_FIREBASE_PROJECT_ID', e.VITE_FIREBASE_PROJECT_ID),
    storageBucket: required('VITE_FIREBASE_STORAGE_BUCKET', e.VITE_FIREBASE_STORAGE_BUCKET),
    messagingSenderId: required('VITE_FIREBASE_MESSAGING_SENDER_ID', e.VITE_FIREBASE_MESSAGING_SENDER_ID),
    appId: required('VITE_FIREBASE_APP_ID', e.VITE_FIREBASE_APP_ID),
    // Optional — analytics only.
    measurementId: e.VITE_FIREBASE_MEASUREMENT_ID ?? '',
  },
  // Used by the Maps script tag in index.html (via %VITE_GOOGLE_MAPS_API_KEY%);
  // exposed here too for any programmatic use.
  googleMapsApiKey: e.VITE_GOOGLE_MAPS_API_KEY ?? '',
} as const;
