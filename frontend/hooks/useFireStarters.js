"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchFireStartersForCourse,
  fireStartersNeedImagePolling,
} from "@/lib/fire-starters-api";

/**
 * Load Fire Starters for a course and poll while any image is still generating.
 */
export function useFireStarters(courseId, getToken) {
  const [fireStarters, setFireStarters] = useState(null);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  const refetch = useCallback(async () => {
    if (!courseId || !getToken) return;
    try {
      const data = await fetchFireStartersForCourse(getToken, courseId);
      if (mountedRef.current) {
        setFireStarters(data);
        setError(null);
      }
    } catch (e) {
      if (mountedRef.current) {
        setError(e);
        setFireStarters([]);
      }
    }
  }, [courseId, getToken]);

  useEffect(() => {
    mountedRef.current = true;
    if (!courseId || !getToken) return undefined;
    setFireStarters(null);
    refetch();
    return () => {
      mountedRef.current = false;
    };
  }, [courseId, getToken, refetch]);

  useEffect(() => {
    if (!fireStartersNeedImagePolling(fireStarters)) return undefined;
    const id = setInterval(() => {
      refetch();
    }, 5000);
    return () => clearInterval(id);
  }, [fireStarters, refetch]);

  return {
    fireStarters,
    loading: fireStarters === null && !error,
    error,
    refetch,
  };
}
