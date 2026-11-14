import { useSimulationStore } from '../state/useSimulationStore';

export function StandingsPanel() {
  const standings = useSimulationStore((state) => state.snapshot.standings);

  return (
    <section className="panel standings-panel">
      <div className="panel-header">
        <p className="eyebrow">Live ladder</p>
        <h2>Standings</h2>
      </div>
      <ol className="standings-list">
        {standings.map((entry) => (
          <li className="standing-row" key={entry.name}>
            <span className="standing-rank">{entry.name}</span>
            <span className="standing-score" style={{ color: entry.color }}>
              {entry.score}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
