import { useEffect, useState } from 'react';
import { subscribeToPublishedArticles } from '../services/articleService';
import { useAuth } from '../contexts/AuthContext';
import type { Story } from '../types/domain';

export function useArticles(preferredLanguage = 'en') {
  const { firebaseUser } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const unsubscribe = subscribeToPublishedArticles(
      (data) => {
        setStories(data);
        setIsLoading(false);
      },
      (err) => {
        setError(err);
        setIsLoading(false);
      },
      preferredLanguage,
      firebaseUser?.uid,
    );

    return () => unsubscribe();
  }, [preferredLanguage, firebaseUser?.uid]);

  return { stories, isLoading, error };
}
