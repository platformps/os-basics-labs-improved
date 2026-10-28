const { open } = require('./helpers');
(async () => {
  const H = await open('Lab_2.0.4_Virtual_Machine_Simulation.html');
  const { page } = H;
  const go = async u => { const a = H.win().getByLabel('Address bar'); await a.fill(u); await a.press('Enter'); await page.waitForTimeout(100); };
  const doImport = async (file, newMac) => {
    await H.taskbar('Oracle VirtualBox Manager');
    await H.win().getByRole('button', { name: 'Import', exact: true }).click(); await page.waitForTimeout(100);
    await H.dlg().getByRole('button', { name: 'Browse...' }).click();
    await H.dlg().locator('label', { hasText: file }).click(); await H.dlgBtn('Open');
    await H.dlgBtn('Next');
    if (newMac) await H.dlg().getByLabel('MAC Address Policy').selectOption('new');
    await H.dlgBtn('Import'); await page.waitForTimeout(1800);
  };
  try {
    await H.axe('initial');
    await H.start('edge'); await go('www.virtualbox.org');
    await H.win().getByRole('button', { name: 'Download VirtualBox' }).click(); await page.waitForTimeout(100);
    await H.win().getByRole('button', { name: 'Windows hosts' }).click();
    await go('labvms.example/osb');
    await H.win().getByRole('button', { name: /CSE-LABVM.ova/ }).click(); await H.win().getByRole('button', { name: /Security_Workstation.ova/ }).click();
    await H.start('file explorer');
    const gi = H.win().getByLabel('Go to a folder path'); await gi.fill('C:\\Users\\CyberOpsUser\\Downloads'); await gi.press('Enter'); await page.waitForTimeout(100);
    await H.row('VirtualBox-7.1.4'); await H.actions(); await H.menuItem('Open');
    for (let i = 0; i < 3; i++) await H.dlgBtn('Next');
    await H.dlgBtn('Install'); await H.uacYes(); await page.waitForTimeout(1500);
    await H.axe('install finish');
    await H.dlgBtn('Finish'); await page.waitForTimeout(150);
    await doImport('CSE-LABVM.ova', true);
    console.log('status:', await H.status());
    await H.rowExact('CSE-LABVM'); await H.win().getByRole('button', { name: 'Start', exact: true }).click(); await page.waitForTimeout(1500);
    await H.axe('vm console');
    await H.win().getByRole('button', { name: 'Terminal' }).click(); await page.waitForTimeout(100);
    await H.term('ip address'); console.log(await H.win().locator('.term-entry').last().innerText());
    await H.win().getByRole('button', { name: 'Firefox Web Browser' }).click();
    await H.win().getByRole('button', { name: 'File' }).click(); await H.menuItem('Close...');
    console.log('opts:', await H.dlg().locator('label').allTextContents()); await H.dlgBtn('OK');
    await doImport('Security_Workstation.ova', true);
    await H.rowExact('Security Workstation'); await H.win().getByRole('button', { name: 'Start', exact: true }).click(); await page.waitForTimeout(150);
    console.log('err:', (await H.dlg().innerText()).slice(0, 200));
    await H.dlgBtn('Change Network Settings'); await H.dlg().getByLabel('Name').selectOption({ index: 0 }); await H.dlgBtn('OK'); await page.waitForTimeout(1500);
    await H.win().getByLabel('Password').fill('cyberops'); await H.win().getByRole('button', { name: 'Log in' }).click();
    await H.win().getByRole('button', { name: 'File' }).click(); await H.menuItem('Close...'); await H.dlgBtn('OK');
    console.log('inventory:', await H.win().locator('tbody tr').allInnerTexts());
    await H.axe('end');
    await H.report('2.0.4');
  } catch (e) { console.log('FAIL', e.message.slice(0, 600)); await H.report('2.0.4'); await page.screenshot({ path: 'test/fail.png' }); }
  await H.browser.close();
})();
