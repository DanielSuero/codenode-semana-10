'use client';

import styles from './DashboardCharts.module.css';

interface DashboardChartsProps {
  revisions: any[];
}

export default function DashboardCharts({ revisions }: DashboardChartsProps) {
  // Sort revisions ascending by date to display chronological progress
  const chronologicalRevisions = [...revisions]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // 1. Mileage Progression (SVG Line Chart)
  // Let's build coordinates if we have at least 1 point.
  const chartHeight = 160;
  const chartWidth = 500;
  const paddingX = 40;
  const paddingY = 20;

  const validPoints = chronologicalRevisions.map((rev) => ({
    date: rev.date,
    mileage: rev.mileage,
  }));

  const mileages = validPoints.map((p) => p.mileage);
  const minMileage = mileages.length > 0 ? Math.min(...mileages) * 0.95 : 0; // padding below
  const maxMileage = mileages.length > 0 ? Math.max(...mileages) * 1.05 : 100000;
  const rangeMileage = maxMileage - minMileage || 1;

  // X coordinate interpolation helper
  const getX = (index: number, total: number) => {
    if (total <= 1) return chartWidth / 2;
    return paddingX + (index * (chartWidth - paddingX * 2)) / (total - 1);
  };

  // Y coordinate interpolation helper (SVG coordinate has 0 at top, so we invert)
  const getY = (val: number) => {
    const relativeVal = (val - minMileage) / rangeMileage;
    return chartHeight - paddingY - relativeVal * (chartHeight - paddingY * 2);
  };

  // Path generator string
  let linePathD = '';
  let areaPathD = '';
  const circles: { cx: number; cy: number; label: string; val: number }[] = [];

  if (validPoints.length > 0) {
    const total = validPoints.length;
    
    // Create points
    const pts = validPoints.map((p, idx) => {
      const x = getX(idx, total);
      const y = getY(p.mileage);
      circles.push({ cx: x, cy: y, label: p.date, val: p.mileage });
      return { x, y };
    });

    if (pts.length === 1) {
      // Single revision point line
      linePathD = `M ${paddingX} ${pts[0].y} L ${chartWidth - paddingX} ${pts[0].y}`;
      areaPathD = `M ${paddingX} ${pts[0].y} L ${chartWidth - paddingX} ${pts[0].y} L ${chartWidth - paddingX} ${chartHeight - paddingY} L ${paddingX} ${chartHeight - paddingY} Z`;
    } else {
      // Build bezier curve or straight lines
      linePathD = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 1; i < pts.length; i++) {
        linePathD += ` L ${pts[i].x} ${pts[i].y}`;
      }
      // Build area shape
      areaPathD = `${linePathD} L ${pts[pts.length - 1].x} ${chartHeight - paddingY} L ${pts[0].x} ${chartHeight - paddingY} Z`;
    }
  }

  // 2. Health overview of latest inspection
  const latestRevision = revisions[0]; // Already sorted descending by default in timeline
  let itemsDistribution = { Passed: 0, Warning: 0, Failed: 0, Pending: 0 };
  let totalItems = 0;

  if (latestRevision && latestRevision.items) {
    latestRevision.items.forEach((item: any) => {
      if (item.status === 'Passed') itemsDistribution.Passed++;
      else if (item.status === 'Warning') itemsDistribution.Warning++;
      else if (item.status === 'Failed') itemsDistribution.Failed++;
      else itemsDistribution.Pending++;
    });
    totalItems = latestRevision.items.length;
  }

  const getPercentage = (count: number) => {
    if (totalItems === 0) return 0;
    return Math.round((count / totalItems) * 100);
  };

  return (
    <div className={styles.chartsContainer}>
      {/* Chart 1: Mileage Progression */}
      <div className={styles.chartCard}>
        <div className={styles.chartTitle}>
          Progreso de Kilometraje
          <span className={styles.chartSubtitle}>Evolución temporal del uso</span>
        </div>
        
        <div className={styles.chartWrapper}>
          {validPoints.length === 0 ? (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-muted)', fontSize: '0.85rem' }}>
              Registra inspecciones para ver el gráfico.
            </div>
          ) : (
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className={styles.svg}>
              <defs>
                <linearGradient id="gradient-mileage" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent-color)" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="var(--accent-color)" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <g className={styles.gridLines}>
                <line x1={paddingX} y1={getY(minMileage + rangeMileage * 0.25)} x2={chartWidth - paddingX} y2={getY(minMileage + rangeMileage * 0.25)} />
                <line x1={paddingX} y1={getY(minMileage + rangeMileage * 0.5)} x2={chartWidth - paddingX} y2={getY(minMileage + rangeMileage * 0.5)} />
                <line x1={paddingX} y1={getY(minMileage + rangeMileage * 0.75)} x2={chartWidth - paddingX} y2={getY(minMileage + rangeMileage * 0.75)} />
                {/* Baseline */}
                <line x1={paddingX} y1={chartHeight - paddingY} x2={chartWidth - paddingX} y2={chartHeight - paddingY} style={{ stroke: 'var(--fg-muted)', opacity: 0.3 }} />
              </g>

              {/* Area */}
              {areaPathD && <path d={areaPathD} className={styles.areaPath} />}

              {/* Line */}
              {linePathD && <path d={linePathD} className={styles.linePath} />}

              {/* Points */}
              {circles.map((c, i) => (
                <g key={i}>
                  <circle cx={c.cx} cy={c.cy} r="5" className={styles.chartPoint} />
                  {/* Label Y for points */}
                  <text x={c.cx} y={c.cy - 10} textAnchor="middle" className={styles.labelY}>
                    {c.val.toLocaleString()} km
                  </text>
                  {/* Label X for dates */}
                  <text x={c.cx} y={chartHeight - 4} textAnchor="middle" className={styles.labelX}>
                    {c.label}
                  </text>
                </g>
              ))}
            </svg>
          )}
        </div>
      </div>

      {/* Chart 2: Health distribution */}
      <div className={styles.chartCard}>
        <div className={styles.chartTitle}>
          Estado Actual
          <span className={styles.chartSubtitle}>Último reporte</span>
        </div>

        {latestRevision ? (
          <div className={styles.healthList}>
            <div className={styles.healthRow}>
              <div className={styles.healthRowHeader}>
                <span className={styles.healthLabel}>Correcto</span>
                <span className={styles.healthValue}>
                  {itemsDistribution.Passed} / {totalItems} ({getPercentage(itemsDistribution.Passed)}%)
                </span>
              </div>
              <div className={styles.progressBarContainer}>
                <div className={`${styles.progressBar} ${styles.progressPassed}`} style={{ width: `${getPercentage(itemsDistribution.Passed)}%` }} />
              </div>
            </div>

            <div className={styles.healthRow}>
              <div className={styles.healthRowHeader}>
                <span className={styles.healthLabel}>Avisos</span>
                <span className={styles.healthValue}>
                  {itemsDistribution.Warning} / {totalItems} ({getPercentage(itemsDistribution.Warning)}%)
                </span>
              </div>
              <div className={styles.progressBarContainer}>
                <div className={`${styles.progressBar} ${styles.progressWarning}`} style={{ width: `${getPercentage(itemsDistribution.Warning)}%` }} />
              </div>
            </div>

            <div className={styles.healthRow}>
              <div className={styles.healthRowHeader}>
                <span className={styles.healthLabel}>Fallos</span>
                <span className={styles.healthValue}>
                  {itemsDistribution.Failed} / {totalItems} ({getPercentage(itemsDistribution.Failed)}%)
                </span>
              </div>
              <div className={styles.progressBarContainer}>
                <div className={`${styles.progressBar} ${styles.progressFailed}`} style={{ width: `${getPercentage(itemsDistribution.Failed)}%` }} />
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
            No hay datos de diagnóstico aún.
          </div>
        )}
      </div>
    </div>
  );
}
