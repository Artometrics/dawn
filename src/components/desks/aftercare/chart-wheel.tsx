import type { NatalChart, PlacedBody } from '@/lib/aftercare/chart';
import { WHEEL_SIGNS } from '@/lib/aftercare/chart';

const CX = 320;
const CY = 320;

function polar(longitude: number, radius: number, asc: number) {
  const theta = Math.PI - ((longitude - asc) * Math.PI) / 180;
  return { x: CX + radius * Math.cos(theta), y: CY + radius * Math.sin(theta) };
}

function wedge(start: number, end: number, inner: number, outer: number, asc: number) {
  const a = polar(start, outer, asc);
  const b = polar(end, outer, asc);
  const c = polar(end, inner, asc);
  const d = polar(start, inner, asc);
  return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} A ${outer} ${outer} 0 0 1 ${b.x.toFixed(1)} ${b.y.toFixed(1)} L ${c.x.toFixed(1)} ${c.y.toFixed(1)} A ${inner} ${inner} 0 0 0 ${d.x.toFixed(1)} ${d.y.toFixed(1)} Z`;
}

function slots(bodies: PlacedBody[], asc: number) {
  const ordered = [...bodies].sort((a, b) => a.longitude - b.longitude);
  const groups: PlacedBody[][] = [];
  for (const body of ordered) {
    const group = groups[groups.length - 1];
    const prev = group?.[group.length - 1];
    const gap = prev ? (body.longitude - prev.longitude + 360) % 360 : 99;
    if (prev && gap < 16) group.push(body);
    else groups.push([body]);
  }
  return groups.flatMap((group) => group.map((body, index) => {
    const offset = index - (group.length - 1) / 2;
    return { body, ...polar(body.longitude + offset * 6, 164 + offset * 28, asc) };
  }));
}

export function ChartWheel({ chart }: { chart: NatalChart }) {
  const asc = chart.ascendant ?? 0;
  const sun = chart.bodies.find((body) => body.id === 'sun');
  return (
    <svg className="ac-wheel" viewBox="0 0 640 640" role="img" aria-label={sun ? `Natal wheel. Sun in ${sun.sign}.` : 'Natal wheel'}>
      <circle cx={CX} cy={CY} r={286} className="ac-wheel-rim" />
      <circle cx={CX} cy={CY} r={214} className="ac-wheel-line" />
      <circle cx={CX} cy={CY} r={128} className="ac-wheel-line" />
      {WHEEL_SIGNS.map((sign, index) => {
        const start = index * 30;
        const mid = polar(start + 15, 250, asc);
        return (
          <g key={sign.name}>
            <path d={wedge(start, start + 30, 214, 286, asc)} className={index % 2 ? 'ac-sign ac-sign--alt' : 'ac-sign'} />
            <text x={mid.x} y={mid.y} textAnchor="middle" dominantBaseline="middle" className="ac-sign-glyph">{sign.glyph}</text>
          </g>
        );
      })}
      {chart.houses?.map((cusp, index) => {
        const outer = polar(cusp, 214, asc);
        const inner = polar(cusp, 46, asc);
        const label = polar(cusp + 15, 108, asc);
        return (
          <g key={cusp}>
            <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} className={index === 0 ? 'ac-house ac-house--angle' : 'ac-house'} />
            <text x={label.x} y={label.y} textAnchor="middle" dominantBaseline="middle" className="ac-house-num">{index + 1}</text>
          </g>
        );
      })}
      {slots(chart.bodies, asc).map(({ body, x, y }) => (
        <g key={body.id}>
          <circle cx={x} cy={y} r={13} className={body.id === 'sun' ? 'ac-body ac-body--sun' : 'ac-body'} />
          <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="ac-body-glyph">
            {body.glyph}
            <title>{`${body.name} ${body.degree}° ${body.sign}${body.retrograde ? ', retrograde' : ''}`}</title>
          </text>
        </g>
      ))}
      <circle cx={CX} cy={CY} r={42} className="ac-wheel-core" />
      <text x={CX} y={CY - 6} textAnchor="middle" className="ac-wheel-core-kicker">{chart.ascendant === null ? 'Sun' : 'Rising'}</text>
      <text x={CX} y={CY + 16} textAnchor="middle" className="ac-wheel-core-name">
        {chart.ascendant === null ? sun?.sign ?? '' : chart.bodies.length ? signName(chart.ascendant) : ''}
      </text>
    </svg>
  );
}

function signName(longitude: number) {
  return WHEEL_SIGNS[Math.floor((((longitude % 360) + 360) % 360) / 30) % 12]?.name ?? '';
}
