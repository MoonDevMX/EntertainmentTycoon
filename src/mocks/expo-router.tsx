import React, { useState, useEffect, createContext, useContext } from 'react';

// Use a global listener array to support out-of-component navigation via global `router`
type RouteListener = (path: string) => void;
const listeners = new Set<RouteListener>();

let currentPath = '/';
const historyStack: string[] = ['/'];

function resolvePath(target: any): string {
  if (typeof target === 'string') return target;
  if (target && typeof target === 'object' && target.pathname) {
    let path = target.pathname;
    const remainingParams = target.params ? { ...target.params } : {};
    
    // Substitute dynamic route parameters, e.g. [id], [talentId], [movieId]
    if (target.params) {
      Object.entries(target.params).forEach(([key, value]) => {
        const placeholder = `[${key}]`;
        if (path.includes(placeholder)) {
          path = path.replace(placeholder, encodeURIComponent(String(value)));
          delete remainingParams[key];
        }
      });
    }

    const query = Object.entries(remainingParams)
      .filter(([_, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    if (query) {
      path += '?' + query;
    }
    return path;
  }
  return '/';
}

export const router = {
  push: (target: string | { pathname: string; params?: Record<string, any> }) => {
    const path = resolvePath(target);
    historyStack.push(path);
    currentPath = path;
    listeners.forEach((l) => l(path));
  },
  replace: (target: string | { pathname: string; params?: Record<string, any> }) => {
    const path = resolvePath(target);
    if (historyStack.length > 0) {
      historyStack[historyStack.length - 1] = path;
    } else {
      historyStack.push(path);
    }
    currentPath = path;
    listeners.forEach((l) => l(path));
  },
  back: () => {
    if (historyStack.length > 1) {
      historyStack.pop();
      currentPath = historyStack[historyStack.length - 1];
      listeners.forEach((l) => l(currentPath));
    } else {
      router.replace('/dashboard');
    }
  },
  canGoBack: () => historyStack.length > 1,
};

export function useRouter() {
  const [path, setPath] = useState(currentPath);

  useEffect(() => {
    const listener = (newPath: string) => {
      setPath(newPath);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return router;
}

export function usePathname() {
  const [path, setPath] = useState(currentPath);

  useEffect(() => {
    const listener = (newPath: string) => {
      setPath(newPath);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return path;
}

export function useLocalSearchParams<T extends Record<string, string> = Record<string, string>>(): T {
  const path = usePathname();
  const params: any = {};

  const [pathWithoutQuery, queryString] = path.split('?');
  const segments = (pathWithoutQuery || '').split('/').filter(Boolean);

  if (segments[0] === 'movie' && segments[1]) {
    params.id = decodeURIComponent(segments[1]);
  } else if (segments[0] === 'marketing' && segments[1]) {
    params.movieId = decodeURIComponent(segments[1]);
    params.id = decodeURIComponent(segments[1]);
  } else if (segments[0] === 'negotiate' && segments[1]) {
    params.talentId = decodeURIComponent(segments[1]);
    params.id = decodeURIComponent(segments[1]);
  } else if (segments[0] === 'franchise' && segments[1]) {
    params.id = decodeURIComponent(segments[1]);
  } else if (segments[0] === 'series' && segments[1]) {
    params.id = decodeURIComponent(segments[1]);
  } else if (segments[0] === 'streaming' && segments[1]) {
    params.id = decodeURIComponent(segments[1]);
  } else if (segments[0] === 'studio' && segments[1]) {
    params.id = decodeURIComponent(segments[1]);
  } else if (segments[0] === 'talent' && segments[1]) {
    params.id = decodeURIComponent(segments[1]);
  }

  if (queryString) {
    const parts = queryString.split('&');
    for (const part of parts) {
      if (!part) continue;
      const [k, v] = part.split('=');
      if (k) {
        params[decodeURIComponent(k)] = decodeURIComponent(v || '');
      }
    }
  }

  return params;
}

// Dummy export to satisfy layouts. E.g. <Stack />
export const Stack = ({ children }: any) => {
  return <>{children}</>;
};

Stack.Screen = ({ name, options }: any) => null;
