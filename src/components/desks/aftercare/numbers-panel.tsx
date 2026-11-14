import { majorByNumber } from '@/lib/aftercare/deck';
import { numbersFor, type AftercareData } from '@/lib/aftercare/desk';
import { NUMBER_MEANINGS, PERSONAL_YEAR_MEANINGS, lifePathCardNumber } from '@/lib/aftercare/numerology';
import { sunSign } from '@/lib/aftercare/zodiac';
import { CardFace } from './card-face';

export function NumbersPanel({ data }: { data: AftercareData }) {
  const profile = data.birthDate ? numbersFor(data.name, data.birthDate) : null;
  if (!profile) return <p className="dw-note">Add a name and a birth date on Birth. The arithmetic stays on this phone.</p>;
  const sign = sunSign(data.birthDate);
  const meaning = NUMBER_MEANINGS[profile.lifePath.number];
  const birth = majorByNumber(profile.cards.birth);
  const soul = majorByNumber(profile.cards.soul);
  const tiles = [
    ['Life path', profile.lifePath.number, majorByNumber(lifePathCardNumber(profile.lifePath.number))?.name],
    ['Birthday', profile.birthday, majorByNumber(lifePathCardNumber(profile.birthday))?.name],
    ['Expression', profile.names?.expression, profile.names ? majorByNumber(lifePathCardNumber(profile.names.expression))?.name : undefined],
    ['Soul urge', profile.names?.soulUrge || undefined, profile.names?.soulUrge ? majorByNumber(lifePathCardNumber(profile.names.soulUrge))?.name : undefined],
    ['Personality', profile.names?.personality || undefined, profile.names?.personality ? majorByNumber(lifePathCardNumber(profile.names.personality))?.name : undefined],
    ['Personal year', profile.personalYear, majorByNumber(profile.personalYear)?.name],
  ] as const;
  return (
    <div className="desk-stage">
      <p className="dw-note">Month {profile.lifePath.month} + day {profile.lifePath.day} + year {profile.lifePath.year} = {profile.lifePath.sum}, which reduces to {profile.lifePath.number}. Master numbers 11, 22, and 33 are kept.</p>
      <div className="ac-nums">
        {tiles.map(([label, value, card]) => value ? (
          <article key={label} className="dw-card ac-num">
            <b>{value}</b>
            <span>{label}</span>
            {card ? <small>{card}</small> : null}
          </article>
        ) : null)}
      </div>
      <article className="dw-card">
        <p className="dw-card-title">{meaning.title} ({profile.lifePath.number})</p>
        <p>{meaning.summary}</p>
        <p className="dw-note">Personal year {profile.personalYear}: {PERSONAL_YEAR_MEANINGS[profile.personalYear]}</p>
      </article>
      {sign ? (
        <article className="dw-card">
          <p className="dw-card-title">{sign.glyph} {sign.name}</p>
          <p>Sun sign by calendar date. {sign.vibe}. We pair it with {majorByNumber(sign.cardNumber)?.name}.</p>
        </article>
      ) : null}
      <div className="ac-pair">
        {birth ? (
          <article className="dw-card">
            <CardFace card={birth} uid="birth-card" />
            <p className="dw-card-title">Birth card</p>
            <p className="dw-note">From the digits of the birth date.</p>
          </article>
        ) : null}
        {soul ? (
          <article className="dw-card">
            <CardFace card={soul} uid="soul-card" />
            <p className="dw-card-title">Soul card</p>
            <p className="dw-note">The birth card reduced into a single digit.</p>
          </article>
        ) : null}
      </div>
      {!data.name.trim() ? <p className="dw-note">Add a name on Birth for expression, soul urge, and personality.</p> : null}
    </div>
  );
}
