const { open } = require('./helpers');
(async () => {
  const H = await open('Lab_4.3.4_Mobile_Device_Features_Simulation.html');
  const { page, sim } = H;
  const ph = () => sim.locator('section.phone:visible');
  const b = async (name, w = 150) => { await ph().getByRole('button', { name, exact: true }).first().click(); await page.waitForTimeout(w); };
  const bx = async (re, w = 150) => { await ph().getByRole('button', { name: re }).first().click(); await page.waitForTimeout(w); };
  const sw = async name => { await ph().getByRole('switch', { name }).first().click(); await page.waitForTimeout(150); };
  const sl = async (label, v) => { const s = ph().getByLabel(label, { exact: true }).first(); await s.fill(String(v)); await s.dispatchEvent('change'); await page.waitForTimeout(100); };
  const toast = async () => console.log('  toast:', await ph().locator('.m-toast').innerText());
  try {
    await bx(/^Rotate the phone/); await toast(); await bx(/^Rotate the phone/);
    await bx(/^Swipe down from the top/); await sw('Auto rotate'); await bx(/^Rotate the phone/); await toast(); await bx(/^Rotate the phone/);
    await H.axe('panel');
    await sl('Brightness', 100); await toast(); await sl('Brightness', 0); await toast();
    await b('Home'); await bx(/^Settings/); await bx(/^Display/); await sw('Adaptive brightness'); await toast();
    await bx(/^Change the room lighting/); await H.dlg().getByLabel('A dark room').check(); await H.dlgBtn('OK'); await toast();
    await H.axe('display');
    await b('Back'); await bx(/^Location/); await sw('Use location'); await b('Home'); await bx(/^Maps/); await b('Show my location (crosshair)'); await H.dlgBtn('Turn on'); await toast();
    await sim.getByRole('radio', { name: 'iPhone' }).check();
    await bx(/^Swipe down from the top right/); await sw('Portrait Orientation Lock'); await sl('Display Brightness', 30); await toast();
    await b('Home (swipe up)'); await b('Calculator'); await bx(/^Rotate the iPhone/); await toast(); await bx(/^Rotate the iPhone/);
    await bx(/^Swipe down from the top right/); await sw('Portrait Orientation Lock'); await b('Back'); await bx(/^Rotate the iPhone/); await toast();
    await H.axe('ios calc');
    await b('Home (swipe up)'); await b('Settings'); await bx(/^Display and Brightness/); await sw('True Tone'); await sw('Bold Text'); await bx(/^Night Shift/); await toast();
    await H.axe('ios display');
    await b('Back'); await bx(/^Privacy and Security/); await bx(/^Location Services/); await bx(/^Camera/); await ph().getByLabel('Never').check(); await page.waitForTimeout(100); await toast();
    await b('Back'); await sw('Location Services'); await H.dlgBtn('Turn Off');
    await b('Home (swipe up)'); await b('Maps'); await bx(/^Current Location/); await H.dlgBtn('Settings'); await sw('Location Services');
    await b('Home (swipe up)'); await b('Maps'); await bx(/^Current Location/); await toast();
    await H.axe('end');
    await H.report('4.3.4');
  } catch (e) { console.log('FAIL', e.message.slice(0, 600)); await H.report('4.3.4'); }
  await H.browser.close();
})();
