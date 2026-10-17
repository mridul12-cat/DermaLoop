export function Mark() {
  return (
    <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <ellipse cx="17" cy="20" rx="12" ry="16" transform="rotate(-30 17 20)" />
      <ellipse cx="23" cy="20" rx="12" ry="16" transform="rotate(30 23 20)" />
    </svg>
  );
}
export function Brand() {
  return (
    <span className="brand">
      <Mark />
      <span>
        derma<span className="brand-light">loop</span>
      </span>
    </span>
  );
}
export function Face({ hero = false }: { hero?: boolean }) {
  return (
    <svg
      className={hero ? "face hero-face" : "face"}
      viewBox="0 0 540 600"
      role="img"
      aria-label="Original abstract face contour illustration, not an analysis or heatmap"
    >
      <defs>
        <radialGradient id="wash">
          <stop stopColor="#b8cec0" stopOpacity=".8" />
          <stop offset="1" stopColor="#e5eade" stopOpacity="0" />
        </radialGradient>
        <pattern id="dots" width="18" height="18" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r=".7" fill="#275e57" opacity=".18" />
        </pattern>
      </defs>
      <circle cx="270" cy="280" r="245" fill="url(#wash)" />
      <circle cx="270" cy="280" r="230" fill="url(#dots)" />
      <g
        className={hero ? "hero-orbits" : undefined}
        fill="none"
        stroke="#658e7b"
        strokeWidth=".8"
        opacity=".5"
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
          <ellipse
            key={i}
            cx="270"
            cy="285"
            rx={100 + i * 12}
            ry={180 + i * 5}
            transform={`rotate(${i * 8 - 35} 270 285)`}
          />
        ))}
      </g>
      <g fill="none" stroke="#275e57" strokeWidth="1.6" strokeLinecap="round">
        <path d="M197 470c18-32 18-51 9-72-39-28-57-90-49-151 5-65 20-127 91-139 73-16 129 25 138 102 5 39 1 67 18 93l-22 13c-8 75-37 120-91 126-27 2-52-9-69-23m71 23 7 46" />
        <path d="M191 246c15-12 32-13 48-4m71-2c13-7 27-5 37 1M204 259c9 6 20 6 29-1m81-3c8 5 17 4 25-1m-61 3-11 65c7 6 17 7 25 0m-42 36c17 8 36 8 50-1m-41 6c10 8 23 8 33 0" />
      </g>
      <g fill="#275e57">
        {[
          [211, 293],
          [332, 295],
          [272, 213],
        ].map(([x, y], i) => (
          <g key={i}>
            <circle
              cx={x}
              cy={y}
              r="20"
              fill="none"
              stroke="#275e57"
              strokeOpacity=".35"
            />
            <circle cx={x} cy={y} r="4" />
          </g>
        ))}
      </g>
      <path
        d="M69 449c67 90 204 102 298 47s105-132 57-153"
        fill="none"
        stroke="#c97868"
        strokeWidth="1.4"
        strokeDasharray="4 5"
      />
    </svg>
  );
}
