import type { PlatformUserRecord } from '../../types/platform';
import type { User } from '../../types/domain';

export function toDomainUser(record: PlatformUserRecord): User {
  const roleRaw = (record.role || 'student').toLowerCase();
  const role: User['role'] = ['creator', 'admin', 'editor'].includes(roleRaw)
    ? (roleRaw as User['role'])
    : 'student';

  const isStaff = role === 'admin' || role === 'editor' || role === 'creator' ||
    record.email?.toLowerCase() === 'manasvig43@gmail.com';

  return {
    uid: record.uid,
    name: record.name || record.fullName || 'Student',
    email: record.email || null,
    photoUrl: record.photoUrl || record.avatarUrl || null,
    bio: record.bio || '',
    role,
    isStaff,
    department: record.department || null,
    yearOfStudy: record.yearOfStudy || null,
    interests: Array.isArray(record.interests) ? record.interests : [],
    followersCount: record.followersCount ?? (Array.isArray(record.followers) ? record.followers.length : 0),
    followingCount: record.followingCount ?? (Array.isArray(record.following) ? record.following.length : 0),
    connectionCode: record.connectionCode || null,
  };
}
