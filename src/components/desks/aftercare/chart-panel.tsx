import { natalChart, signAt } from '@/lib/aftercare/chart';
import type { AftercareData } from '@/lib/aftercare/desk';
import { sunSign } from '@/lib/aftercare/zodiac';
import { ChartWheel } from './chart-wheel';

export function ChartPanel({ data }: { data: AftercareData }) {
  if (!data.birthDate) return <p className="dw-note">Add a birth date on Birth. Time and place turn on the houses.</p>;
  const chart = natalChart({
    iso: data.birthDate,
    time: data.birthTime || undefined,
    lat: data.birthPlace?.lat,
    lng: data.birthPlace?.lng,
  });
  const sign = sunSign(data.birthDate);
  if (!chart || !sign) return <p className="dw-note">That birth date could not be read.</p>;
  const rising = chart.ascendant === null ? null : signAt(chart.ascendant);
  const mid = chart.midheaven === null ? null : signAt(chart.midheaven);
  return (
    <div className="ac-chart">
      <div className="desk-stage">
        <ChartWheel chart={chart} />
        <p className="dw-note">Computed for {chart.whenLabel}. {chart.timeNote}</p>
      </div>
      <div className="desk-stage">
        <article className="dw-card">
          <p className="dw-card-title">{sign.glyph} Sun in {sign.name}</p>
          <p>{sign.vibe}.</p>
          <p className="dw-note">
            {data.birthTime ? `Time ${data.birthTime}. ` : 'No birth time saved. '}
            {data.birthPlace ? data.birthPlace.label : 'No birth place saved.'}
            {rising ? ` Rising ${rising.name}.` : ''}
            {mid ? ` Midheaven ${mid.name}.` : ''}
          </p>
        </article>
        <div className="dw-card ac-planets">
          <table>
            <thead>
              <tr><th>Body</th><th>Sign</th><th>House</th></tr>
            </thead>
            <tbody>
              {chart.bodies.map((body) => (
                <tr key={body.id}>
                  <td>{body.glyph} {body.name}{body.retrograde ? ' R' : ''}</td>
                  <td>{body.degree}° {String(body.minute).padStart(2, '0')}′ {body.sign}</td>
                  <td>{body.house ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="dw-note">Low-precision positions for reflection, not an observatory. A birthday on a sign cusp can land a day away from a full ephemeris. Nothing here is a prediction.</p>
      </div>
    </div>
  );
}
