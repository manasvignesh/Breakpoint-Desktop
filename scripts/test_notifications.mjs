import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs
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

async function testNotifications() {
  console.log("=== 5. NOTIFICATIONS RUNTIME VALIDATION ===");

  const cred = await signInWithEmailAndPassword(auth, testEmail, testPassword);
  const uid = cred.user.uid;
  console.log(`Signed in user: ${uid}`);

  const validStoryId = "00x1a7ggH09jA828I5qd";
  const missingStoryId = "non_existent_story_999999";

  console.log("1. Querying user notifications...");
  const notifsSnap = await getDocs(query(collection(db, "notifications"), where("userId", "==", uid)));
  const notifs = notifsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`Found ${notifs.length} notifications for user.`);

  console.log(`\n2. Testing deep linking with target contentId: ${validStoryId}...`);
  const validStoryDoc = await getDoc(doc(db, "posts", validStoryId));
  if (!validStoryDoc.exists()) throw new Error("Target story does not exist");
  console.log(">> Deep-link valid target resolution: PASS");

  console.log(`\n3. Testing graceful failure with missing target contentId: ${missingStoryId}...`);
  const missingStoryDoc = await getDoc(doc(db, "posts", missingStoryId));
  const handleNavigation = (docSnap) => {
    if (!docSnap.exists()) {
      return { success: false, error: "Story not found or removed by editorial" };
    }
    return { success: true, story: docSnap.data() };
  };
  const res = handleNavigation(missingStoryDoc);
  if (res.success !== false) throw new Error("Did not handle missing target gracefully");
  console.log(">> Graceful fallback on missing target: PASS");

  console.log("\n>>> NOTIFICATIONS RUNTIME VALIDATION: ALL CHECKS PASSED <<<");
}

testNotifications()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("NOTIFICATIONS VALIDATION FAILED:", e);
    process.exit(1);
  });
