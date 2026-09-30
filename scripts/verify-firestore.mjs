import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, limit } from 'firebase/firestore';
import { toDomainStory } from '../src/services/mappers/articleMapper.ts';

const firebaseConfig = {
  apiKey: "AIzaSyDucWzTVZomZYsXyWZ83ygCSJOCArOBzIs",
  authDomain: "cie-connect.firebaseapp.com",
  projectId: "cie-connect",
  storageBucket: "cie-connect.firebasestorage.app",
  messagingSenderId: "226102698550",
  appId: "1:226102698550:web:453d7032cec3231a6dee97",
};

async function verifyLiveFirestore() {
  console.log('Connecting to real Firestore project [cie-connect]...');
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const postsQuery = query(collection(db, 'posts'), limit(15));
  const snapshot = await getDocs(postsQuery);

  console.log(`Retrieved ${snapshot.size} documents from 'posts' collection.`);

  let approvedCount = 0;
  snapshot.forEach((doc) => {
    const data = doc.data();
    const id = doc.id;
    const category = String(data.category || '').toLowerCase();
    const status = String(data.status || '').toLowerCase();

    if ((status === 'approved' || status === 'published') && category !== 'reel') {
      approvedCount++;
      const domainStory = toDomainStory({ ...data, id });
      console.log(`\n[Story #${approvedCount}] ID: ${domainStory.id}`);
      console.log(`  Title: ${domainStory.title}`);
      console.log(`  Category: ${domainStory.category}`);
      console.log(`  Publisher: ${domainStory.attribution.publisherName}`);
      console.log(`  Original: ${domainStory.attribution.isOriginal}`);
      console.log(`  Quick Summary: ${domainStory.quickBrief.quickSummary?.slice(0, 80)}...`);
      console.log(`  Has Audio: ${domainStory.audioTrack.isAvailable}`);
      if (domainStory.audioTrack.isAvailable) {
        console.log(`  Audio URL: ${domainStory.audioTrack.audioUrl}`);
      }
      console.log(`  Available Languages: ${domainStory.availableLanguages.join(', ')}`);
      console.log(`  Takeaways Count: ${domainStory.fullStory.takeaways.length}`);
      console.log(`  Explore Sections: ${domainStory.fullStory.exploreSections.length}`);
    }
  });

  console.log(`\n✅ Verified: Successfully mapped ${approvedCount} live Breakpoint articles directly from production Firestore!`);
  process.exit(0);
}

verifyLiveFirestore().catch((err) => {
  console.error('❌ Firestore verification failed:', err);
  process.exit(1);
});
