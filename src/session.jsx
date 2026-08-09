import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "./api.js";

const SessionContext = createContext({
  user: null,
  loading: true,
  setUser: () => {},
  refresh: () => {},
});

export const useSession = () => useContext(SessionContext);

export function SessionProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { user: current } = await api.me();
      setUser(current || null);
    } catch {
      setUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <SessionContext.Provider value={{ user, loading, setUser, refresh }}>
      {children}
    </SessionContext.Provider>
  );
}
