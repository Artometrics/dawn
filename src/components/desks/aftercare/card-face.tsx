import { cardArtSvg, cardBackSvg } from '@/lib/aftercare/card-art';
import type { Card } from '@/lib/aftercare/types';

/** Procedural card face. The SVG is generated from the deck, never from typed text. */
export function CardFace({ card, uid, reversed = false }: { card: Card; uid: string; reversed?: boolean }) {
  return (
    <span
      className={reversed ? 'ac-face is-reversed' : 'ac-face'}
      dangerouslySetInnerHTML={{ __html: cardArtSvg(card, { labels: true, uid }) }}
    />
  );
}

export function CardBack() {
  return <span className="ac-face" dangerouslySetInnerHTML={{ __html: cardBackSvg() }} />;
}
