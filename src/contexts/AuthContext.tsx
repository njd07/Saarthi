import React, { createContext, useContext, useEffect, useState } from "react";
import { getToken, setToken, clearToken, authFetch } from "@/lib/auth";

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  jobTitle?: string | null;
}

export interface Profile {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  job_title: string | null;
  created_at: string;
  updated_at: string;
  id: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }
    try {
      const r = await authFetch("/api/auth/me");
      if (!r.ok) {
        clearToken();
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      const data = await r.json();
      const u = data.user;
      setUser({
        id: u.id,
        email: u.email,
        fullName: u.fullName,
      });
      setProfile({
        user_id: u.id,
        full_name: u.fullName,
        avatar_url: u.avatarUrl || null,
        job_title: u.jobTitle || null,
        created_at: "",
        updated_at: "",
        id: u.id,
      });
    } catch {
      clearToken();
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const r = await authFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, fullName }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Signup failed");
    setToken(data.token);
    setUser({ id: data.user.id, email: data.user.email, fullName: data.user.fullName });
    setProfile({
      user_id: data.user.id,
      full_name: data.user.fullName,
      avatar_url: null,
      job_title: null,
      created_at: "",
      updated_at: "",
      id: data.user.id,
    });
  };

  const signIn = async (email: string, password: string) => {
    const r = await authFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Login failed");
    setToken(data.token);
    setUser({ id: data.user.id, email: data.user.email, fullName: data.user.fullName });
    setProfile({
      user_id: data.user.id,
      full_name: data.user.fullName,
      avatar_url: null,
      job_title: null,
      created_at: "",
      updated_at: "",
      id: data.user.id,
    });
  };

  const signOut = async () => {
    clearToken();
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    await fetchMe();
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
