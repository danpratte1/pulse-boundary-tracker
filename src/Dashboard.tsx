import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ggmsdbfkyscmjesusmsz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdnbXNkYmZreXNjbWplc3VzbXN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxNzM2MzQsImV4cCI6MjA2Nzc0OTYzNH0.gcZRosVQ9AW-WeQ7jdw0kabb9z4aX-pHYURwj3wBF4s'
);

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [violations, setViolations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) {
        console.error('Auth error:', error);
        return;
      }
      if (session) setUser(session.user);
    };

    getUser();
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);

      const isAdmin = user.email.includes('@admin');

      const { data, error } = await supabase
        .from('violations')
        .select('*')
        .order('logged_at', { ascending: false });

      if (error) console.error('Data error:', error);
      else setViolations(isAdmin ? data : data.filter(v => v.email === user.email));

      setLoading(false);
    };

    fetchData();
  }, [user]);

  const countByEmployee = violations.reduce((acc: Record<string, number>, v) => {
    acc[v.email] = (acc[v.email] || 0) + 1;
    return acc;
  }, {});

  if (loading) return <p>Loading...</p>;

  return (
    <div style={{ padding: '2rem' }}>
      <h2>{user?.email.includes('@admin') ? 'Admin View' : 'My Violations'}</h2>
      <ul>
        {user?.email.includes('@admin')
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
