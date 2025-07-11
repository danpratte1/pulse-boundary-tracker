import { useEffect, useState } from 'react';
import { createClient, User } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ggmsdbfkyscmjesusmsz.supabase.co',
  'YOUR_PUBLIC_ANON_KEY_HERE'
);

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [violations, setViolations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('[Auth Error]', error.message);
      }
      if (!data.session) {
        console.warn('[No Session] User not logged in');
        setLoading(false); // stop loading even if no session
        return;
      }
      setUser(data.session.user);
    };

    getUser();
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      console.log('[Fetching Violations] for', user.email);

      const isAdmin = user.email.includes('@admin');

      const { data, error } = await supabase
        .from('violations')
        .select('*')
        .order('logged_at', { ascending: false });

      if (error) {
        console.error('[Data Fetch Error]', error.message);
      } else {
        setViolations(isAdmin ? data : data.filter(v => v.email === user.email));
      }

      setLoading(false);
    };

    fetchData();
  }, [user]);

  const countByEmployee = violations.reduce((acc: Record<string, number>, v) => {
    acc[v.email] = (acc[v.email] || 0) + 1;
    return acc;
  }, {});

  if (loading) return <p>Loading...</p>;

  if (!user) return <p>No user session found. Are you signed in?</p>;

  return (
    <div style={{ padding: '2rem' }}>
      <h2>{user.email.includes('@admin') ? 'Admin View' : 'My Violations'}</h2>
      <ul>
        {user.email.includes('@admin')
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
