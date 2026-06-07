export default function Spots({ spots, state, error, locationLabel }) {
  return (
    <section className="spots">
      <h3 className="section-title">
        Where to watch <span className="spots__powered">· curated by Claude</span>
      </h3>

      {state === "loading" && (
        <div className="spots__loading">
          <div className="spinner" />
          <p>Scouting the best vantage points in {locationLabel}…</p>
        </div>
      )}

      {state === "disabled" && <SetupCard />}

      {state === "error" && (
        <p className="spots__error">{error || "Couldn't load sunset spots."}</p>
      )}

      {state === "ready" && (
        <div className="spots__grid">
          {spots.map((spot, i) => (
            <article className="spot" key={`${spot.name}-${i}`}>
              <div className="spot__num">{String(i + 1).padStart(2, "0")}</div>
              <h4 className="spot__name">{spot.name}</h4>
              <p className="spot__why">{spot.why}</p>
              <p className="spot__time">
                <span aria-hidden="true">🕒</span> {spot.bestTime}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

// Shown when the Claude key isn't configured — framed as an upgrade, not an error.
function SetupCard() {
  return (
    <div className="setup">
      <div className="setup__badge" aria-hidden="true">
        ✦
      </div>
      <h4 className="setup__title">AI-curated spots, whenever you're ready</h4>
      <p className="setup__body">
        Connect a Claude API key to unlock a hand-picked guide to the best
        sunset-watching spots in any city — rooftops, beaches, hilltops and
        overlooks, each with the perfect time to arrive.
      </p>
      <p className="setup__hint">
        Everything else — tonight's score and the 7-day forecast — works without it.
      </p>
    </div>
  );
}
