import React, { createContext, useContext, useState, useEffect } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import type { User as SupabaseUser, Session } from "@supabase/supabase-js";

interface Profile {
  id: string;
  username: string;
  email: string;
  name: string;
  handle: string;
  avatar: string;
  bio: string;
  level: number;
  followers: number;
  following: number;
  tokens: number;
  isPremium: boolean;
  isBanned: boolean;
  isAdmin: boolean;
  animeInterests: string[];
  theme: string;
  isOnTrial?: boolean;
  trialStartDate?: string;
  trialEndDate?: string;
  trialUsed?: boolean;
  sclassWelcomeRewardClaimed?: boolean;
  sclassJoinedAt?: string;
  handleChangedAt?: string;
}

interface AuthContextType {
  user: Profile | null;
  supabaseUser: SupabaseUser | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
}

interface SignupData {
  email: string;
  password: string;
  username: string;
  name: string;
  handle: string;
  avatar: string;
  bio?: string;
  animeInterests?: string[];
  theme?: string;
  birthDate?: Date;
  isMinor?: boolean;
  parentEmail?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string, accessToken: string): Promise<Profile | null> => {
    try {
      const response = await fetch(`/api/profiles/${userId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error("Failed to fetch profile:", error);
      return null;
    }
  };

  const refreshUser = async () => {
    try {
      const supabase = await getSupabase();
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (currentSession?.user) {
        setSession(currentSession);
        setSupabaseUser(currentSession.user);
        const profile = await fetchProfile(currentSession.user.id, currentSession.access_token);
        setUser(profile);
      } else {
        setSession(null);
        setSupabaseUser(null);
        setUser(null);
      }
    } catch (error) {
      console.error("Failed to refresh user:", error);
      setSession(null);
      setSupabaseUser(null);
      setUser(null);
    }
  };

  useEffect(() => {
    let mounted = true;
    
    const initAuth = async () => {
      try {
        const supabase = await getSupabase();
        
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (mounted && initialSession?.user) {
          setSession(initialSession);
          setSupabaseUser(initialSession.user);
          const profile = await fetchProfile(initialSession.user.id, initialSession.access_token);
          setUser(profile);
        }
        
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
          if (!mounted) return;
          
          setSession(newSession);
          setSupabaseUser(newSession?.user ?? null);
          
          if (newSession?.user) {
            const profile = await fetchProfile(newSession.user.id, newSession.access_token);
            setUser(profile);
          } else {
            setUser(null);
          }
        });
        
        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error("Auth initialization failed:", error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };
    
    initAuth();
    
    return () => {
      mounted = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const supabase = await getSupabase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (data.session && data.user) {
        setSession(data.session);
        setSupabaseUser(data.user);
        let profile = await fetchProfile(data.user.id, data.session.access_token);
        
        // If profile doesn't exist, create it from user metadata (for email-confirmed users)
        if (!profile && data.user.user_metadata) {
          const metadata = data.user.user_metadata;
          const profileResponse = await fetch("/api/profiles", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${data.session.access_token}`,
            },
            body: JSON.stringify({
              id: data.user.id,
              email: data.user.email,
              username: metadata.username || data.user.email?.split('@')[0],
              name: metadata.name || metadata.username || 'User',
              handle: metadata.handle || `@${metadata.username || data.user.email?.split('@')[0]}`,
              bio: "New to AniRealm",
              animeInterests: [],
              theme: "cyberpunk",
            }),
          });
          
          if (profileResponse.ok) {
            profile = await profileResponse.json();
          }
        }
        
        if (!profile) {
          throw new Error("Profile not found. Please contact support.");
        }
        if (profile.isBanned) {
          await supabase.auth.signOut();
          throw new Error("Account banned");
        }
        setUser(profile);
      }
    } catch (error: any) {
      console.error("Login failed:", error?.message || error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (data: SignupData) => {
    setIsLoading(true);
    try {
      const supabase = await getSupabase();
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            username: data.username,
            name: data.name,
            handle: data.handle,
          },
        },
      });
      
      if (authError) {
        throw new Error(authError.message);
      }
      
      if (!authData.user) {
        throw new Error("Failed to create account");
      }
      
      // Check if email confirmation is required (session will be null)
      if (!authData.session) {
        throw new Error("Please check your email to confirm your account before logging in.");
      }
      
      const profileResponse = await fetch("/api/profiles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authData.session.access_token}`,
        },
        body: JSON.stringify({
          id: authData.user.id,
          email: data.email,
          username: data.username,
          name: data.name,
          handle: data.handle,
          avatar: data.avatar,
          bio: data.bio || "New to AniRealm",
          animeInterests: data.animeInterests || [],
          theme: data.theme || "cyberpunk",
          birthDate: data.birthDate?.toISOString(),
          isMinor: data.isMinor,
          parentEmail: data.parentEmail,
        }),
      });
      
      if (!profileResponse.ok) {
        const errorData = await profileResponse.json();
        throw new Error(errorData.error || "Failed to create profile");
      }
      
      const profile = await profileResponse.json();
      
      setSession(authData.session);
      setSupabaseUser(authData.user);
      setUser(profile);
    } catch (error: any) {
      console.error("Signup failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      const supabase = await getSupabase();
      await supabase.auth.signOut();
      setUser(null);
      setSupabaseUser(null);
      setSession(null);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, supabaseUser, session, login, signup, logout, isLoading, refreshUser }}>
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
