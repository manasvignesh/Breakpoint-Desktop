import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, setDoc, query, where, orderBy, limit, serverTimestamp } from 'firebase/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envContent = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim();
    if (key && !key.startsWith('#')) env[key] = val;
  }
});

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID
});

const auth = getAuth(app);
const db = getFirestore(app);

async function main() {
  const userCredA = await signInWithEmailAndPassword(auth, env.TEST_USER_EMAIL, env.TEST_USER_PASSWORD);
  const tokenA = await userCredA.user.getIdToken();
  const uidA = userCredA.user.uid;

  const userCredB = await signInWithEmailAndPassword(auth, env.TARGET_CREATOR_EMAIL, env.TARGET_CREATOR_PASSWORD);
  const uidB = userCredB.user.uid;

  const pairId = uidA < uidB ? `${uidA}_${uidB}` : `${uidB}_${uidA}`;
  const convRef = doc(db, 'conversations', pairId);
  await setDoc(convRef, {
    participants: [uidA, uidB],
    participantDetails: {
      [uidA]: { name: 'Test User A', email: env.TEST_USER_EMAIL },
      [uidB]: { name: 'Test User B', email: env.TARGET_CREATOR_EMAIL }
    },
    lastMessage: 'Notification check',
    lastMessageSenderId: uidA,
    lastMessageTimestamp: serverTimestamp(),
    unreadCounts: { [uidA]: 0, [uidB]: 0 },
    createdAt: serverTimestamp()
  }, { merge: true });

  const testContent = 'Notification Schema Inspection ' + Date.now();
  const sendRes = await fetch('https://fuvquwhphuheqgfdmtbh.supabase.co/functions/v1/send-message', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      conversationId: pairId,
      content: testContent,
      senderId: uidA,
      receiverId: uidB,
      clientMessageId: `notif_inspect_${Date.now()}`
    })
  });
  console.log('send-message HTTP status:', sendRes.status);
  const sendData = await sendRes.json();
  console.log('send-message response:', sendData);

  // Wait 2s for async notification write
  await new Promise(r => setTimeout(r, 2000));

  // Query notifications collection where userId == uidB
  // Note: auth is currently signed in as user B
  const notifQuery = query(
    collection(db, 'notifications'),
    where('userId', '==', uidB),
    limit(10)
  );
  const notifSnap = await getDocs(notifQuery);
  console.log('\n--- RECEIVER NOTIFICATIONS (collection: notifications, userId == uidB) ---');
  console.log('Count:', notifSnap.docs.length);
  notifSnap.docs.forEach((d, idx) => {
    console.log(`\n[Doc ${idx + 1} - ID: ${d.id}]:`);
    console.log(JSON.stringify(d.data(), null, 2));
  });
}

main().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
