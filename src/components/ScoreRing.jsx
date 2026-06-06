import { scoreColor } from "../scoring.js";

// A circular gauge that fills proportionally to the 1–10 score.
export default function ScoreRing({ score, size = 132, stroke = 10 }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 10) * circumference;
  const color = scoreColor(score);

  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dasharray 0.9s ease, stroke 0.6s ease" }}
        />
      </svg>
      <div className="ring__label">
        <span className="ring__score" style={{ color }}>
          {score}
        </span>
        <span className="ring__max">/ 10</span>
      </div>
    </div>
  );
}
