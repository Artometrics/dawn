import { useSimulationStore } from '../state/useSimulationStore';

const SPEEDS = [0.5, 1, 1.5, 2, 3];

export function ControlsPanel() {
  const running = useSimulationStore((state) => state.running);
  const speed = useSimulationStore((state) => state.speed);
  const toggleRunning = useSimulationStore((state) => state.toggleRunning);
  const setSpeed = useSimulationStore((state) => state.setSpeed);
  const reset = useSimulationStore((state) => state.reset);

  return (
    <section className="panel controls-panel">
      <div className="panel-header">
        <p className="eyebrow">Browser MVP</p>
        <h2>Dawn</h2>
      </div>
      <p className="panel-copy">
        Agents roam continuously, resolve prisoner’s dilemma encounters in-browser, and update the standings with no backend.
      </p>
      <div className="button-row">
        <button className="primary-button" onClick={toggleRunning} type="button">
          {running ? 'Pause sim' : 'Resume sim'}
        </button>
        <button className="secondary-button" onClick={() => reset()} type="button">
          Reset world
        </button>
      </div>
      <div className="speed-group">
        <span className="speed-label">Speed</span>
        <div className="speed-options">
          {SPEEDS.map((value) => (
            <button
              className={value === speed ? 'speed-chip active' : 'speed-chip'}
              key={value}
              onClick={() => setSpeed(value)}
              type="button"
            >
              {value}x
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
