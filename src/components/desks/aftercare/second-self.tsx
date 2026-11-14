import { layoutConstellation } from '@/lib/aftercare/constellation';
import { getCard } from '@/lib/aftercare/deck';
import type { SelfView } from '@/lib/aftercare/second-self';
import { themeById } from '@/lib/aftercare/themes';
import { SIGNS } from '@/lib/aftercare/zodiac';
import { CardFace } from './card-face';
import { WorldMap } from './world-map';

const KIND_LABEL = { movie: 'Movies', book: 'Books', thing: 'Things' } as const;

function clip(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export function SecondSelf({ view }: { view: SelfView }) {
  const sign = SIGNS.find((item) => item.id === view.numbers?.signId);
  const birth = view.numbers ? getCard(view.numbers.birthCard) : undefined;
  const layout = layoutConstellation(view);
  const pins = view.pins ?? [];
  return (
    <div className="desk-stage">
      <article className="dw-card ac-identity">
        <p className="ac-sigil" aria-hidden="true">{[...view.name.trim()][0]?.toUpperCase() ?? '?'}</p>
        <div>
          <p className="dw-card-title">{view.name}</p>
          <p className="dw-note">{[view.birthDate ? `Born ${view.birthDate}` : '', pins.find((pin) => pin.kind === 'birth')?.label].filter(Boolean).join(' · ')}</p>
          <div className="dw-actions dw-actions--chips">
            {view.numbers ? <span className="dw-badge">Life path {view.numbers.lifePath}</span> : null}
            {sign ? <span className="dw-badge">{sign.glyph} {sign.name}</span> : null}
            {birth ? <span className="dw-badge">Birth card {birth.name}</span> : null}
          </div>
        </div>
      </article>
      {view.facts?.length ? (
        <ul className="dw-list">
          {view.facts.map((fact) => <li key={fact}>{fact}</li>)}
        </ul>
      ) : null}
      {pins.length ? (
        <article className="dw-card">
          <p className="dw-card-title">Where it sits</p>
          <WorldMap pins={pins} />
          <ul className="ac-pin-list">
            {pins.map((pin, index) => (
              <li key={`${pin.label}-${index}`}>
                <i className={`ac-dot ac-pin--${pin.kind}`} />
                <span>{pin.title ? <strong>{pin.title}</strong> : <strong>Born</strong>} {pin.label}</span>
              </li>
            ))}
          </ul>
        </article>
      ) : null}
      {layout ? (
        <article className="dw-card">
          <p className="dw-card-title">How it connects</p>
          <p className="dw-note">Accent dots are your own cards. The outer ring is what you keep, tied to the card that carries its theme.</p>
          <div className="ac-constellation-scroll">
          <svg className="ac-constellation" viewBox={`0 0 ${layout.width} ${layout.height}`} role="img" aria-label={`Connection map for ${view.name}`}>
            <circle cx={layout.cx} cy={layout.cy} r={layout.r1} className="ac-orbit" />
            <circle cx={layout.cx} cy={layout.cy} r={layout.r2} className="ac-orbit ac-orbit--outer" />
            {layout.edges.map((edge, index) => (
              <line key={index} x1={edge.x1} y1={edge.y1} x2={edge.x2} y2={edge.y2} className={edge.kind === 'own' ? 'ac-edge ac-edge--own' : 'ac-edge'} />
            ))}
            {layout.stars.map((star) => (
              <g key={star.key}>
                <circle cx={star.x} cy={star.y} r={star.ring === 'inner' ? (star.own.length ? 14 : 10) : 8} className={star.ring === 'outer' ? `ac-pin ac-pin--${star.kind ?? 'thing'}` : star.own.length ? 'ac-star ac-star--own' : 'ac-star'} />
                <text x={star.x} y={star.y + (star.ring === 'inner' ? 28 : 22)} textAnchor="middle" className="ac-star-label">{clip(star.label, 16)}</text>
                {star.own.length ? <text x={star.x} y={star.y + 44} textAnchor="middle" className="ac-star-role">{star.own.join(' · ')}</text> : null}
              </g>
            ))}
            <circle cx={layout.cx} cy={layout.cy} r={36} className="ac-you" />
            <text x={layout.cx} y={layout.cy + 5} textAnchor="middle" className="ac-you-label">You</text>
          </svg>
          </div>
        </article>
      ) : null}
      {view.links?.length ? (
        <div className="desk-stack">
          {view.links.map((link) => (
            <article key={link.title} className="dw-card">
              <p className="dw-card-title">{link.title}</p>
              <p>{link.why}</p>
              {link.cards?.length ? (
                <div className="ac-mini-row">
                  {link.cards.map((id) => {
                    const card = getCard(id);
                    return card ? <CardFace key={id} card={card} uid={`link-${id}`} /> : null;
                  })}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
      {view.favorites?.length ? (
        <div className="ac-favs">
          {(['movie', 'book', 'thing'] as const).map((kind) => {
            const items = view.favorites?.filter((favorite) => favorite.kind === kind) ?? [];
            return (
              <article key={kind} className="dw-card">
                <p className="dw-card-title">{KIND_LABEL[kind]}</p>
                {items.length ? (
                  <ul className="dw-list">
                    {items.map((favorite) => (
                      <li key={`${kind}-${favorite.title}`}>
                        <strong>{favorite.title}</strong>
                        <span className="dw-note">{themeById(favorite.themeId)?.label}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="dw-note">Nothing here yet.</p>}
              </article>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
