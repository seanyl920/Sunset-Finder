import ScoreRing from "./ScoreRing.jsx";
import { scoreLabel } from "../scoring.js";
import { formatClock } from "../api.js";

export default function TodayCard({ today, locationLabel }) {
  const { score, sunsetISO, description, conditions } = today;

  return (
    <section className="today">
      <div className="today__head">
        <div>
          <p className="today__eyebrow">Tonight in {locationLabel}</p>
          <h2 className="today__verdict">{scoreLabel(score)} sunset</h2>
          <p className="today__time">
            Sunset at <strong>{formatClock(sunsetISO)}</strong>
          </p>
        </div>
        <ScoreRing score={score} />
      </div>

      <p className="today__desc">{description}</p>

      <div className="today__stats">
        <Stat label="High cloud" value={`${Math.round(conditions.cloudHigh)}%`} />
        <Stat label="Mid cloud" value={`${Math.round(conditions.cloudMid)}%`} />
        <Stat label="Low cloud" value={`${Math.round(conditions.cloudLow)}%`} />
        <Stat label="Humidity" value={`${Math.round(conditions.humidity)}%`} />
        <Stat
          label="Visibility"
          value={
            conditions.visibility != null
              ? `${Math.round(conditions.visibility / 1000)} km`
              : "—"
          }
        />
      </div>
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <span className="stat__value">{value}</span>
      <span className="stat__label">{label}</span>
    </div>
  );
}
