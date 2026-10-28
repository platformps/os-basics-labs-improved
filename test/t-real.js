const { open } = require('./helpers');
(async () => {
  for (const f of require('fs').readdirSync(__dirname + '/../dist/labs').filter(x => /Edition/.test(x))) for (const dark of [false, true]) {
    const H = await open(f, { dark });
    await H.axe(f.slice(4, 9) + (dark ? ' dark' : ' light'));
    const n = await H.page.locator('#tasks input').count();
    await H.page.locator('#tasks input').first().check(); await H.page.waitForTimeout(100);
    console.log('tasks', n, 'progress:', await H.page.locator('#progress-text').innerText(), 'jumps:', await H.page.locator('a.jump').count(), 'sim:', await H.page.locator('#sim').count());
    if (H.errors.length) console.log('ERR', H.errors);
    await H.browser.close();
  }
})();
