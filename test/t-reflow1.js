const { open } = require('./helpers');
(async () => { for (const f of process.argv.slice(2)) { const H = await open(f, { width: +(process.env.W || 390) });
  const o = await H.page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth })); console.log(f.slice(0, 20), JSON.stringify(o)); await H.browser.close(); } })();
