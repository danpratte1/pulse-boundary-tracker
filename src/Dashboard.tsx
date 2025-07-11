// src/Dashboard.tsx
import { useEffect, useState } from "react";

const CLIENT_ID = "<YOUR_GOOGLE_CLIENT_ID>";
const SCOPES = "https://www.googleapis.com/auth/calendar.readonly";

declare global {
  interface Window {
    gapi: any;
  }
}

export default function Dashboard() {
  const [gapiLoaded, setGapiLoaded] = useState(false);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const loadGapi = () => {
      const script = document.createElement("script");
      script.src = "https://apis.google.com/js/api.js";
      script.onload = () => {
        window.gapi.load("client:auth2", initClient);
      };
      document.body.appendChild(script);
    };

    const initClient = async () => {
      try {
        await window.gapi.client.init({
          clientId: CLIENT_ID,
          scope: SCOPES,
        });
        setGapiLoaded(true);
      } catch (err) {
        console.error("Error initializing gapi", err);
      }
    };

    loadGapi();
  }, []);

  const signInAndFetch = async () => {
    const authInstance = window.gapi.auth2.getAuthInstance();
    const user = await authInstance.signIn();

    const token = user.getAuthResponse().access_token;

    try {
      const response = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=10&singleEvents=true&orderBy=startTime",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      setEvents(data.items || []);
    } catch (err) {
      console.error("Error fetching calendar events", err);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-xl font-bold mb-4">Boundary Tracker</h1>
      <p className="mb-4">
        Connect your Google Calendar – we’ll flag meetings that break boundaries.
      </p>
      <button
        onClick={signInAndFetch}
        className="px-4 py-2 bg-blue-600 text-white rounded"
        disabled={!gapiLoaded}
      >
        Connect Calendar
      </button>

      {events.length > 0 && (
        <div className="mt-8 w-full max-w-xl text-left">
          <h2 className="font-semibold mb-2">Upcoming Events:</h2>
          <ul>
            {events.map((event) => (
              <li key={event.id}>
                {event.summary} — {event.start.dateTime || event.start.date}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
