import React, { createContext, useContext, useState, useEffect } from "react";
import { CURRENT_USER } from "@/lib/mockData";
import { User } from "@/lib/types";

interface AuthContextType {
  user: User | null;
  login: () => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate checking for session
    const timer = setTimeout(() => {
      // Check localStorage or just mock persistence
      const storedUser = localStorage.getItem("aniverse_user");
      if (storedUser) {
        setUser(CURRENT_USER);
      }
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const login = () => {
    setIsLoading(true);
    setTimeout(() => {
      setUser(CURRENT_USER);
      localStorage.setItem("aniverse_user", "true");
      setIsLoading(false);
    }, 800);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("aniverse_user");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
