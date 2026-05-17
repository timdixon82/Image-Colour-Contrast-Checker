// Markdown export — single .md file mirroring report.md with embedded base64
// images for swatches, clips, and per-image previews.

import { THRESHOLDS_FOOTER, sourceDataUrl } from '../lib/swatch.js';

function anchor(filename) {
  return filename.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function verdictLabel(verdict) {
  if (verdict === 'PASS') return '✓ PASS';
  if (verdict === 'FAIL') return '✗ FAIL';
  return '— NO TEXT';
}

export function buildMarkdown(entries, timestamp) {
  const lines = [];
  lines.push('# Image Colour Contrast Audit');
  lines.push('');
  lines.push(`_Generated ${timestamp}_`);
  lines.push('');
  lines.push('---');
  lines.push('');

  lines.push('## Summary');
  lines.push('');
  lines.push('| Image | Result |');
  lines.push('|-------|--------|');
  for (const e of entries) {
    const a = anchor(e.filename);
    lines.push(`| [${e.filename}](#${a}) | ${verdictLabel(e.report.verdict)} |`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Accessibility Detail');
  lines.push('');

  entries.forEach((entry, idx) => {
    const { filename, sourceCanvas, report } = entry;
    lines.push(`### ${idx + 1}. Image Colour Contrast`);
    lines.push('');
    lines.push(`**${filename}**`);
    lines.push('');
    lines.push(`- Result: ${verdictLabel(report.verdict)} — ${report.detail}`);
    lines.push('');
    lines.push(`![${filename}](${sourceDataUrl(sourceCanvas)})`);
    lines.push('');

    if (report.hasText && report.colourPairs.length) {
      lines.push('**Colour combinations detected:**');
      lines.push('');
      lines.push('| Swatch (bg · fg) | Foreground | Background | Ratio | AA | AAA | Check | Example words |');
      lines.push('|-----------------|-----------|-----------|-------|-----|-----|-------|---------------|');
      const assetByPair = new Map();
      for (const a of entry.pairAssets || []) assetByPair.set(a.pair, a);
      for (const p of report.colourPairs) {
        const asset = assetByPair.get(p);
        const swatchMd = asset ? `![](${asset.swatchDataUrl})` : '';
        const aa = p.pass ? '✓ Pass' : '✗ Fail';
        const aaa = p.passAaa ? '✓ Pass' : '✗ Fail';
        const webaim = `[WebAIM ↗](https://webaim.org/resources/contrastchecker/?fcolor=${p.fgHex.slice(1)}&bcolor=${p.bgHex.slice(1)})`;
        const examples = p.examples.map((e) => `"${e}"`).join(', ');
        lines.push(`| ${swatchMd} | \`${p.fgHex}\` | \`${p.bgHex}\` | ${p.contrast.toFixed(2)}:1 | ${aa} | ${aaa} | ${webaim} | ${examples} |`);
      }
      lines.push('');

      const failing = report.colourPairs.filter((p) => !p.pass);
      if (failing.length) {
        lines.push('**Failing regions:**');
        lines.push('');
        for (const p of failing) {
          const asset = assetByPair.get(p);
          lines.push(`\`${p.fgHex}\` on \`${p.bgHex}\` — ${p.contrast.toFixed(2)}:1`);
          lines.push('');
          if (asset?.clipDataUrl) {
            lines.push(`![Failing region clip](${asset.clipDataUrl})`);
            lines.push('');
          }
        }
      }
    }

    lines.push('');
  });

  lines.push(`> ${THRESHOLDS_FOOTER}`);
  lines.push('');
  return lines.join('\n');
}

export function downloadMarkdown(markdown, filename) {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  triggerDownload(blob, filename);
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
