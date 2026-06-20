import React, { createContext, useContext, useEffect, useState } from "react";
import { useUser, useAuth as useClerkAuth } from "@clerk/clerk-react";
import { setTokenProvider } from "@/lib/auth";

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
  signUp: () => Promise<void>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user: clerkUser, isLoaded: userLoaded } = useUser();
  const { signOut: clerkSignOut, isLoaded: authLoaded, getToken } = useClerkAuth();

  useEffect(() => {
    setTokenProvider(getToken);
  }, [getToken]);

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const loading = !userLoaded || !authLoaded;

  useEffect(() => {
    if (clerkUser) {
      setUser({
        id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress || "",
        fullName: clerkUser.fullName || "User",
        avatarUrl: clerkUser.imageUrl,
      });
      setProfile({
        user_id: clerkUser.id,
        full_name: clerkUser.fullName || "User",
        avatar_url: clerkUser.imageUrl || null,
        job_title: null,
        created_at: "",
        updated_at: "",
        id: clerkUser.id,
      });
    } else {
      setUser(null);
      setProfile(null);
    }
  }, [clerkUser]);

  const dummyAsync = async () => {};

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      signUp: dummyAsync, 
      signIn: dummyAsync, 
      signOut: () => clerkSignOut(), 
      refreshProfile: dummyAsync 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
