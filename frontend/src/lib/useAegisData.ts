import { useState, useEffect, useRef } from "react";
import { type Agent } from "./api";
import { MOCK_AGENTS } from "../data/mockData";

export interface UseAegisDataResult {
  agents: Agent[];
  setAgents: React.Dispatch<React.SetStateAction<Agent[]>>;
  liveMode: boolean;
  setLiveMode: (val: boolean) => void;
  loading: boolean;
  error: string | null;
  dismissError: () => void;
  refresh: () => Promise<void>;
}

export function useAegisData(): UseAegisDataResult {
  const [liveMode, setLiveMode] = useState<boolean>(false);
  const [agents, setAgents] = useState<Agent[]>(MOCK_AGENTS);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Keep a ref to the current liveMode state for access within interval functions
  const liveModeRef = useRef(liveMode);
  useEffect(() => {
    liveModeRef.current = liveMode;
  }, [liveMode]);

  const dismissError = () => {
    setError(null);
  };

  const fetchRealData = async (isInitial: boolean) => {
    const backendUrl = import.meta.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendUrl) {
      return;
    }

    if (isInitial) {
      setLoading(true);
    }

    try {
      const baseUrl = backendUrl.endsWith("/") ? backendUrl.slice(0, -1) : backendUrl;
      const response = await fetch(`${baseUrl}/api/agents`, {
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Server returned status: ${response.status}`);
      }

      const data = (await response.json()) as Agent[];
      
      // Update state seamlessly if liveMode is still active
      if (liveModeRef.current) {
        setAgents(data);
        setError(null);
      }
    } catch (err: any) {
      if (liveModeRef.current) {
        // Silently fallback to mock agents
        setAgents(MOCK_AGENTS);
        setError(err.message || "Failed to fetch from backend");
      }
    } finally {
      if (isInitial) {
        setLoading(false);
      }
    }
  };

  const refresh = async () => {
    await fetchRealData(true);
  };

  // Handle mode transitions (Demo vs Live)
  useEffect(() => {
    if (liveMode) {
      const backendUrl = import.meta.env.NEXT_PUBLIC_BACKEND_URL;
      if (!backendUrl) {
        setAgents(MOCK_AGENTS);
        setError("Backend is unreachable: NEXT_PUBLIC_BACKEND_URL is not set.");
        setLiveMode(false);
        return;
      }
      fetchRealData(true);
    } else {
      setAgents(MOCK_AGENTS);
      setLoading(false);
      setError(null);
    }
  }, [liveMode]);

  // Periodic polling every 10 seconds in Live Mode
  useEffect(() => {
    let intervalId: number | undefined;

    if (liveMode) {
      intervalId = window.setInterval(() => {
        fetchRealData(false);
      }, 10000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [liveMode]);

  return {
    agents,
    setAgents,
    liveMode,
    setLiveMode,
    loading,
    error,
    dismissError,
    refresh,
  };
}
