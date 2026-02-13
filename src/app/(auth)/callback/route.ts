import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Cookie setting may fail in certain contexts
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Get the user to create profile if needed
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Check if profile exists
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

        // Create profile if it doesn't exist
        if (!existingProfile) {
          const displayName =
            user.user_metadata.full_name ||
            user.user_metadata.name ||
            user.email?.split("@")[0] ||
            "User";

          const avatarUrl = user.user_metadata.avatar_url || null;

          await supabase.from("profiles").insert({
            id: user.id,
            display_name: displayName,
            avatar_url: avatarUrl,
          });
        }
      }

      return NextResponse.redirect(`${origin}/`);
    }
  }

  // If no code or error, redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
