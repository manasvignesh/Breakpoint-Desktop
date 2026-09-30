import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, limit, query, where, doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDucWzTVZomZYsXyWZ83ygCSJOCArOBzIs",
  authDomain: "cie-connect.firebaseapp.com",
  projectId: "cie-connect",
  storageBucket: "cie-connect.firebasestorage.app",
  messagingSenderId: "226102698550",
  appId: "1:226102698550:web:453d7032cec3231a6dee97",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function inspect() {
  console.log("=== FIREBASE & FIRESTORE INSPECTION ===");

  // 1. Inspect articles
  console.log("\n1. Querying posts (limit 10)...");
  try {
    const postsSnap = await getDocs(query(collection(db, "posts"), limit(10)));
    console.log(`Found ${postsSnap.docs.length} posts.`);
    postsSnap.docs.forEach((d) => {
      const data = d.data();
      console.log(`- ID: ${d.id} | Status: ${data.status} | Category: ${data.category} | Title: ${data.quick_brief?.headline || data.title || data.headline}`);
      if (data.languages) {
        console.log(`  Languages: ${Object.keys(data.languages).join(", ")}`);
        for (const [lang, loc] of Object.entries(data.languages)) {
          console.log(`    [${lang}] translation: ${loc.translationStatus || loc.status}, audio: ${loc.audioStatus}, url: ${loc.audioUrl ? "YES" : "NO"}`);
        }
      }
      if (data.bookmarkedBy) {
        console.log(`  bookmarkedBy (${data.bookmarkedBy.length}):`, data.bookmarkedBy.slice(0, 3));
      }
    });
  } catch (err) {
    console.error("Error querying posts:", err.message);
  }

  // 2. Query users
  console.log("\n2. Querying users (limit 5)...");
  try {
    const usersSnap = await getDocs(query(collection(db, "users"), limit(5)));
    console.log(`Found ${usersSnap.docs.length} users.`);
    usersSnap.docs.forEach((d) => {
      const u = d.data();
      console.log(`- User ID: ${d.id} | Name: ${u.name || u.displayName} | Email: ${u.email} | Role: ${u.role} | Followers: ${u.followersCount ?? u.followers?.length ?? 0} | Following: ${u.followingCount ?? u.following?.length ?? 0}`);
    });
  } catch (err) {
    console.error("Error querying users:", err.message);
  }

  // 3. Query notifications
  console.log("\n3. Querying notifications (limit 5)...");
  try {
    const notifsSnap = await getDocs(query(collection(db, "notifications"), limit(5)));
    console.log(`Found ${notifsSnap.docs.length} notifications.`);
    notifsSnap.docs.forEach((d) => {
      const n = d.data();
      console.log(`- Notif ID: ${d.id} | User: ${n.userId} | Title: ${n.title} | Type: ${n.type} | Read: ${n.isRead} | ContentId: ${n.contentId || n.postId}`);
    });
  } catch (err) {
    console.error("Error querying notifications:", err.message);
  }

  // 4. Query follows
  console.log("\n4. Querying follows (limit 5)...");
  try {
    const followsSnap = await getDocs(query(collection(db, "follows"), limit(5)));
    console.log(`Found ${followsSnap.docs.length} follows.`);
    followsSnap.docs.forEach((d) => {
      const f = d.data();
      console.log(`- Follow Doc: ${d.id} | Follower: ${f.followerId} | Following: ${f.followingId}`);
    });
  } catch (err) {
    console.error("Error querying follows:", err.message);
  }
}

inspect().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
