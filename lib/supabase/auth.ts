import { cache } from "react";
import { hasSupabaseConfig } from "./env";
import { createClient } from "./server";

// Share the session check between server components for the current request.
export const readAccount = cache(async () => {
  if (!hasSupabaseConfig) return { status: "unavailable" } as const;

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (user) return { status: "signed-in", user, supabase } as const;
  if (!error || error.name === "AuthSessionMissingError" ||
      error.status === 401 || error.status === 403) {
    return { status: "signed-out" } as const;
  }
  return { status: "unavailable" } as const;
});
