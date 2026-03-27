
import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark' | 'icon-only';
}

const sizeMap = {
  sm: { box: 28, arc: 12, dot: 2.5, fontSize: 15, gap: 8 },
  md: { box: 36, arc: 16, dot: 3.2, fontSize: 19, gap: 10 },
  lg: { box: 48, arc: 22, dot: 4.2, fontSize: 26, gap: 13 },
};

const Logo: React.FC<LogoProps> = ({ size = 'md', variant = 'light' }) => {
  const s = sizeMap[size];
  const radius = Math.round(s.box * 0.28);

  // Arc path: open curve like a tooth/smile
  const cx = s.box / 2;
  const cy = s.box / 2;
  const r = s.arc;
  // Arc from left to right with a smile curve (bottom half of circle)
  const x1 = cx - r * 0.75;
  const y1 = cy + r * 0.15;
  const x2 = cx + r * 0.75;
  const y2 = cy + r * 0.15;
  const arcRy = r * 0.85;
  // Dot position: upper-right
  const dotX = cx + r * 0.68;
  const dotY = cy - r * 0.55;

  const wordmarkColor = variant === 'dark' ? '#f0f9ff' : '#0a0f1e';

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: s.gap }}>
      {/* Icon */}
      <svg
        width={s.box}
        height={s.box}
        viewBox={`0 0 ${s.box} ${s.box}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <rect width={s.box} height={s.box} rx={radius} fill="#0284c7" />
        {/* Tooth arc (smile outline) */}
        <path
          d={`M ${x1} ${y1} Q ${cx} ${cy - arcRy} ${x2} ${y2}`}
          stroke="#ffffff"
          strokeWidth={s.box * 0.065}
          strokeLinecap="round"
          fill="none"
        />
        {/* Bright dot */}
        <circle cx={dotX} cy={dotY} r={s.dot} fill="#7dd3fc" />
      </svg>

      {/* Wordmark */}
      {variant !== 'icon-only' && (
        <span
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 600,
            fontSize: s.fontSize,
            color: wordmarkColor,
            letterSpacing: '-0.03em',
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}
        >
          Odontly
        </span>
      )}
    </div>
  );
};

export default Logo;
