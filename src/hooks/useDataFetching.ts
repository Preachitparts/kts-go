
"use client";

import { useState, useEffect, useCallback } from 'react';
import { getDocs, Query, DocumentData } from 'firebase/firestore';
import { onAuthStateChanged, getAuth } from 'firebase/auth';

interface FetchResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDataFetching<T>(query: Query<DocumentData>): FetchResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const auth = getAuth();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(query);
      const fetchedData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
      setData(fetchedData);
      setError(null);
    } catch (err: any) {
      console.error("Data fetching error:", err);
      setError(err.message || 'Failed to fetch data.');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchData();
      } else {
        setLoading(false);
        setData([]);
        // Optional: set an error message if you expect a user to be logged in
        // setError("Authentication required.");
      }
    });

    return () => unsubscribe();
  }, [auth, fetchData]);

  return { data, loading, error, refetch: fetchData };
}
