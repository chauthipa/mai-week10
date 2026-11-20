import type { createClient } from "./server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

type TeamMember = {
  user_id: string;
  role: "leader" | "member";
  profile: { display_name: string } | null;
};

export function readMembership(supabase: Supabase, userId: string) {
  return supabase
    .from("team_members")
    .select("team_id, role")
    .eq("user_id", userId)
    .maybeSingle();
}

export function readTeamMembers(supabase: Supabase, teamId: string) {
  return readAllPages(
    (after) => {
      const query = supabase.from("team_members")
        .select("user_id, role, profile:profiles(display_name)")
        .eq("team_id", teamId)
        .order("user_id")
        .limit(500);
      return (after ? query.gt("user_id", after) : query)
        .overrideTypes<TeamMember[], { merge: false }>();
    },
    (member) => member.user_id,
  );
}

export async function readAllPages<Row>(
  readPage: (after: string | undefined) => PromiseLike<{
    data: Row[] | null;
    error: unknown;
  }>,
  cursorFor: (row: Row) => string,
) {
  const rows: Row[] = [];
  let after: string | undefined;

  // Keep reading past the API's per-response row limit.
  for (;;) {
    const { data, error } = await readPage(after);
    if (error || !data) return null;

    const last = data.at(-1);
    if (!last) return rows;

    rows.push(...data);
    after = cursorFor(last);
  }
}
