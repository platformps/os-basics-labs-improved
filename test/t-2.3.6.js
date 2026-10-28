const { open } = require('./helpers');
(async () => {
  const H = await open('Lab_2.3.6_Linux_Servers_Simulation.html');
  const { page } = H;
  const out = async () => (await H.win().locator('.term-entry').last().innerText()).slice(0, 900);
  try {
    await H.start('terminal');
    await H.term('sudo ps \u2013elf'); await H.term('cyberops', 200);
    console.log((await out()).split('\n').slice(0, 6).join('\n'));
    await H.term('sudo /usr/sbin/nginx'); await H.term('sudo ps -ejH'); console.log((await out()).split('\n').slice(-12).join('\n'));
    await H.term('netstat'); await H.term('man netstat'); await H.term('netstat -tunap'); console.log(await out());
    await H.term('sudo netstat -tunap'); console.log(await out());
    await H.term('sudo ps -elf | grep 395'); console.log(await out());
    await H.term('telnet 127.0.0.1 80'); await H.term('fdsafsdaf'); console.log(await out());
    await H.term('telnet 127.0.0.1 22'); await H.term('sdfjlskj'); console.log(await out());
    await H.term('telnet 127.0.0.1 68'); console.log(await out());
    await H.axe('end');
    await H.report('2.3.6');
  } catch (e) { console.log('FAIL', e.message.slice(0, 500)); await H.report('2.3.6'); }
  await H.browser.close();
})();
