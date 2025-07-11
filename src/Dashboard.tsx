import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import type {User } from '@supabase/supabase-js'; // ⬅ type-only import ✅

/* ────────────────────────────────────────────────────────────────── */
/* Supabase initialisation                                            */
/* ────────────────────────────────────────────────────────────────── */
const supabaseUrl  = 'https://ggmsdbfkyscmjesusmsz.supabase.co';
const supabaseAnon = 'eyJh...BF4s';            // ← keep your anon key
const sb = createClient(supabaseUrl, supabaseAnon);

/* ────────────────────────────────────────────────────────────────── */
/* Component                                                          */
/* ────────────────────────────────────────────────────────────────── */
export default function Dashboard() {
  const [user, setUser]           = useState<User | null>(null);
  const [violations, setViolations] = useState<any[]>([]);
  const [loading, setLoading]     = useState<boolean>(true);

  /* 1️⃣  Get current session (runs once) */
  useEffect(() => {
    const init = async () => {
      const { data, error } = await sb.auth.getSession();
      if (error) console.error('Auth error →', error.message);
      setUser(data.session?.user ?? null);
      setLoading(false);
    };
    init();
  }, []);

  /* 2️⃣  Fetch violations whenever `user` changes */
  useEffect(() => {
    if (!user) return;

    const fetchViolations = async () => {
      setLoading(true);
      const isAdmin = user.email?.includes('@admin');

      const { data, error } = await sb
        .from('violations')
        .select('*')
        .order('logged_at', { ascending: false });

      if (error) console.error('Data error →', error.message);
      else setViolations(isAdmin ? data : data.filter(v => v.email === user.email));

      setLoading(false);
    };

    fetchViolations();
  }, [user]);

  /* 3️⃣  Derived data (admin only) */
  const counts = violations.reduce<Record<string, number>>((acc, v) => {
    acc[v.email] = (acc[v.email] ?? 0) + 1;
    return acc;
  }, {});

  /* 4️⃣  Sign-in / sign-out helpers */
  const signIn = () => sb.auth.signInWithOAuth({ provider: 'google' });
  const signOut = () => sb.auth.signOut();

  /* ──────────────────────────────────────────────────────────────── */
  /* Render                                                          */
  /* ──────────────────────────────────────────────────────────────── */
  if (loading) return <p style={{ padding: '2rem' }}>Loading…</p>;

  if (!user)
    return (
      <div style={{ padding: '2rem' }}>
        <button onClick={signIn}>Connect Google&nbsp;Account</button>
      </div>
    );

  const isAdmin = user.email?.includes('@admin');

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h2>{isAdmin ? 'Admin View' : 'My Violations'}</h2>

      {isAdmin ? (
        <ul>
          {Object.entries(counts).map(([email, count]) => (
            <li key={email}>
              {email}: <strong>{count}</strong> violation{count !== 1 && 's'}
            </li>
          ))}
        </ul>
      ) : (
        <ul>
          {violations.map(v => (
            <li key={v.event_id + v.email}>
              {new Date(v.start_time).toLocaleString()} – {v.summary}
            </li>
          ))}
        </ul>
      )}

      <button style={{ marginTop: '1rem' }} onClick={signOut}>
        Sign&nbsp;out
      </button>
    </div>
  );
}
