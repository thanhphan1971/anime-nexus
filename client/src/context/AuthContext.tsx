import React, { createContext, useContext, useEffect, useRef, useState } from "react";
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
  isMinor?: boolean;
  ageBand?: string;
  parentEmail?: string;
  parentalConsentGiven?: boolean;
  subscriptionStatus?: string;
  subscriptionPlan?: string;
  premiumEndDate?: string;
  stripeCustomerId?: string;
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Fetch the logged-in user's profile from your API.
 * Uses AbortSignal so we can cancel old requests and prevent race-condition state bugs.
 */
async function fetchProfile(accessToken: string, signal?: AbortSignal): Promise<Profile | null> {
  try {
    const response = await fetch("/api/profiles/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal,
    });

    if (response.status === 404) return null;
    if (response.ok) return await response.json();

    const text = await response.text().catch(() => "");
    console.error("Failed to fetch profile:", response.status, text);
    return null;
  } catch (err: any) {
    if (err?.name === "AbortError") return null;
    console.error("Failed to fetch profile:", err);
    return null;
  }
}

/**
 * Create a profile if it doesn't exist yet (common in preview/dev).
 * IMPORTANT: do NOT send avatar: "" (backend may validate avatar as URL).
 */
async function createProfileFromSession(accessToken: string, u: SupabaseUser): Promise<Profile | null> {
  try {
    const md: any = u.user_metadata || {};
    const username = md.username || u.email?.split("@")[0] || "user";
    const handle = md.handle || `@${username}`;

    const payload: any = {
      id: u.id,
      email: u.email,
      username,
      name: md.name || md.username || "User",
      handle,
      bio: "New to AniRealm",
      animeInterests: [],
      theme: md.theme || "cyberpunk",
    };

    // Only include avatar if it exists and is not empty (and ideally is a real URL)
    if (typeof md.avatar === "string" && md.avatar.trim() !== "") {
      payload.avatar = md.avatar.trim();
    }

    const res = await fetch("/api/profiles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("Failed to create profile:", res.status, text);
      return null;
    }

    return await res.json();
  } catch (err) {
    console.error("Failed to create profile:", err);
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cancels in-flight profile requests so older responses can't overwrite newer state.
  const profileAbortRef = useRef<AbortController | null>(null);

  const applySession = async (newSession: Session | null) => {
    setSession(newSession);
    setSupabaseUser(newSession?.user ?? null);

    // cancel any previous profile fetch
    profileAbortRef.current?.abort();
    profileAbortRef.current = new AbortController();

    if (!newSession?.access_token) {
      setUser(null);
      return;
    }

    // 1) Try to load profile
    let profile = await fetchProfile(newSession.access_token, profileAbortRef.current.signal);

    // 2) If missing (404), auto-create from session + metadata
    if (!profile && newSession.user) {
      profile = await createProfileFromSession(newSession.access_token, newSession.user);
    }

    // 3) Still missing: keep session but user stays null (avoid hard logout loops)
    if (!profile) {
      setUser(null);
      return;
    }

    // Optional: auto-signout banned users
    if (profile.isBanned) {
      try {
        const supabase = await getSupabase();
        await supabase.auth.signOut();
      } catch {}
      setUser(null);
      setSession(null);
      setSupabaseUser(null);
      return;
    }

    setUser(profile);
  };

  const refreshUser = async () => {
    try {
      const supabase = await getSupabase();
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      await applySession(data.session ?? null);
    } catch (err) {
      console.error("Failed to refresh user:", err);
      setUser(null);
      setSession(null);
      setSupabaseUser(null);
    }
  };

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | null = null;

    (async () => {
      try {
        const supabase = await getSupabase();

        // 1) Load existing session on boot
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!mounted) return;
        await applySession(data.session ?? null);

        // 2) Listen to future auth changes (and properly unsubscribe on cleanup)
        const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
          if (!mounted) return;
          await applySession(newSession ?? null);
        });

        unsubscribe = () => listener.subscription.unsubscribe();
      } catch (err) {
        console.error("Auth initialization failed:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
      profileAbortRef.current?.abort();
      unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const supabase = await getSupabase();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);

      // applySession will fetch profile and auto-create if missing
      await applySession(data.session ?? null);
    } catch (err: any) {
      console.error("Login failed:", err?.message || err);
      throw err;
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
            ...(data.avatar?.trim() ? { avatar: data.avatar.trim() } : {}),
            theme: data.theme,
          },
        },
      });

      if (authError) throw new Error(authError.message);
      if (!authData.user) throw new Error("Failed to create account");

      // If email confirmation is ON, session is null.
      // Not a failure; UI should show "Check your email".
      if (!authData.session) {
        return;
      }

      // Create profile now that we have a session token
      const profilePayload: any = {
        id: authData.user.id,
        email: data.email,
        username: data.username,
        name: data.name,
        handle: data.handle,
        bio: data.bio || "New to AniRealm",
        animeInterests: data.animeInterests || [],
        theme: data.theme || "cyberpunk",
        birthDate: data.birthDate?.toISOString(),
        isMinor: data.isMinor,
        parentEmail: data.parentEmail,
      };

      if (data.avatar?.trim()) {
        profilePayload.avatar = data.avatar.trim();
      }

      const profileResponse = await fetch("/api/profiles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authData.session.access_token}`,
        },
        body: JSON.stringify(profilePayload),
      });

      if (!profileResponse.ok) {
        const text = await profileResponse.text().catch(() => "");
        throw new Error(`Failed to create profile: ${profileResponse.status} ${text}`);
      }

      const profile = await profileResponse.json();

      await applySession(authData.session);
      setUser(profile);
    } catch (err: any) {
      console.error("Signup failed:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      const supabase = await getSupabase();
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      profileAbortRef.current?.abort();
      setUser(null);
      setSupabaseUser(null);
      setSession(null);
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
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
