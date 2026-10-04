import { useEffect, useState, useSyncExternalStore } from "react";
import { bridge } from "./bridge";

export function useGains() {
  const snapshot = useSyncExternalStore(
    bridge.subscribe,
    bridge.getSnapshot,
    bridge.getSnapshot,
  );
  return { ...snapshot, bridge };
}

export function useInitializeGains() {
  const [state, setState] = useState<{ ready: boolean; error?: string }>({
    ready: false,
  });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let mounted = true;
    bridge
      .initialize()
      .then(() => {
        if (mounted) setState({ ready: true });
      })
      .catch((error) => {
        if (mounted)
          setState({ ready: false, error: String(error?.message ?? error) });
      });
    return () => {
      mounted = false;
    };
  }, [attempt]);
  return {
    ...state,
    retry: () => {
      setState({ ready: false });
      setAttempt((value) => value + 1);
    },
  };
}
