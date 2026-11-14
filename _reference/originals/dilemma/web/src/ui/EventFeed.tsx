import { useSimulationStore } from '../state/useSimulationStore';

export function EventFeed() {
  const events = useSimulationStore((state) => state.snapshot.events);

  return (
    <section className="panel feed-panel">
      <div className="panel-header">
        <p className="eyebrow">In-world encounters</p>
        <h2>Play-by-play</h2>
      </div>
      <div className="feed-list">
        {events.map((event) => (
          <article className="feed-item" key={event.id}>
            {event.text}
          </article>
        ))}
      </div>
    </section>
  );
}
