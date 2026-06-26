import { useEffect, useRef, useState } from 'react';

/**
 * Custom Canvas-based responsive bar chart with smooth animations, grid lines,
 * axes, high-DPI resolution support, and HTML-overlay tooltips.
 * 
 * @param {Array} data Array of { label: string, value: number (duration in seconds) }
 * @param {string} color Theme color for the bars
 */
export default function BarChart({ data = [], color = '#3b82f6' }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const [hoveredBarIndex, setHoveredBarIndex] = useState(null);
  const [animationProgress, setAnimationProgress] = useState(0);

  // Animation effect on data change
  useEffect(() => {
    setAnimationProgress(0);
    let startTimestamp = null;
    const duration = 600; // ms

    const animate = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function: easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      setAnimationProgress(ease);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    const animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [data]);

  // Convert duration to hours helper
  const toHours = (seconds) => {
    return Number((seconds / 3600).toFixed(2));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions based on CSS layout size
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // Support High-DPI displays (retina screens)
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (data.length === 0) {
      // Empty state rendering
      ctx.fillStyle = '#9ca3af';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('No time data recorded for this period', width / 2, height / 2);
      return;
    }

    // Chart margins
    const padding = { top: 20, right: 20, bottom: 40, left: 45 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Values in hours
    const hourValues = data.map(d => toHours(d.duration));
    const maxHour = Math.max(...hourValues, 1); // fallback to 1 if empty or 0
    // Round max hour to nearest logical scale step (e.g. multiples of 1, 2, 5, 10)
    let yMax = Math.ceil(maxHour);
    if (yMax <= 5) {
      yMax = 5;
    } else if (yMax <= 10) {
      yMax = 10;
    } else {
      yMax = Math.ceil(yMax / 5) * 5;
    }

    // 1. Draw Grid Lines & Y Axis Labels
    const yTicks = 5;
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#6b7280';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= yTicks; i++) {
      const val = (yMax / yTicks) * i;
      const y = padding.top + chartHeight - (val / yMax) * chartHeight;
      
      // Grid line
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      // Label
      ctx.fillText(`${val.toFixed(1)}h`, padding.left - 8, y);
    }

    // 2. Draw Bars & X Labels
    const barSpacing = chartWidth / data.length;
    const barWidth = Math.max(2, barSpacing * 0.6); // 60% of slot width, min 2px

    data.forEach((d, idx) => {
      const hours = toHours(d.duration);
      // Interpolate with animation progress
      const animatedHours = hours * animationProgress;
      const barHeight = (animatedHours / yMax) * chartHeight;
      const x = padding.left + (idx * barSpacing) + (barSpacing - barWidth) / 2;
      const y = padding.top + chartHeight - barHeight;

      // Draw X labels (skip some if too crowded)
      const maxLabels = 15;
      const labelInterval = Math.ceil(data.length / maxLabels);
      
      if (idx % labelInterval === 0) {
        ctx.fillStyle = '#6b7280';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(d.label, x + barWidth / 2, padding.top + chartHeight + 8);
      }

      // Draw bar if height > 0
      if (barHeight > 1) {
        // Gradient fill
        const gradient = ctx.createLinearGradient(x, y, x, padding.top + chartHeight);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, `${color}88`); // fade to semi-transparent at the bottom
        ctx.fillStyle = hoveredBarIndex === idx ? color : gradient;

        // Rounded top rectangle path
        ctx.beginPath();
        const radius = Math.min(barWidth / 2, 4); // rounded top radius
        ctx.moveTo(x, padding.top + chartHeight);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.lineTo(x + barWidth - radius, y);
        ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
        ctx.lineTo(x + barWidth, padding.top + chartHeight);
        ctx.closePath();
        ctx.fill();
      }
    });

    // 3. Draw Axis Lines
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 1.5;
    
    // Bottom Axis
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + chartHeight);
    ctx.lineTo(width - padding.right, padding.top + chartHeight);
    ctx.stroke();

    // Left Axis
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + chartHeight);
    ctx.stroke();

  }, [data, hoveredBarIndex, animationProgress, color]);

  // Handle Mouse Hover/Movement
  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const padding = { top: 20, right: 20, bottom: 40, left: 45 };
    const chartWidth = rect.width - padding.left - padding.right;
    const barSpacing = chartWidth / data.length;

    // Check if mouse is in chart area
    if (mx < padding.left || mx > rect.width - padding.right || my < padding.top || my > rect.height - padding.bottom) {
      setHoveredBarIndex(null);
      setTooltip(null);
      return;
    }

    // Determine hovered bar index
    const colIdx = Math.floor((mx - padding.left) / barSpacing);
    if (colIdx >= 0 && colIdx < data.length) {
      const d = data[colIdx];
      const hours = toHours(d.duration);
      
      setHoveredBarIndex(colIdx);
      setTooltip({
        x: padding.left + (colIdx * barSpacing) + barSpacing / 2,
        y: my - 12,
        value: `${hours} hours`,
        label: d.label,
        entriesCount: d.entries?.length || 0
      });
    } else {
      setHoveredBarIndex(null);
      setTooltip(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredBarIndex(null);
    setTooltip(null);
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-white rounded-lg p-2">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair block"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      {tooltip && (
        <div
          className="absolute z-20 pointer-events-none transform -translate-x-1/2 -translate-y-full bg-slate-900/95 backdrop-blur-sm text-white px-3 py-2 rounded-md shadow-lg border border-slate-700 text-xs flex flex-col gap-0.5 transition-all duration-75"
          style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }}
        >
          <span className="font-semibold border-b border-slate-700 pb-1 mb-1 block">
            {tooltip.label}
          </span>
          <div className="flex justify-between items-center gap-4">
            <span className="text-slate-400">Total Duration:</span>
            <span className="font-bold text-amber-400">{tooltip.value}</span>
          </div>
          <div className="flex justify-between items-center gap-4">
            <span className="text-slate-400">Time Entries:</span>
            <span className="font-medium text-slate-200">{tooltip.entriesCount}</span>
          </div>
        </div>
      )}
    </div>
  );
}
