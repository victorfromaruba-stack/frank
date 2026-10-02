// The app icons (img/icon-*.png) from img/brand/icon*.svg, and a review sheet of every mark.
//   node tools/brand/render.cjs [--sheet path.png]     (needs Playwright, like the showcase skill)
const fs = require('fs');
const path = require('path');
const L = require('../../.claude/skills/frank-showcase/scripts/lib.cjs');

const BRAND = path.join(__dirname, '../../img/brand');
const IMG = path.join(__dirname, '../../img');                    // the app's icons live in img/
const read = (n) => fs.readFileSync(path.join(BRAND, n), 'utf8');
const fill = (svg) => svg.replace(/ width="\d+" height="\d+"/, ' width="100%" height="100%" preserveAspectRatio="xMidYMid meet"');

async function main() {
  const a = L.args();
  const browser = await L.launch();
  const page = await browser.newPage();
  const icons = [['icon.svg', 180, 'icon-180.png'], ['icon.svg', 192, 'icon-192.png'], ['icon.svg', 512, 'icon-512.png'], ['icon-maskable.svg', 512, 'icon-maskable-512.png']];
  for (const [src, size, out] of icons) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent('<!doctype html><html><body style="margin:0;background:#012D12">' + fill(read(src)) + '</body></html>');
    await page.screenshot({ path: path.join(IMG, out) });
    console.log('ok   img/' + out);
  }
  if (a.sheet) {
    const card = (n, bg, h) => '<div style="background:' + bg + ';border-radius:28px;padding:56px;display:flex;align-items:center;justify-content:center;height:' + h + 'px">' +
      read(n).replace(/ width="\d+" height="\d+"/, ' style="max-width:100%;max-height:100%"') + '</div>';
    const html = '<!doctype html><html><body style="margin:0;padding:48px;background:#e9eeeb;font:600 22px system-ui;color:#0E2A1A">' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:32px">' +
      card('wellness-by-frank-dark.svg', '#012D12', 260) + card('wellness-by-frank-light.svg', '#ffffff', 260) +
      card('w-by-frank-dark.svg', '#012D12', 260) + card('w-by-frank-light.svg', '#ffffff', 260) + '</div>' +
      '<div style="display:flex;gap:40px;margin-top:40px;align-items:flex-end">' +
      [180, 120, 60].map((s) => '<div style="text-align:center"><div style="width:' + s + 'px;height:' + s + 'px;border-radius:' + (s * 0.225) + 'px;overflow:hidden">' + fill(read('icon.svg')) + '</div><div style="margin-top:10px">' + s + ' px</div></div>').join('') +
      '<div style="text-align:center"><div style="width:180px;height:180px;border-radius:50%;overflow:hidden">' + fill(read('icon-maskable.svg')) + '</div><div style="margin-top:10px">Android, round</div></div>' +
      '</div></body></html>';
    await page.setViewportSize({ width: 1800, height: 1000 });
    await page.setContent(html);
    await page.screenshot({ path: path.resolve(a.sheet), fullPage: true });
    console.log('ok   ' + a.sheet);
  }
  await browser.close();
}
main().catch((e) => { console.error(e.message); process.exit(1); });
