const { open } = require('./helpers');
(async () => { for (const f of require('fs').readdirSync(__dirname + '/../' + (process.env.DIST || 'dist') + '/labs')) for (const dark of [false, true]) {
  const H = await open(f, { dark }); if (await H.page.locator('.start-btn').count()) await H.start('a').catch(() => {});
  const v = await H.axe(`${f.slice(4, 10)} ${dark ? 'dark' : 'light'}`); if (H.errors.length) console.log('ERR', H.errors); await H.browser.close(); } })();
