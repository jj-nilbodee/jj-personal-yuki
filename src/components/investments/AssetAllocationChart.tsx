import React from 'react';
import { AssetClass } from '../../types/finance';
import { formatMoney } from '../../utils/currency';

interface AssetAllocationChartProps {
  allocations: {
    category: AssetClass;
    value: number;
    percent: number;
    color: string;
  }[];
  totalValue: number;
  currency: string;
}

export const AssetAllocationChart: React.FC<AssetAllocationChartProps> = ({
  allocations,
  totalValue,
  currency,
}) => {
  if (totalValue <= 0 || allocations.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
        No investment assets recorded yet.
      </div>
    );
  }

  // Calculate SVG donut paths
  let cumulativeAngle = 0;
  const size = 180;
  const center = size / 2;
  const radius = 68;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '2rem' }}>
      {/* SVG Donut */}
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={strokeWidth}
          />
          {allocations.map((item) => {
            const strokeDasharray = `${(item.percent / 100) * circumference} ${circumference}`;
            const strokeDashoffset = -((cumulativeAngle / 360) * circumference);
            cumulativeAngle += (item.percent / 100) * 360;

            return (
              <circle
                key={item.category}
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke={item.color}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform={`rotate(-90 ${center} ${center})`}
                style={{ transition: 'stroke-dasharray 0.5s ease' }}
              />
            );
          })}
        </svg>

        {/* Center Text */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Portfolio
          </span>
          <span style={{ fontSize: '0.95rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            {formatMoney(totalValue, currency, true)}
          </span>
        </div>
      </div>

      {/* Legend & Breakdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: 160 }}>
        {allocations.map((item) => (
          <div key={item.category} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', fontSize: '0.82rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, display: 'inline-block' }} />
              <span style={{ color: 'var(--text-secondary)' }}>{item.category}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: 700 }}>{item.percent.toFixed(1)}%</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                ({formatMoney(item.value, currency, true)})
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
