/**
 * Shapes one ColourPair into the six checks shown in the expandable detail
 * panel. Shared by the web report, PDF and Markdown so all three stay in sync.
 * Each `id` is also the anchor of that check's section in methodology.html.
 *
 * @module export/checks
 */

/** One-line summary of how many combinations fail or need review. */
export function overallLine(report) {
  const pairs = report.colourPairs;
  const fails = pairs.filter((p) => p.overall === 'FAIL').length;
  const warns = pairs.filter((p) => p.overall === 'WARN').length;
  const bits  = [`${pairs.length} colour combination${pairs.length === 1 ? '' : 's'}`];
  if (fails) bits.push(`${fails} fail`);
  if (warns) bits.push(`${warns} need review`);
  if (!fails && !warns) bits.push('all pass every check');
  return bits.join(' · ');
}

/** Worst-of colour-vision-deficiency verdict for one pair. */
export function cvdStatus(p) {
  const allPass = ['deuteranopia', 'protanopia', 'tritanopia'].every((k) => p.cvd[k].pass);
  if (allPass) return 'PASS';
  return p.cvdRisk ? 'WARN' : 'FAIL';
}

/**
 * @param {import('../core/schema.js').ColourPair} p
 * @returns {Array<{ id:string, label:string, value:string, status:string, detail:string }>}
 */
export function pairChecks(p) {
  return [
    {
      id: 'wcag-aa', label: 'WCAG AA',
      value: `${p.contrast.toFixed(2)}:1`, status: p.pass ? 'PASS' : 'FAIL',
      detail: `needs ${p.required}:1 for this text size`
    },
    {
      id: 'wcag-aaa', label: 'WCAG AAA',
      value: `${p.contrast.toFixed(2)}:1`, status: p.passAaa ? 'PASS' : 'FAIL',
      detail: `needs ${p.requiredAaa}:1 for this text size`
    },
    {
      id: 'apca', label: 'APCA',
      value: `Lc ${p.apca.lc}`, status: p.apca.status, detail: p.apca.message
    },
    {
      id: 'cvd', label: 'CVD contrast',
      value: '', status: cvdStatus(p),
      detail: `Deuteranopia ${p.cvd.deuteranopia.contrast.toFixed(2)}:1 · `
            + `Protanopia ${p.cvd.protanopia.contrast.toFixed(2)}:1 · `
            + `Tritanopia ${p.cvd.tritanopia.contrast.toFixed(2)}:1`
    },
    {
      id: 'vestibular', label: 'Vestibular',
      value: `${p.vestibular.maxSat}% saturation`, status: p.vestibular.status,
      detail: p.vestibular.message
    },
    {
      id: 'cognitive', label: 'Cognitive',
      value: '', status: p.cognitive.status, detail: p.cognitive.message
    }
  ];
}
