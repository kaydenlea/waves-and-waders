import { redirect } from "next/navigation";

import BeachCard from "@/components/general/BeachCard";
import { getServerSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

interface FavoriteBeachRow {
  id: string;
  Name: string;
  COUNTY: string | null;
  LATITUDE: number | string | null;
  LONGITUDE: number | string | null;
}

const toNumber = (value: number | string | null): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export default async function FavoritesPage() {
  const supabase = await getServerSupabase();
  const {
    data: sessionData,
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError) {
    console.error("Failed to load session", sessionError);
  }

  const user = sessionData.session?.user ?? null;

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/favorites")}`);
  }

  const { data: favorites, error } = await supabase
    .from("user_favorite_beaches")
    .select("beach_id")
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to load favorites:", error);
  }

  const favoriteIds = (favorites ?? []).map((row) => row.beach_id);

  let favoriteBeaches: FavoriteBeachRow[] = [];
  if (favoriteIds.length > 0) {
    const { data: beachRows, error: beachError } = await supabase
      .from("beaches")
      .select("id, Name, COUNTY, LATITUDE, LONGITUDE")
      .in("id", favoriteIds);

    if (beachError) {
      console.error("Failed to load favorite beach details:", beachError);
    } else {
      favoriteBeaches = (beachRows ?? []) as FavoriteBeachRow[];
    }
  }

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-16">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">
          Favorite beaches
        </h1>
        <p className="text-muted-foreground">
          Save beaches from the overview, forecast, or browse views to build
          your personal list.
        </p>
      </header>

      {favoriteBeaches.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-border/60 p-10 text-center text-muted-foreground">
          You haven&rsquo;t saved any beaches yet. Tap the heart on a beach to
          add it to your favorites.
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-3 @min-md:grid-cols-2 @min-3xl:grid-cols-3">
          {favoriteBeaches.map((beach) => {
            const lat = toNumber(beach.LATITUDE);
            const lon = toNumber(beach.LONGITUDE);
            return (
              <BeachCard
                key={beach.id}
                b={{
                  id: beach.id.toString(),
                  name: beach.Name,
                  region: beach.COUNTY ?? "",
                  coords: [
                    lat ?? 0,
                    lon ?? 0,
                  ],
                  image: "",
                  conditions: {
                    surf: "-",
                    wind: "-",
                    temp: 0,
                    rating: 0,
                  },
                }}
                isFav
              />
            );
          })}
        </section>
      )}
    </main>
  );
}
