import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";

/* ----------  Supabase  ---------- */
const sb = createClient(
  "https://ggmsdbfkyscmjesusmsz.supabase.co",
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

/* ----------  Google OAuth config  ---------- */
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID!;
const SCOPES = "https://www.googleapis.com/auth/calendar.readonly";

declare global {
  interface Window {
    gapi: any;
  }
}

export default function Dashboard() {
  /* ----------  Local state  ---------- */
  const [user, setUser] = useState<User | null>(null);
  const [violations, setViolations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [gapiReady, setGapiReady] = useState(false);

  /* ----------  1. Check Supabase session ---------- */
  useEffect(() => {
    (async () => {
      const { data, error } = await sb.auth.getSession();
      if (error) console.error("Supabase auth error:", error);
      if (data.session) setUser(data.session.user);
      else console.warn("No user session found.");
      setLoading(false);
    })();
  }, []);

  /* ----------  2. Load / init gapi once ---------- */
  useEffect(() => {
    if (!user) return;

    const initClient = async () => {
      try {
        await window.gapi.client.init({ clientId: CLIENT_ID, scope: SCOPES });
        console.log("✅ GAPI initialised");
        setGapiReady(true);
      } catch (err) {
        console.error("❌ Error initialising gapi", err);
      }
    };

    const onGapiLoad = () => window.gapi.load("client:auth2", initClient);

    // script added in index.html: wait until it's finished
    if (window.gapi) onGapiLoad();
    else
      document
        .getElementById("gapi-loader")
        ?.addEventListener("load", onGapiLoad);
  }, [user]);

  /* ----------  3. Fetch violations from Supabase ---------- */
  useEffect(() => {
    if (!gapiReady || !user) return;

    const fetchViolations = async () => {
      setLoading(true);
      const isAdmin = user.email?.includes("@admin");
      const { data, error } = await sb
        .from("violations")
        .select("*")
        .order("logged_at", { ascending: false });

      if (error) console.error("Supabase query error:", error);
      else setViolations(isAdmin ? data : data.filter(v => v.email === user.email));

      setLoading(false);
    };

    fetchViolations();
  }, [gapiReady, user]);

  /* ----------  Helpers ---------- */
  const counts: Record<string, number> = violations.reduce((acc, v) => {
    acc[v.email] = (acc[v.email] || 0) + 1;
    return acc;
  }, {});

  const signOut = async () => {
    await sb.auth.signOut();
    window.location.reload();
  };

  /* ----------  UI ---------- */
  if (loading) return <p style={{ padding: "2rem" }}>Loading…</p>;

  if (!user)
    return (
      <p style={{ padding: "2rem" }}>
        No session — <a href="/">log in again</a>.
      </p>
    );

  const isAdmin = user.email?.includes("@admin");

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Boundary Tracker</h1>
      <button onClick={signOut}>Sign out</button>

      {isAdmin ? (
        <>
          <h2>Admin dashboard</h2>
          <ul>
            {Object.entries(counts).map(([email, c]) => (
              <li key={email}>
                {email}: <strong>{c}</strong> violations
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <h2>My violations</h2>
          <ul>
            {violations.map(v => (
              <li key={v.event_id + v.email}>
                {new Date(v.start_time).toLocaleString()} — {v.summary}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
