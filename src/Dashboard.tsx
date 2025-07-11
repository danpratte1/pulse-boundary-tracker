import { useEffect, useState } from 'react';
import { createClient, Session, User } from '@supabase/supabase-js';

// ---------------------
// 1️⃣  Supabase client
// ---------------------
const supabase = createClient(
  'https://ggmsdbfkyscmjesusmsz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdnbXNkYmZreXNjbWplc3VzbXN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxNzM2MzQsImV4cCI6MjA2Nzc0OTYzNH0.gcZRosVQ9AW-WeQ7jdw0kabb9z4aX-pHYURwj3wBF4s'
);

// ---------------------
// 2️⃣  Component
// ---------------------
export default function Dashboard() {
  const [user, setUser]               = useState<User | null>(null);
  const [violations, setViolations]   = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);

  // ---------------------------------
  // 3️⃣  Effect: get Supabase session
  // ---------------------------------
  useEffect(() => {
    console.log('[Dashboard] useEffect → getSession()');
    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (data.session) {
          setUser(data.session.user);
          console.log('[Dashboard] user loaded:', data.session.user.email);
        } else {
          console.log('[Dashboard] no session found');
        }
      } catch (err) {
        console.error('[Dashboard] auth error:', err);
      } finally {
        setLoading(false); // stop “global” spinner even if no user
      }
    })();
  }, []);

  // ---------------------------------
  // 4️⃣  Effect: fetch violations
  // ---------------------------------
  useEffect(() => {
    if (!user) return;
    console.log('[Dashboard] fetching violations…');
    setLoading(true);

    (async () => {
      try {
        const { data, error } = await supabase
          .from('violations')
          .select('*')
          .order('logged_at', { ascending: false });

        if (error) throw error;

        const isAdmin = user.email.includes('@admin');
        const visible = isAdmin ? data : data.filter(v => v.email === user.email);

        console.log(`[Dashboard] rows visible: ${visible.length}`);
        setViolations( visible );
      } catch (err) {
        console.error('[Dashboard] data error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  // ---------------------------------
  // 5️⃣  Helpers
  // ---------------------------------
  const countByEmployee = violations.reduce<Record<string, number>>((acc, v) => {
    acc[v.email] = (acc[v.email] || 0) + 1;
    return acc;
  }, {});

  // ---------------------------------
  // 6️⃣  Render
  // ---------------------------------
  if (loading) return <p>Loading…</p>;

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h2 style={{ marginBottom: '1rem' }}>
        {user?.email.includes('@admin') ? 'Admin View' : 'My Violations'}
      </h2>

      {user?.email.includes('@admin') ? (
        <ul>
          {Object.entries(countByEmployee).map(([email, count]) => (
            <li key={email}>
              <strong>{email}</strong>: {count} violation{count !== 1 ? 's' : ''}
            </li>
          ))}
        </ul>
      ) : (
        <ul>
          {violations.map(v => (
            <li key={v.event_id + v.email}>
              {new Date(v.start_time).toLocaleString()} — {v.summary}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
