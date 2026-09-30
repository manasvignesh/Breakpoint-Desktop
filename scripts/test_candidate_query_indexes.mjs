import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || 'AIzaSyDucWzTVZomZYsXyWZ83ygCSJOCArOBzIs',
  authDomain: 'cie-connect.firebaseapp.com',
  projectId: 'cie-connect',
  storageBucket: 'cie-connect.firebasestorage.app',
  messagingSenderId: '226102698550',
  appId: '1:226102698550:web:453d7032cec3231a6dee97',
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testOrderedQueries() {
  console.log('Testing Firestore queries with orderBy publishedAt desc...');
  const postsRef = collection(db, 'posts');

  try {
    const qApproved = query(postsRef, where('status', '==', 'approved'), orderBy('publishedAt', 'desc'), limit(40));
    const snapA = await getDocs(qApproved);
    console.log(`✓ Approved query with orderBy('publishedAt', 'desc') returned ${snapA.size} docs`);
    if (!snapA.empty) {
      console.log(`  Newest approved: [${snapA.docs[0].id}] publishedAt=${snapA.docs[0].data().publishedAt} title="${snapA.docs[0].data().title?.substring(0, 50)}"`);
    }
  } catch (err) {
    console.error('✗ Approved query failed:', err.message);
  }

  try {
    const qPublished = query(postsRef, where('status', '==', 'published'), orderBy('publishedAt', 'desc'), limit(40));
    const snapP = await getDocs(qPublished);
    console.log(`✓ Published query with orderBy('publishedAt', 'desc') returned ${snapP.size} docs`);
    if (!snapP.empty) {
      console.log(`  Newest published: [${snapP.docs[0].id}] publishedAt=${snapP.docs[0].data().publishedAt} title="${snapP.docs[0].data().title?.substring(0, 50)}"`);
    }
  } catch (err) {
    console.error('✗ Published query failed:', err.message);
  }

  try {
    const qLegacyApproved = query(postsRef, where('status', '==', 'approved'), orderBy('createdAt', 'desc'), limit(40));
    const snapLA = await getDocs(qLegacyApproved);
    console.log(`✓ Legacy Approved query with orderBy('createdAt', 'desc') returned ${snapLA.size} docs`);
  } catch (err) {
    console.error('✗ Legacy Approved query failed:', err.message);
  }

  try {
    const qLegacyPublished = query(postsRef, where('status', '==', 'published'), orderBy('createdAt', 'desc'), limit(40));
    const snapLP = await getDocs(qLegacyPublished);
    console.log(`✓ Legacy Published query with orderBy('createdAt', 'desc') returned ${snapLP.size} docs`);
  } catch (err) {
    console.error('✗ Legacy Published query failed:', err.message);
  }
}

testOrderedQueries().catch(console.error);
