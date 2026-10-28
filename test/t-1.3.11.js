const { open } = require('./helpers');
(async () => {
  const H = await open('Lab_1.3.11_Using_Windows_PowerShell_Simulation.html');
  const { page } = H;
  try {
    await H.start('powershell', 'Windows PowerShell');
    await H.term('dir'); await H.term('ipconfig');
    await H.start('command prompt', 'Command Prompt');
    await H.term('dir'); await H.term('cd Documents'); await H.term('dir');
    console.log('cmd prompt label:', await H.win().locator('.term-label').textContent());
    await H.taskbar('Windows PowerShell');
    await H.term('Get-Alias dir');
    console.log(await H.win().locator('.term-entry').last().innerText());
    await H.term('netstat \u2013h');
    await H.term('netstat /?'); await H.term('netstat -r');
    await H.term('netstat -abno');
    console.log('nonadmin:', (await H.win().locator('.term-entry').last().innerText()).slice(0, 120));
    await H.term('foo-bar');
    await H.start('powershell'); 
    await page.locator('#start-results').getByRole('button', { name: 'Run Windows PowerShell as administrator' }).click().catch(()=>{});
    await H.start('powershell', 'Windows PowerShell').catch(()=>{});
    await H.axe('ps');
    // proper admin open
    await H.sim.getByRole('button', { name: 'Start', exact: true }).click();
    await page.fill('#start-q', 'powershell'); await page.locator('#start-results').getByRole('button', { name: 'Run Windows PowerShell as administrator' }).click();
    await H.uacYes();
    console.log('title:', await H.win().locator('h3').textContent());
    await H.term('netstat -abno');
    await H.start('task manager');
    await H.win().getByRole('tab', { name: 'Details' }).click(); await page.waitForTimeout(100);
    const j = H.win().getByLabel('Jump to PID'); await j.fill('756'); await j.press('Enter'); await page.waitForTimeout(100);
    console.log('status:', await H.status());
    await H.actions(); await H.menuItem('Properties');
    console.log((await H.dlg().innerText()).slice(0, 200)); await H.dlgBtn('OK');
    await H.axe('taskmgr details');
    await H.start('recycle bin');
    await H.taskbar('Administrator: Windows PowerShell');
    await H.term('Clear-RecycleBin'); await H.term('Y');
    await H.taskbar('Recycle Bin');
    console.log('recycle:', await H.win().locator('.count').textContent());
    await H.report('1.3.11');
  } catch (e) { console.log('FAIL', e.message.split('\n')[0]); await H.report('1.3.11'); await page.screenshot({ path: 'test/fail.png' }); }
  await H.browser.close();
})();
