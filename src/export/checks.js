/**
 * Shapes one ColourPair into the checks shown in the expandable detail panel,
 * grouped into WCAG compliance and Advanced checks. Shared by the web report,
 * PDF and Markdown so all three stay in sync.
 *
 * Each check `id` is also the anchor (`#check-info-<id>`) of that check's
 * entry in the on-page "What the checks mean" section.
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

/** Severity ordering so a group can roll up to its worst check. */
function severity(status) {
  if (status === 'FAIL' || status === 'HIGH') return 2;
  if (status === 'WARN' || status === 'HARSH') return 1;
  return 0; // PASS, SAFE
}

/**
 * Worst-of verdict across the four advanced checks (APCA, CVD contrast,
 * Vestibular, Cognitive). Uses the same per-check statuses the detail panel
 * shows, so the rolled-up badge never disagrees with the rows beneath it.
 *
 * @param {import('../core/schema.js').ColourPair} p
 * @returns {'PASS'|'WARN'|'FAIL'}
 */
export function advancedStatus(p) {
  const worst = Math.max(
    severity(p.apca.status),
    severity(cvdStatus(p)),
    severity(p.vestibular.status),
    severity(p.cognitive.status)
  );
  return worst === 2 ? 'FAIL' : worst === 1 ? 'WARN' : 'PASS';
}

/** Plain-language label for a check status. */
export function statusWord(status) {
  if (status === 'PASS' || status === 'SAFE') return 'Pass';
  if (status === 'FAIL' || status === 'HIGH') return 'Fail';
  if (status === 'HARSH') return 'Harsh';
  return 'Review'; // WARN
}

/**
 * The two check groups, in display order. `id` matches the `group` field on
 * each check returned by pairChecks().
 */
export const CHECK_GROUPS = [
  { id: 'wcag',     label: 'WCAG compliance' },
  { id: 'advanced', label: 'Advanced checks' }
];

/**
 * The three roll-up badges shown on a collapsed result row: the two formal
 * WCAG levels plus the combined Advanced-checks verdict.
 *
 * @param {import('../core/schema.js').ColourPair} p
 * @returns {Array<{ id:string, label:string, short:string, status:string }>}
 */
export function pairBadges(p) {
  return [
    { id: 'wcag-aa',  label: 'WCAG AA',        short: 'AA',       status: p.pass ? 'PASS' : 'FAIL' },
    { id: 'wcag-aaa', label: 'WCAG AAA',       short: 'AAA',      status: p.passAaa ? 'PASS' : 'FAIL' },
    { id: 'advanced', label: 'Advanced Checks', short: 'Advanced', status: advancedStatus(p) }
  ];
}

/**
 * @param {import('../core/schema.js').ColourPair} p
 * @returns {Array<{ id:string, group:string, label:string, value:string, status:string, detail:string }>}
 */
export function pairChecks(p) {
  return [
    {
      id: 'wcag-aa', group: 'wcag', label: 'WCAG AA',
      value: `${p.contrast.toFixed(2)}:1`, status: p.pass ? 'PASS' : 'FAIL',
      detail: `needs ${p.required}:1 for this text size`
    },
    {
      id: 'wcag-aaa', group: 'wcag', label: 'WCAG AAA',
      value: `${p.contrast.toFixed(2)}:1`, status: p.passAaa ? 'PASS' : 'FAIL',
      detail: `needs ${p.requiredAaa}:1 for this text size`
    },
    {
      id: 'apca', group: 'advanced', label: 'APCA',
      value: `Lc ${p.apca.lc}`, status: p.apca.status, detail: p.apca.message
    },
    {
      id: 'cvd', group: 'advanced', label: 'CVD contrast',
      value: '', status: cvdStatus(p),
      detail: `Deuteranopia ${p.cvd.deuteranopia.contrast.toFixed(2)}:1 · `
            + `Protanopia ${p.cvd.protanopia.contrast.toFixed(2)}:1 · `
            + `Tritanopia ${p.cvd.tritanopia.contrast.toFixed(2)}:1`
    },
    {
      id: 'vestibular', group: 'advanced', label: 'Vestibular',
      value: `${p.vestibular.maxSat}% saturation`, status: p.vestibular.status,
      detail: p.vestibular.message
    },
    {
      id: 'cognitive', group: 'advanced', label: 'Cognitive',
      value: '', status: p.cognitive.status, detail: p.cognitive.message
    }
  ];
}
