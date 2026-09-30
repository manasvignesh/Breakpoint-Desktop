import {
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from './firebase';
import { toDomainUser } from './mappers/userMapper';
import type { User } from '../types/domain';
import type { PlatformUserRecord } from '../types/platform';

/**
 * Executes a follow/unfollow toggle using the exact production transaction
 * mechanism used by the Flutter mobile app (firebase_user_repository.dart).
 */
export async function toggleFollowUser(
  callerUid: string,
  targetUserId: string,
  follow: boolean,
): Promise<void> {
  if (!callerUid || !targetUserId || callerUid === targetUserId) {
    return;
  }

  const currentUserRef = doc(db, 'users', callerUid);
  const targetUserRef = doc(db, 'users', targetUserId);
  const followRef = doc(db, 'follows', `${callerUid}_${targetUserId}`);

  await runTransaction(db, async (transaction) => {
    const currentSnapshot = await transaction.get(currentUserRef);
    const targetSnapshot = await transaction.get(targetUserRef);
    const followSnapshot = await transaction.get(followRef);

    if (!currentSnapshot.exists() || !targetSnapshot.exists()) {
      throw new Error('User document not found.');
    }

    const currentData = currentSnapshot.data() as PlatformUserRecord;
    const targetData = targetSnapshot.data() as PlatformUserRecord;
    const following = Array.isArray(currentData.following) ? currentData.following : [];
    const followers = Array.isArray(targetData.followers) ? targetData.followers : [];

    const alreadyFollowing =
      followSnapshot.exists() &&
      following.includes(targetUserId) &&
      followers.includes(callerUid);

    if (alreadyFollowing === follow) return;

    if (follow) {
      transaction.set(followRef, {
        followerId: callerUid,
        targetUserId: targetUserId,
        createdAt: serverTimestamp(),
      });
      transaction.update(currentUserRef, {
        following: arrayUnion(targetUserId),
        followingCount: increment(1),
      });
      transaction.update(targetUserRef, {
        followers: arrayUnion(callerUid),
        followersCount: increment(1),
      });
    } else {
      transaction.delete(followRef);
      transaction.update(currentUserRef, {
        following: arrayRemove(targetUserId),
        followingCount: increment(-1),
      });
      transaction.update(targetUserRef, {
        followers: arrayRemove(callerUid),
        followersCount: increment(-1),
      });
    }
  });
}

/**
 * Streams the list of followed users for the current user.
 */
export function subscribeToFollowing(
  userId: string,
  onData: (followingUsers: User[]) => void,
  onError: (err: Error) => void,
) {
  const userDocRef = doc(db, 'users', userId);

  return onSnapshot(
    userDocRef,
    async (snapshot) => {
      if (!snapshot.exists()) {
        onData([]);
        return;
      }
      const data = snapshot.data() as PlatformUserRecord;
      const followingUids = Array.isArray(data.following) ? data.following : [];

      if (followingUids.length === 0) {
        onData([]);
        return;
      }

      // Fetch profiles in chunks of 10 for Firestore 'in' limitation
      const users: User[] = [];
      for (let i = 0; i < followingUids.length; i += 10) {
        const chunk = followingUids.slice(i, i + 10);
        try {
          const userQueries = chunk.map((uid) => getDoc(doc(db, 'users', uid)));
          const userSnapshots = await Promise.all(userQueries);
          userSnapshots.forEach((snap) => {
            if (snap.exists()) {
              users.push(toDomainUser({ ...snap.data(), uid: snap.id }));
            }
          });
        } catch (error) {
          console.warn('[FollowService] Error fetching following profiles:', error);
        }
      }

      onData(users);
    },
    (error) => {
      console.error('[FollowService] Following subscription error:', error);
      onError(error);
    },
  );
}

/**
 * Checks whether the caller is following a target user.
 */
export async function isFollowingUser(
  callerUid: string,
  targetUserId: string,
): Promise<boolean> {
  if (!callerUid || !targetUserId || callerUid === targetUserId) return false;
  const followRef = doc(db, 'follows', `${callerUid}_${targetUserId}`);
  const snap = await getDoc(followRef);
  return snap.exists();
}
