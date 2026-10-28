const { open } = require('./helpers');
(async () => {
  const H = await open('Lab_2.4.4_Locating_Log_Files_Simulation.html');
  const { page } = H;
  const out = async (n = 700) => (await H.win().locator('.term-entry').last().innerText()).slice(0, n);
  try {
    await H.start('terminal');
    await H.term('cat /var/log/logstash-tutorial.log'); console.log(await out(300));
    await H.term('more /var/log/messages'); console.log(await out(200));
    await H.term('sudo more /var/log/messages'); await H.term('cyberops', 150); console.log((await out(2000)).split('\n').filter(l => /May 19 04/.test(l)).length, 'May lines');
    await H.term('man nginx'); await H.term('ps ax | grep nginx'); console.log(await out());
    await H.term('ls /etc'); await H.term('ls -l /etc/nginx/'); console.log(await out(400));
    await H.term('cat /etc/nginx/nginx.conf');
    await H.term('ls -l /var/log/'); console.log(await out(1500));
    await H.term('ls -l /var/log/nginx'); console.log(await out());
    await H.term('sudo ls -l /var/log/nginx'); console.log(await out());
    await H.term('sudo tail /var/log/nginx/access.log'); await H.term('sudo tail \u2013n 5 /var/log/nginx/access.log'); console.log(await out());
    await H.term('sudo tail -f/var/log/nginx/access.log'); console.log(await out());
    await H.term('sudo tail -f /var/log/nginx/access.log');
    await H.start('firefox'); const a = H.win().getByLabel('Address bar'); await a.fill('127.0.0.1'); await a.press('Enter'); await page.waitForTimeout(400);
    await H.win().getByRole('button', { name: /^Reload/ }).click(); await page.waitForTimeout(400);
    await H.taskbar(/^Terminal/); console.log('follow:', await out(1500));
    await H.win().getByRole('button', { name: /^Stop command/ }).click();
    await H.term('journalctl'); console.log(await out(500));
    await H.term('sudo journalctl'); await H.term('sudo journalctl -b'); await H.term('sudo journalctl \u2013b -2'); console.log(await out(300));
    await H.term('sudo journalctl \u2013-list-boots'); console.log(await out(900));
    await H.term("sudo journalctl --since '2 hours ago'"); console.log(await out(900));
    await H.term('sudo journalctl -u nginx.service'); console.log(await out(900));
    await H.term('sudo journalctl -u nginx.service -f');
    await H.taskbar(/Firefox/); await H.win().getByRole('button', { name: /^Reload/ }).click(); await page.waitForTimeout(500);
    await H.taskbar(/^Terminal/); console.log('jfollow:', await out(1500));
    await H.win().getByRole('button', { name: /^Stop command/ }).click();
    await H.axe('end');
    await H.report('2.4.4');
  } catch (e) { console.log('FAIL', e.message.slice(0, 500)); await H.report('2.4.4'); }
  await H.browser.close();
})();
