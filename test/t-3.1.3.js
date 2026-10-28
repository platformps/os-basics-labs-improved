const { open } = require('./helpers');
(async () => {
  const H = await open('Lab_3.1.3_Mobile_WiFi_Simulation.html');
  const { page, sim } = H;
  const ph = () => sim.locator('section.phone:visible');
  const b = async (name, w = 150) => { await ph().getByRole('button', { name, exact: true }).first().click(); await page.waitForTimeout(w); };
  const sw = async (name, w = 1900) => { await ph().getByRole('switch', { name }).first().click(); await page.waitForTimeout(w); };
  const toast = async () => console.log('  toast:', await ph().locator('.m-toast').innerText(), '| status:', await ph().locator('.phone-status').innerText());
  try {
    await H.axe('initial');
    await b('All apps'); await b('Settings'); await ph().getByRole('button', { name: /^Connections/ }).click(); await page.waitForTimeout(150);
    await sw('Wi-Fi', 200); await toast(); await sw('Wi-Fi'); await toast();
    await ph().locator('.m-row', { hasText: /^Wi-Fi/ }).click(); await page.waitForTimeout(150);
    await H.axe('android wifi');
    await ph().locator('.m-row', { hasText: /^HomeNet/ }).click(); await page.waitForTimeout(150);
    await b('Forget'); await toast();
    await ph().locator('.m-row', { hasText: /^HomeNet/ }).click(); await page.waitForTimeout(150);
    await H.dlg().getByLabel('Password', { exact: true }).fill('wrongpass1'); await H.dlgBtn('Connect'); await page.waitForTimeout(1000); await toast();
    console.log('row:', await ph().locator('.m-row', { hasText: /^HomeNet/ }).innerText());
    await ph().locator('.m-row', { hasText: /^HomeNet/ }).click(); await page.waitForTimeout(150);
    await H.dlg().getByLabel('Password', { exact: true }).fill('NetLab2026!'); await H.axe('android pw'); await H.dlgBtn('Connect'); await page.waitForTimeout(1000); await toast();
    await sim.getByRole('radio', { name: 'iPhone' }).check(); await page.waitForTimeout(100);
    await b('Settings'); await ph().locator('.m-row', { hasText: /^Wi-Fi/ }).click(); await page.waitForTimeout(150);
    await sw('Wi-Fi', 200); await sw('Wi-Fi'); await toast();
    await H.axe('ios wifi');
    await b('More info, HomeNet'); await b('Forget This Network'); console.log('alert:', await H.dlg().innerText()); await H.dlgBtn('Forget'); await toast();
    await ph().locator('.m-row', { hasText: /^HomeNet/ }).click(); await page.waitForTimeout(150);
    console.log('join disabled:', await H.dlg().getByRole('button', { name: 'Join' }).isDisabled());
    await H.dlg().getByLabel('Password', { exact: true }).fill('NetLab2026!'); await H.dlgBtn('Join'); await page.waitForTimeout(1000); await toast();
    await H.axe('end');
    await H.report('3.1.3');
  } catch (e) { console.log('FAIL', e.message.slice(0, 600)); await H.report('3.1.3'); }
  await H.browser.close();
})();
