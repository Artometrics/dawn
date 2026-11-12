import type { Metadata } from 'next';
import { PageShell } from '@/components/site/page-shell';
import { Swatch } from './swatch';
import './style-guide.css';

export const metadata: Metadata = {
  title: 'Dawn style guide',
  description: 'The tokens and shared components every Dawn page uses.',
  robots: { index: false, follow: false },
};

const SURFACES = [
  ['--dawn-bg', 'Page ground'],
  ['--dawn-sheet', 'Drawers, sheets'],
  ['--dawn-elev', 'Cards, panels'],
  ['--dawn-field', 'Inputs'],
  ['--dawn-chip', 'Buttons, chips'],
  ['--dawn-chip-hover', 'Button hover'],
  ['--dawn-line', 'Hairlines'],
] as const;
const TEXT = [
  ['--dawn-text', 'Headings, body'],
  ['--dawn-secondary', 'Supporting copy'],
  ['--dawn-muted', 'Captions, hints'],
  ['--dawn-placeholder', 'Placeholders'],
] as const;
const ACCENT = [
  ['--dawn-accent', 'Clay. Marks, never grounds'],
  ['--dawn-accent-strong', 'Clay for small marks and text'],
  ['--dawn-pill', 'Primary action'],
  ['--dawn-ink', 'Text on the cream pill'],
] as const;
const MAP = [
  ['--dawn-grass', 'Town grass'],
  ['--dawn-forest', 'Map border'],
  ['--dawn-road', 'Roads'],
  ['--dawn-neon-orange', 'Drawing only'],
  ['--dawn-neon-green', 'Drawing only'],
  ['--dawn-neon-blue', 'Drawing only'],
] as const;

const TYPE_SCALE = [
    ['--dawn-fs-h1 30 (28 on phones)', 'dw-h1', 'Page title'],
  ['--dawn-fs-heading 22', 'dw-h2', 'Section heading'],
  ['--dawn-fs-title 17', 'dw-card-title', 'Card title'],
  ['--dawn-fs-body 16', '', 'Body copy reads at sixteen pixels and holds its line.'],
  ['--dawn-fs-support 15', '', 'Supporting copy under a title.'],
  ['--dawn-fs-action 14', '', 'Buttons and table text'],
  ['--dawn-fs-label 13', '', 'Labels and footers'],
  ['--dawn-fs-micro 12', '', 'Smallest allowed. Badges, timestamps.'],
] as const;

const STATES = ['Default', 'Hover', 'Focus', 'Disabled'] as const;
const VARIANTS = [
  { name: 'Primary', cls: 'dw-btn dw-btn--primary', label: 'Send' },
  { name: 'Secondary', cls: 'dw-btn', label: 'Open' },
  { name: 'Ghost', cls: 'dw-btn dw-btn--ghost', label: 'Cancel' },
  { name: 'Danger', cls: 'dw-btn dw-btn--danger', label: 'Delete' },
  { name: 'Chip', cls: 'dw-btn dw-btn--chip', label: 'Town' },
  { name: 'Chip, selected', cls: 'dw-btn dw-btn--chip is-on', label: 'Atlas' },
] as const;

export default function StyleGuidePage() {
  return (
    <PageShell
      title="Style guide"
      wide
      lead="One set of tokens in src/styles/tokens.css and one set of shared components in src/styles/dawn-ui.css. Every page, from the town map to the studio, draws from these. Dawn is dark only."
    >
      <section className="sg-section" aria-labelledby="sg-color">
        <h2 id="sg-color" className="dw-h2">Colour</h2>
        <h3 className="dw-h3">Surfaces</h3>
        <ul className="sg-grid">{SURFACES.map(([t, n]) => <Swatch key={t} token={t} note={n} />)}</ul>
        <h3 className="dw-h3">Text</h3>
        <ul className="sg-grid">{TEXT.map(([t, n]) => <Swatch key={t} token={t} note={n} />)}</ul>
        <h3 className="dw-h3">Accent and action</h3>
        <ul className="sg-grid">{ACCENT.map(([t, n]) => <Swatch key={t} token={t} note={n} />)}</ul>
        <h3 className="dw-h3">Map and town</h3>
        <ul className="sg-grid">{MAP.map(([t, n]) => <Swatch key={t} token={t} note={n} />)}</ul>
      </section>

      <section className="sg-section" aria-labelledby="sg-type">
        <h2 id="sg-type" className="dw-h2">Type scale</h2>
        <div className="sg-type">
          <code>Brand mark, Press Start 2P</code>
          <span style={{ fontFamily: 'var(--dawn-font-pixel)', fontSize: 'var(--dawn-fs-micro)', letterSpacing: '0.08em' }}>DAWN</span>
          <code>Display, Source Serif 4, --dawn-fs-display 34</code>
          <span style={{ fontFamily: 'var(--dawn-font-display)', fontSize: 'var(--dawn-fs-display)' }}>Evening thoughts</span>
          {TYPE_SCALE.map(([token, cls, sample]) => (
            <div key={token} style={{ display: 'contents' }}>
              <code>{token}</code>
              <span className={cls || undefined} style={cls ? { margin: 0 } : { fontSize: `var(${token.split(' ')[0]})` }}>{sample}</span>
            </div>
          ))}
          <code>Mono, Geist Mono</code>
          <span style={{ fontFamily: 'var(--dawn-font-mono)', fontSize: 'var(--dawn-fs-action)' }}>npm run build</span>
        </div>
      </section>

      <section className="sg-section" aria-labelledby="sg-buttons">
        <h2 id="sg-buttons" className="dw-h2">Buttons</h2>
        <p className="dw-note">One shape: a capsule, 44px tall. Chips are 36px on desktop and 44px on phones and touch. One primary action per view.</p>
        <div className="sg-matrix" role="group" aria-label="Button variants and states">
          <span />
          {STATES.map((s) => <span key={s} className="sg-head">{s}</span>)}
          {VARIANTS.map((v) => (
            <div key={v.name} style={{ display: 'contents' }}>
              <span className="sg-rowlabel">{v.name}</span>
              <button type="button" className={v.cls}>{v.label}</button>
              <button type="button" tabIndex={-1} className={`${v.cls} sg-hover`}>{v.label}</button>
              <button type="button" tabIndex={-1} className={`${v.cls} sg-focus`}>{v.label}</button>
              <button type="button" className={v.cls} disabled>{v.label}</button>
            </div>
          ))}
          <span className="sg-rowlabel">Icon</span>
          <button type="button" className="dw-btn dw-btn--icon" aria-label="Add">+</button>
          <button type="button" tabIndex={-1} className="dw-btn dw-btn--icon sg-hover" aria-label="Add">+</button>
          <button type="button" tabIndex={-1} className="dw-btn dw-btn--icon sg-focus" aria-label="Add">+</button>
          <button type="button" className="dw-btn dw-btn--icon" disabled aria-label="Add">+</button>
        </div>
      </section>

      <section className="sg-section" aria-labelledby="sg-cards">
        <h2 id="sg-cards" className="dw-h2">Cards, panels and forms</h2>
        <div className="sg-pair">
          <div className="dw-card">
            <h3 className="dw-card-title">Card</h3>
            <p className="dw-note">Elevated tone, 18px radius, 16px padding. No border, no shadow.</p>
            <span className="dw-badge dw-badge--accent">Live</span>
          </div>
          <div className="dw-card dw-card--stone">
            <h3 className="dw-card-title">Stone card</h3>
            <p className="dw-note">The chip tone, for a card that sits on another card.</p>
            <span className="dw-badge">Draft</span>
          </div>
          <p className="dw-alert"><strong>Heads up.</strong> Alerts use the same tone with a light-blue lead word.</p>
          <div className="dw-form">
            <label className="dw-label" htmlFor="sg-field">Field label</label>
            <input id="sg-field" className="dw-field" placeholder="Placeholder text" />
            <div className="dw-actions">
              <button type="button" className="dw-btn dw-btn--primary">Save</button>
              <button type="button" className="dw-btn dw-btn--ghost">Cancel</button>
            </div>
          </div>
        </div>
        <div className="dw-empty">
          <img className="dw-sprite" src="/tiles/you-0.png" alt="" width={72} height={72} />
          <p className="dw-empty-title">Empty state</p>
          <p>A sprite, one line of what is missing, and the way forward.</p>
        </div>
      </section>

      <section className="sg-section" aria-labelledby="sg-forge">
        <h2 id="sg-forge" className="dw-h2">Pickers, sliders and stages</h2>
        <p className="dw-note">The Forge character maker is built from these. Choices are chips that keep their own width; a slider row and a colour swatch are 44px tall; the stage is a framed drawing surface; errors are alerts and progress is a quiet note.</p>
        <div className="sg-pair">
          <div className="dw-card">
            <h3 className="dw-card-title">Choice chips</h3>
            <div className="dw-actions dw-actions--chips" role="group" aria-label="Sample choices">
              <button type="button" className="dw-btn dw-btn--chip is-on">Plate</button>
              <button type="button" className="dw-btn dw-btn--chip">Tunic</button>
              <button type="button" className="dw-btn dw-btn--chip">Greatcoat</button>
              <button type="button" className="dw-btn dw-btn--chip">Robe</button>
            </div>
          </div>
          <div className="dw-card">
            <h3 className="dw-card-title">Slider and swatches</h3>
            <label className="dw-slider"><span>Height</span><input type="range" min={0} max={1} step={0.01} defaultValue={0.5} /><output>0.50</output></label>
            <div className="dw-actions dw-actions--chips">
              <label className="dw-swatch"><input type="color" defaultValue="#d97746" />Trim</label>
              <label className="dw-swatch"><input type="color" defaultValue="#f3f1ec" />Cloth</label>
            </div>
          </div>
          <div className="dw-stage" style={{ ['--dw-stage-h' as string]: '140px' }}>
            <p className="dw-stage-message">Stage. The 3D view draws here; if the browser cannot, this message does.</p>
          </div>
          <div className="dw-form">
            <p className="dw-note" role="status">Napoleon Bonaparte is in your roster.</p>
            <p className="dw-alert" role="alert">Unknown hair &quot;mohawk&quot;. Expected cropped, bob, queue, long, topknot, none.</p>
          </div>
        </div>
      </section>

      <section className="sg-section" aria-labelledby="sg-header">
        <h2 id="sg-header" className="dw-h2">Top bar and sidebar</h2>
        <p className="dw-note">Every page sits inside one shell: a top bar with the menu button on the left, the page title in the middle and the account button on the right, and one slide-over sidebar that docks on wide screens. The current page is a navy row with a light-blue outline. There is no tab bar and no footer row.</p>
      </section>

      <section className="sg-section" aria-labelledby="sg-shape">
        <h2 id="sg-shape" className="dw-h2">Shape and spacing</h2>
        <div className="sg-radii">
          <span style={{ borderRadius: 'var(--dawn-radius-full)' }}>full</span>
          <span style={{ borderRadius: 'var(--dawn-radius-sheet)' }}>sheet 22</span>
          <span style={{ borderRadius: 'var(--dawn-radius-panel)' }}>panel 18</span>
          <span style={{ borderRadius: 'var(--dawn-radius-row)' }}>row 14</span>
          <span style={{ borderRadius: 'var(--dawn-radius-tile)' }}>tile 10</span>
          <span style={{ borderRadius: 'var(--dawn-radius-mark)' }}>mark 8</span>
        </div>
        <p className="dw-note">Spacing runs on a 4px grid: 4, 8, 12, 16, 20, 24, 32, 40.</p>
      </section>
    </PageShell>
  );
}
