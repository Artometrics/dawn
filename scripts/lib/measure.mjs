// Page metrics shared by the route audit and the Forge audit. Runs inside the page via page.evaluate(measure).
export function measure() {
  const vw = document.documentElement.clientWidth;
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0;
  };
  const sel = (el) => {
    const id = el.id ? `#${el.id}` : '';
    const cls = typeof el.className === 'string' && el.className ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}` : '';
    const text = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30);
    return `${el.tagName.toLowerCase()}${id}${cls}${text ? ` "${text}"` : ''}`;
  };
  const all = [...document.querySelectorAll('body *')].filter((el) => !['SCRIPT', 'STYLE', 'NOSCRIPT', 'LINK', 'META'].includes(el.tagName));

  const overflowX = document.documentElement.scrollWidth - vw;
  const overflowers = all
    .filter((el) => {
      if (!visible(el)) return false;
      const r = el.getBoundingClientRect();
      return r.right > vw + 1 && r.left < vw;
    })
    .filter((el) => {
      // Ignore children of horizontal scrollers; they scroll on purpose.
      let p = el.parentElement;
      while (p && p !== document.body) {
        const cs = getComputedStyle(p);
        if (['auto', 'scroll', 'hidden'].includes(cs.overflowX) && p.scrollWidth > p.clientWidth) return false;
        p = p.parentElement;
      }
      return true;
    })
    .slice(0, 6)
    .map(sel);

  const interactive = all.filter(
    (el) => el.matches('a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab], [role=menuitem], [role=link]') && visible(el),
  );
  const tapSmall = interactive.filter((el) => {
    const r = el.getBoundingClientRect();
    // Checkbox-like marks are wrapped by a label that carries the target.
    return r.width < 43.5 || r.height < 43.5;
  });

  const textEls = all.filter((el) => visible(el) && !el.closest('.cv') && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1));
  const sizes = {};
  const families = {};
  const small = [];
  const lowContrast = [];
  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return { r, g, b, a };
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const bgOf = (el) => {
    let layers = [];
    for (let p = el; p; p = p.parentElement) {
      const c = parse(getComputedStyle(p).backgroundColor);
      if (c && c.a > 0) {
        layers.push(c);
        if (c.a >= 1) break;
      }
    }
    let base = { r: 14, g: 14, b: 12, a: 1 };
    for (const c of layers.reverse()) base = { r: c.r * c.a + base.r * (1 - c.a), g: c.g * c.a + base.g * (1 - c.a), b: c.b * c.a + base.b * (1 - c.a), a: 1 };
    return base;
  };
  for (const el of textEls) {
    const cs = getComputedStyle(el);
    const size = parseFloat(cs.fontSize);
    sizes[size] = (sizes[size] || 0) + 1;
    const fam = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim();
    families[fam] = (families[fam] || 0) + 1;
    if (size < 12) small.push(`${size}px ${sel(el)}`);
    const fg = parse(cs.color);
    if (fg && fg.a > 0.05) {
      const bg = bgOf(el);
      const eff = { r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a) };
      const l1 = lum(eff);
      const l2 = lum(bg);
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      const large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700);
      if (ratio < (large ? 3 : 4.5)) lowContrast.push(`${ratio.toFixed(2)} ${size}px ${sel(el)}`);
    }
  }
  const radii = {};
  const buttonLook = {};
  const bgs = {};
  for (const el of all) {
    if (!visible(el)) continue;
    const cs = getComputedStyle(el);
    if (el.matches('button, a[href], [role=button]')) {
      const r = el.getBoundingClientRect();
      if (r.width > 0) {
        const key = `${cs.backgroundColor}|${cs.color}|${cs.borderRadius.split(' ')[0]}`;
        buttonLook[key] = (buttonLook[key] || 0) + 1;
        radii[cs.borderRadius.split(' ')[0]] = (radii[cs.borderRadius.split(' ')[0]] || 0) + 1;
      }
    }
    const bg = cs.backgroundColor;
    if (bg && bg !== 'rgba(0, 0, 0, 0)') bgs[bg] = (bgs[bg] || 0) + 1;
  }
  const brokenImages = [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.src).map((i) => i.src.slice(0, 120));
  const body = getComputedStyle(document.body);
  return {
    title: document.title,
    h1: [...document.querySelectorAll('h1')].map((h) => h.textContent.trim().slice(0, 60)),
    bodyBg: body.backgroundColor,
    bodyFont: body.fontFamily.split(',')[0].replace(/["']/g, ''),
    colorScheme: getComputedStyle(document.documentElement).colorScheme,
    docHeight: document.documentElement.scrollHeight,
    overflowX,
    overflowers,
    interactiveCount: interactive.length,
    tapSmallCount: tapSmall.length,
    tapSmall: tapSmall.slice(0, 8).map((el) => {
      const r = el.getBoundingClientRect();
      return `${Math.round(r.width)}x${Math.round(r.height)} ${sel(el)}`;
    }),
    fontSizes: sizes,
    fontFamilies: families,
    smallText: small.slice(0, 6),
    smallTextCount: small.length,
    lowContrast: lowContrast.slice(0, 6),
    lowContrastCount: lowContrast.length,
    radii,
    buttonLookCount: Object.keys(buttonLook).length,
    buttonLooks: buttonLook,
    bgColors: bgs,
    brokenImages,
    textLength: document.body.innerText.trim().length,
    hasMain: Boolean(document.querySelector('main, [role=main]')),
    hasLang: Boolean(document.documentElement.lang),
    unlabelled: interactive
      .filter((el) => !(el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent.trim() || el.getAttribute('placeholder') || el.labels?.length))
      .slice(0, 6)
      .map(sel),
  };
}
