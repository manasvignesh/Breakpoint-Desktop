import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  getDocs,
  query,
  where,
  limit
} from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import './envHelper.mjs';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const testEmail = process.env.TEST_USER_EMAIL;
const testPassword = process.env.TEST_USER_PASSWORD;

if (!testEmail || !testPassword) {
  throw new Error('Required test credentials are missing: Set TEST_USER_EMAIL and TEST_USER_PASSWORD in environment.');
}

async function checkNotifications() {
  console.log("=== CHECKING NOTIFICATIONS IN FIRESTORE (AUTHENTICATED AS USER) ===");
  const cred = await signInWithEmailAndPassword(auth, testEmail, testPassword);
  console.log("Signed in:", cred.user.uid);

  const q = query(
    collection(db, "notifications"), 
    where("userId", "==", cred.user.uid),
    limit(10)
  );
  const notifsSnap = await getDocs(q);
  console.log(`Query succeeded! Found ${notifsSnap.docs.length} notifications for user.`);
}

checkNotifications().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
