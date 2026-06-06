export default function Spots({ spots, loading, error, locationLabel }) {
  return (
    <section className="spots">
      <h3 className="section-title">
        Where to watch <span className="spots__powered">· curated by Claude</span>
      </h3>

      {loading && (
        <div className="spots__loading">
          <div className="spinner" />
          <p>Scouting the best vantage points in {locationLabel}…</p>
        </div>
      )}

      {!loading && error && <p className="spots__error">{error}</p>}

      {!loading && !error && (
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
