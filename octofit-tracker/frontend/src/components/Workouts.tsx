import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

const suggestionUserEmail = 'mona@example.com';

type Workout = {
  _id?: string;
  title: string;
  focus?: string;
  minutes?: number;
  difficulty?: string;
  reason?: string;
};

export default function Workouts() {
  const [suggestions, setSuggestions] = useState<Workout[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    const userEmail = encodeURIComponent(suggestionUserEmail);
    void getJson<{ suggestions: Workout[] }>(`/api/workouts/suggestions/${userEmail}`)
      .then(({ suggestions: result }) => {
        if (active) setSuggestions(result);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">Workout suggestions</h2>
        <p>Recommend workouts from activity patterns.</p>
        {failed ? (
          <p role="alert">Unable to load workout suggestions.</p>
        ) : suggestions === null ? (
          <p role="status">Loading workout suggestions...</p>
        ) : suggestions.length === 0 ? (
          <p>No workout suggestions yet.</p>
        ) : (
          <ul className="list-group list-group-flush">
            {suggestions.map((workout) => (
              <li className="list-group-item px-0" key={workout._id ?? workout.title}>
                <strong>{workout.title}</strong>
                {workout.focus && <span className="ms-2">{workout.focus}</span>}
                {workout.reason && <p className="mb-0 mt-1">{workout.reason}</p>}
                {(workout.minutes !== undefined || workout.difficulty) && (
                  <small className="text-body-secondary">
                    {[workout.minutes !== undefined && `${workout.minutes} minutes`, workout.difficulty].filter(Boolean).join(', ')}
                  </small>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
