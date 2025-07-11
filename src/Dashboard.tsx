import { useEffect, useState } from 'react';
import { createClient, Session, User } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ggmsdbfkyscmjesusmsz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdnbXNkYmZreXNjbWplc3VzbXN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxNzM2MzQsImV4cCI6MjA2Nzc0OTYzNH0.gcZRosVQ9AW-WeQ7jdw0kabb9z4aX-pHYURwj3wBF4s'
);

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [violations, setViolations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Get user session on load
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error('[Auth error]', error.message);
        return;
      }

      if (session) {
        setUser(session.user);
      } else {
        console.log('[Dashboard] No user session found.');
      }

      setLoading(false);
    };

    getUser();

    // Also listen for auth changes (e.g., after Google login)
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
      }
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setViolations([]);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // Fetch violations when user is loaded
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      console.log('[Dashboard] Fetching violations for:', user.email);

      const isAdmin = user.email?.includes('@admin');

      const { data, error } = await supabase
        .from('violations')
        .select('*')
        .order('logged_at', { ascending: false });

      if (error) {
        console.error('[Data error]', error.message);
      } else {
        setViolations(isAdmin ? data : data.filter(v => v.email === user.email));
      }

      setLoading(false);
    };

    fetchData();
  }, [user]);

  // Helper: count violations by user
  const countByEmployee = violations.reduce((acc: Record<string, number>, v) => {
    acc[v.email] = (acc[v.email] || 0) + 1;
    return acc;
  }, {});

  // UI for login
  if (!user) {
    return (
      <div style={{ padding: '2rem' }}>
        <h2>Please sign in</h2>
        <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })}>
          Sign in with Google
        </button>
      </div>
    );
  }

  // UI for loading
  if (loading) {
    return <p style={{ padding: '2rem' }}>Loading...</p>;
  }

  // Main dashboard UI
  return (
    <div style={{ padding: '2rem' }}>
      <h2>{user.email?.includes('@admin') ? 'Admin View' : 'My Violations'}</h2>

      <button onClick={() => supabase.auth.signOut()} style={{ marginBottom: '1rem' }}>
        Sign Out
      </button>

      <ul>
        {user.email?.includes('@admin')
          ? Object.entries(countByEmployee).map(([email, count]) => (
              <li key={email}>
                {email}: {count} violations
              </li>
            ))
          : violations.map((v) => (
              <li key={v.event_id + v.email}>
                {new Date(v.start_time).toLocaleString()} — {v.summary}
              </li>
            ))}
      </ul>
    </div>
  );
}
