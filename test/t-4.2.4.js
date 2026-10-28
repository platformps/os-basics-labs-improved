const { open } = require('./helpers');
(async () => {
  const H = await open('Lab_4.2.4_Working_with_iOS_Simulation.html');
  const { page, sim } = H;
  const ph = () => sim.locator('section.phone');
  const b = async (name, w = 150) => { await ph().getByRole('button', { name, exact: true }).first().click(); await page.waitForTimeout(w); };
  const bx = async (re, w = 150) => { await ph().getByRole('button', { name: re }).first().click(); await page.waitForTimeout(w); };
  const act = async (item, choice) => { await b(`Actions for ${item}`, 80); await H.dlg().getByRole('button', { name: choice }).click(); await page.waitForTimeout(150); };
  const toast = async () => console.log('  toast:', await ph().locator('.m-toast').innerText());
  try {
    await act('Contacts', 'Move to another page or position'); await H.dlg().getByLabel('Page').selectOption({ label: 'New page' }); await H.dlgBtn('Move'); await toast();
    await b('Previous page');
    await act('Stocks', 'Create folder with Calendar'); await toast();
    await H.axe('home');
    await bx(/^Folder: Productivity/); await ph().getByLabel('Folder name').fill('ITE Folder'); await b('Save name'); await toast();
    await act('Calendar', 'Move out of folder to the Home Screen'); await toast();
    await b('Home (swipe up)'); await bx(/^Folder: ITE Folder/); await act('Stocks', 'Move out of folder to the Home Screen'); await toast();
    await bx(/^App Store/); await b('Search'); await ph().getByLabel('Games, Apps, Stories, and More').fill('LastPass'); await b('Search');
    await bx(/^LastPass Password Manager/); await b('Get'); await H.dlg().getByLabel('Apple Account password').fill('wrong'); await H.dlgBtn('Install'); console.log('err:', await H.dlg().locator('.dlg-error').innerText());
    await H.dlg().getByLabel('Apple Account password').fill('Apple2026!'); await H.dlgBtn('Install'); await page.waitForTimeout(1700); await toast();
    await H.axe('store');
    await b('Home (swipe up)'); await b('Next page'); await act('LastPass', 'Remove App'); console.log('dlg:', (await H.dlg().innerText()).replace(/\n+/g, ' | ')); await H.dlgBtn('Delete App'); await H.dlgBtn('Delete'); await toast();
    await act('Contacts', 'Remove App'); console.log('dlg2:', (await H.dlg().innerText()).replace(/\n+/g, ' | ')); await H.dlgBtn('Cancel');
    await b('App Library (after the last page)'); await H.axe('library');
    await H.report('4.2.4');
  } catch (e) { console.log('FAIL', e.message.slice(0, 600)); await H.report('4.2.4'); }
  await H.browser.close();
})();
