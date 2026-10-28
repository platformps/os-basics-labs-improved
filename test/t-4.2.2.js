const { open } = require('./helpers');
(async () => {
  const H = await open('Lab_4.2.2_Working_with_Android_Simulation.html');
  const { page, sim } = H;
  const ph = () => sim.locator('section.phone');
  const b = async (name, w = 150) => { await ph().getByRole('button', { name, exact: true }).first().click(); await page.waitForTimeout(w); };
  const act = async (item, choice) => { await ph().getByRole('button', { name: `Actions for ${item}`, exact: true }).first().click(); await page.waitForTimeout(80); await H.dlg().getByRole('button', { name: choice }).click(); await page.waitForTimeout(150); };
  const place = async (screen, r, c) => { const d = H.dlg(); if (screen) await d.getByLabel('Screen').selectOption({ label: screen }); if (r) { await d.getByLabel('Row').selectOption(r); await d.getByLabel('Column').selectOption(c); } await H.dlgBtn('Place here'); };
  const toast = async () => console.log('  toast:', await ph().locator('.m-toast').innerText());
  const home = async () => console.log('  home:', (await ph().locator('.hs-grid').innerText()).replace(/\n+/g, ' | '));
  try {
    await home();
    await b('All apps'); await act('Calculator', 'Add to Home screen'); await place(null); await toast();
    await H.axe('apps');
    await b('Home'); await b('Home screen options (touch and hold empty space)'); await H.dlgBtn('Widgets');
    await ph().getByRole('button', { name: /^Schedule/ }).click(); await page.waitForTimeout(100); await place('Home screen 1'); await toast();
    await b('Home screen options (touch and hold empty space)'); await H.dlgBtn('Widgets');
    await ph().getByRole('button', { name: /^Fit daily goals/ }).click(); await page.waitForTimeout(100); await place('Home screen 1', '3', '0'); console.log('err:', await H.dlg().locator('.dlg-error').innerText()); await place('Home screen 2'); await toast(); await b('Previous screen'); await home();
    await H.axe('home');
    await act('YouTube', 'Move to another screen or position'); await place('Home screen 2'); await toast();
    await b('Previous screen');
    await act('Drive', 'Remove'); await toast();
    await act('Calculator', 'Create folder with Photos'); await toast(); await home();
    await ph().getByRole('button', { name: /^Folder: Unnamed folder/ }).click(); await page.waitForTimeout(100);
    await ph().getByLabel('Folder name').fill('ITE Apps Folder'); await b('Save name'); await toast();
    await H.axe('folder');
    await b('Back'); await home();
    await ph().getByRole('button', { name: /^Folder: ITE Apps Folder/ }).click(); await page.waitForTimeout(100);
    await act('Photos', 'Move out of folder to the home screen'); await toast(); await home();
    await ph().getByRole('button', { name: /^Play Store/ }).first().click(); await page.waitForTimeout(150); await ph().getByLabel('Search for apps and games').fill('LastPass'); await b('Search');
    await ph().getByRole('button', { name: /^LastPass Password Manager/ }).click(); await page.waitForTimeout(100);
    await b('Install', 1700); await toast();
    await H.axe('play');
    await b('Home'); await b('All apps'); await act('LastPass', 'Uninstall'); console.log('dlg:', await H.dlg().innerText()); await H.dlgBtn('OK'); await toast();
    await H.axe('end');
    await H.report('4.2.2');
  } catch (e) { console.log('FAIL', e.message.slice(0, 600)); await H.report('4.2.2'); }
  await H.browser.close();
})();
