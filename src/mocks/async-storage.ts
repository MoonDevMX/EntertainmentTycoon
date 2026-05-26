const AsyncStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('AsyncStorage set failed', e);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      localStorage.removeItem(key);
    } catch {
      // no-op
    }
  },
  clear: async (): Promise<void> => {
    try {
      localStorage.clear();
    } catch {
      // no-op
    }
  }
};

export default AsyncStorage;
