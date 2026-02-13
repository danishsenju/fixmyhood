"use client";

import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";

interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  points: number;
  is_admin: boolean;
  is_banned: boolean;
  active_frame: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
        return null;
      }

      // If profile doesn't exist, create it
      if (!data) {
        console.log("Profile not found, creating one...");
        const { data: userData } = await supabase.auth.getUser();
        
        if (userData.user) {
          const displayName =
            userData.user.user_metadata.full_name ||
            userData.user.user_metadata.name ||
            userData.user.email?.split("@")[0] ||
            "User";

          const avatarUrl = userData.user.user_metadata.avatar_url || null;

          const { data: newProfile, error: insertError } = await supabase
            .from("profiles")
            .insert({
              id: userId,
              display_name: displayName,
              avatar_url: avatarUrl,
            })
            .select()
            .single();

          if (insertError) {
            console.error("Error creating profile:", insertError);
            return null;
          }

          console.log("Profile created successfully:", newProfile);
          return newProfile;
        }
      }

      return data;
    } catch (err) {
      console.error("Exception in fetchProfile:", err);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Only use onAuthStateChange — it fires INITIAL_SESSION on setup,
    // so a separate getSession() call is unnecessary and causes a race
    // condition on navigator.locks ("AbortError: signal is aborted").
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        if (!mounted) return;

        setUser(session?.user ?? null);

        if (session?.user) {
          const profileData = await fetchProfile(session.user.id);
          if (mounted) {
            // Ban enforcement
            if (profileData?.is_banned) {
              await supabase.auth.signOut();
              setUser(null);
              setProfile(null);
              setLoading(false);
              router.push("/login?error=banned");
              return;
            }
            setProfile(profileData);
          }
        } else {
          setProfile(null);
        }

        if (mounted) {
          setLoading(false);
        }
      } catch (err) {
        console.error("Auth state change error:", err);
        if (mounted) {
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
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