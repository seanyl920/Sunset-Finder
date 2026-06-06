import { scoreColor, scoreLabel } from "../scoring.js";
import { formatClock } from "../api.js";

// Derive the weekday from the date string itself (no timezone math — the date
// is the local calendar date at the location).
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function dayName(dateStr, isToday) {
  if (isToday) return "Today";
  const [y, m, d] = dateStr.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export default function Forecast({ week }) {
  return (
    <section className="forecast">
      <h3 className="section-title">The week ahead</h3>
      <div className="forecast__grid">
        {week.map((day) => {
          const color = scoreColor(day.score);
          return (
            <div
              className={`day ${day.isToday ? "day--today" : ""}`}
              key={day.date}
            >
              <span className="day__name">{dayName(day.date, day.isToday)}</span>
              <div
                className="day__bar"
                title={`${scoreLabel(day.score)} — score ${day.score}/10`}
              >
                <div
                  className="day__fill"
                  style={{ height: `${day.score * 10}%`, background: color }}
                />
              </div>
              <span className="day__score" style={{ color }}>
                {day.score}
              </span>
              <span className="day__time">{formatClock(day.sunsetISO)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
