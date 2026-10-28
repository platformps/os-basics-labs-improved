const { open } = require('./helpers');
(async () => {
  const H = await open('Lab_2.7.8_Configure_Security_Features_Simulation.html');
  const { page } = H;
  const out = async (n = 600) => (await H.win().locator('.term-entry').last().innerText()).slice(0, n);
  const t = async (c, w = 200, n = 600) => { await H.term(c, w); console.log('$ ' + c + '\n' + await out(n)); };
  const vbox = async () => { await H.taskbar(/^Oracle VirtualBox/); };
  const stop = async () => { await H.win().getByRole('button', { name: /^Stop command/ }).click(); await page.waitForTimeout(150); };
  const setPol = async (name, val) => {
    await H.rowExact(name); await H.win().getByRole('button', { name: 'Properties', exact: true }).click(); await page.waitForTimeout(100);
    const d = H.dlg();
    if (typeof val === 'boolean') await d.getByLabel(val ? 'Enabled' : 'Disabled', { exact: true }).check();
    else await d.locator('input[type=number]').fill(String(val));
    await H.dlgBtn('OK'); await page.waitForTimeout(100);
    if (await page.locator('dialog[open]').count()) { const tx = await H.dlg().innerText(); console.log('DLG:', tx.slice(0, 400)); await H.dlgBtn(/Suggested/.test(tx) ? 'OK' : 'Cancel'); }
  };
  try {
    await H.axe('initial');
    // Part 1
    await H.start('virtualbox'); await H.rowExact('CSE-LABVM');
    await H.win().getByRole('button', { name: 'Start', exact: true }).click(); await page.waitForTimeout(1100);
    await t('ip address'); await t('ping -c 2 192.168.1.15', 2500);
    await H.win().getByRole('button', { name: 'File' }).click(); await H.menuItem('Close...'); await H.dlg().getByLabel('Power off the machine').check(); await H.dlgBtn('OK');
    await vbox(); await H.win().getByRole('button', { name: 'Settings', exact: true }).click();
    await H.dlg().getByLabel('Attached to').selectOption('Bridged Adapter'); await H.dlgBtn('OK');
    await H.win().getByRole('button', { name: 'Start', exact: true }).click(); await page.waitForTimeout(1100);
    await t('ip address');
    await H.win().getByRole('button', { name: 'File' }).click(); await H.menuItem('Close...'); await H.dlg().getByLabel('Power off the machine').check(); await H.dlgBtn('OK');
    await vbox(); await H.win().getByRole('button', { name: 'Settings', exact: true }).click();
    await H.dlg().getByLabel('Attached to').selectOption('Bridged Adapter'); await H.dlg().getByLabel(/^Name/).selectOption('Realtek PCIe GbE Family Controller'); await H.dlgBtn('OK');
    await H.axe('vbox');
    await H.win().getByRole('button', { name: 'Start', exact: true }).click(); await page.waitForTimeout(1100);
    await t('ip address', 200, 900);
    await t('ping www.cisco.com', 2200); await stop(); console.log(await out());
    await t('ping 192.168.1.15', 2000); await stop(); console.log(await out(900));
    await H.start('command prompt'); await t('ipconfig', 200, 900); await t('ping 192.168.1.31', 3500); await t('ping www.cisco.com', 4500, 200);
    // Windows Update
    await H.start('check for updates'); await H.win().getByRole('button', { name: 'Check for updates' }).click(); await page.waitForTimeout(1400);
    await H.win().getByRole('button', { name: 'Advanced options' }).click(); console.log((await H.win().innerText()).slice(0, 400));
    // apt
    await H.taskbar(/CSE-LABVM/);
    await t('apt-get', 150, 200); await t('apt-get update'); await t('sudo apt-get update'); await t('password', 1800, 900);
    await t('sudo apt-get upgrade', 1200, 900); await t('y', 2600, 300);
    // Part 2
    await H.start('local security policy'); await H.uacYes();
    await H.axe('secpol');
    await setPol('Enforce password history', 2); await setPol('Minimum password age', 100); await setPol('Maximum password age', 90); await setPol('Minimum password age', 1);
    await setPol('Minimum password length', 8); await setPol('Password must meet complexity requirements', true); await setPol('Store passwords using reversible encryption', false);
    console.log((await H.win().locator('table').innerText()));
    await H.start('change your password'); await H.win().getByRole('button', { name: 'Change', exact: true }).click();
    await H.dlg().getByLabel('Current password').fill('Cisco123!'); await H.dlgBtn('Next');
    await H.dlg().getByLabel('New password').fill('abc'); await H.dlg().getByLabel('Confirm password').fill('abc'); await H.dlg().getByLabel('Password hint').fill('x'); await H.dlgBtn('Next');
    console.log('pw:', await H.dlg().locator('.dlg-error').innerText()); await H.dlgBtn('Cancel');
    await H.taskbar(/^Local Security Policy/);
    await H.win().getByRole('button', { name: /^Account Lockout Policy/ }).click(); await page.waitForTimeout(100);
    console.log(await H.win().locator('table').innerText());
    await setPol('Reset account lockout counter after', 30);
    await setPol('Account lockout threshold', 5);
    await H.win().getByRole('button', { name: /^Local Policies/ }).click(); await H.win().getByRole('button', { name: /^Audit Policy/ }).click(); await page.waitForTimeout(100);
    await H.rowExact('Audit account logon events'); await H.win().getByRole('button', { name: 'Properties', exact: true }).click();
    await H.dlg().getByRole('tab', { name: 'Explain' }).click(); await H.axe('audit props'); await H.dlgBtn('OK');
    // Part 3
    await H.start('windows defender firewall'); await H.win().getByRole('button', { name: /^Allow an app/ }).click(); await H.dlgBtn('Cancel');
    await H.win().getByRole('button', { name: 'Advanced settings' }).click(); await H.uacYes();
    await H.win().getByRole('button', { name: 'New Rule...' }).click();
    await H.dlg().getByLabel(/^Custom/).check(); await H.dlgBtn('Next'); await H.dlgBtn('Next');
    await H.dlg().getByLabel('Protocol type').selectOption('ICMPv4'); await H.dlg().getByRole('button', { name: 'Customize...' }).click();
    await H.dlg().getByLabel('Specific ICMP types', { exact: true }).check(); await H.dlg().getByLabel('Echo Request', { exact: true }).check(); await H.dlgBtn('OK');
    await H.axe('wizard');
    await H.dlgBtn('Next'); await H.dlgBtn('Next'); await H.dlgBtn('Next');
    await H.dlg().getByLabel(/^Public/).uncheck(); await H.dlgBtn('Next');
    await H.dlgBtn('Finish'); console.log('err:', await H.dlg().locator('.dlg-error').innerText());
    await H.dlg().getByLabel('Name', { exact: true }).fill('Allow ICMPv4 Echo Request'); await H.dlgBtn('Finish');
    console.log((await H.win().locator('table').innerText()).slice(0, 300));
    await H.axe('wfas');
    await H.taskbar(/CSE-LABVM/); await t('ping -c 3 192.168.1.15', 3200, 900);
    // Part 4
    await t('chkrootkit'); await t('sudo apt install chkrootkit', 2000); await t('chkrootkit'); await t('sudo chkrootkit | grep -i worm', 300, 1200);
    await t('sudo apt install lynis', 2000, 1200); await t('lynis show version');
    await t('echo \'deb https://packages.cisofy.com/community/lynis/deb/ stable main\' | sudo tee /etc/apt/sources.list.d/cisofy-lynis.list');
    await t('sudo apt-get update', 2200, 1500);
    await t('sudo apt-key adv --keyserver keyserver.ubuntu.com --recv- keys 013baa07180c50a7101097ef9de922f1c2fde6c4');
    await t('sudo apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 013baa07180c50a7101097ef9de922f1c2fde6c4');
    await t('sudo apt-get update', 2000, 1500); await t('sudo apt install lynis', 2000, 1200); await t('lynis show version'); await t('apt-cache policy lynis', 200, 900);
    await H.axe('end');
    await H.report('2.7.8');
  } catch (e) { console.log('FAIL', e.message.slice(0, 600)); await H.report('2.7.8'); }
  await H.browser.close();
})();
