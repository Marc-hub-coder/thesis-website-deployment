import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/database';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FIREBASE_DB_URL,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

let authReadyPromise;

export function ensureEmailPasswordAuth() {
  if (!authReadyPromise) {
    authReadyPromise = new Promise((resolve, reject) => {
      const unsub = auth.onAuthStateChanged((user) => {
        if (user) {
          unsub();
          resolve(user);
        }
      });
      
      // Check if user is already signed in
      const currentUser = auth.currentUser;
      if (currentUser) {
        resolve(currentUser);
        return;
      }
      
      // Sign in with email and password
      auth.signInWithEmailAndPassword('admin@gmail.com', 'admin2025')
        .then((userCredential) => {
          resolve(userCredential.user);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }
  return authReadyPromise;
}

export { app, auth, db };

// Expose for console debugging in the browser devtools
if (typeof window !== 'undefined') {
  // Safe-assign only if not already present
  window.firebase = window.firebase || firebase;
}


