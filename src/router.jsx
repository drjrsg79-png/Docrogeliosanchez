import { createContext, useContext, useEffect, useState } from "react";

const RouterContext = createContext({ path: "/", search: "", navigate: () => {} });

const readLocation = () => ({
  path: window.location.pathname,
  search: window.location.search,
});

export function RouterProvider({ children }) {
  const [location, setLocation] = useState(readLocation);

  useEffect(() => {
    const onPop = () => setLocation(readLocation());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function navigate(to, { replace = false } = {}) {
    if (to === window.location.pathname + window.location.search) return;
    window.history[replace ? "replaceState" : "pushState"]({}, "", to);
    setLocation(readLocation());
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  return (
    <RouterContext.Provider value={{ ...location, navigate }}>{children}</RouterContext.Provider>
  );
}

export const useRouter = () => useContext(RouterContext);

export function Link({ to, children, className, ...rest }) {
  const { navigate } = useRouter();
  return (
    <a
      href={to}
      className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        navigate(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

/** Compara la ruta actual con un patrón tipo "/curso/:slug". */
export function match(pattern, path) {
  const p = pattern.split("/").filter(Boolean);
  const c = path.split("/").filter(Boolean);
  if (p.length !== c.length) return null;
  const params = {};
  for (let i = 0; i < p.length; i += 1) {
    if (p[i].startsWith(":")) params[p[i].slice(1)] = decodeURIComponent(c[i]);
    else if (p[i] !== c[i]) return null;
  }
  return params;
}
