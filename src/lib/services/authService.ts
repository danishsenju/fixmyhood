import { createClient } from "@/lib/supabase/client";

export const authService = {
  /**
   * Sign in with Google OAuth
   */
  async signInWithGoogle() {
    const supabase = createClient();
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/callback`,
      },
    });

    if (error) throw error;
    return data;
  },

  /**
   * Sign out current user
   */
  async signOut() {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /**
   * Get current session
   */
  async getSession() {
    const supabase = createClient();
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  /**
   * Create or update user profile
   */
  async upsertProfile(userId: string, displayName: string, avatarUrl: string | null) {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from("profiles")
      .upsert({
        id: userId,
        display_name: displayName,
        avatar_url: avatarUrl,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};