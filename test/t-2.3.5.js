const { open } = require('./helpers');
(async () => {
  const H = await open('Lab_2.3.5_Port_Scanner_Simulation.html');
  const out = async (n = 900) => (await H.win().locator('.term-entry').last().innerText()).slice(0, n);
  try {
    await H.start('terminal');
    console.log('prompt:', await H.win().locator('.term-label').textContent());
    await H.term('nmap localhost'); console.log(await out());
    await H.term('nmap -sU localhost'); console.log(await out());
    await H.term('sudo nmap -su localhost'); await H.term('password', 150); console.log(await out());
    await H.term('sudo nmap -sU localhost'); console.log(await out());
    await H.term('nmap \u2013sV localhost'); await H.term('nmap \u2013A localhost'); console.log(await out(1500));
    await H.term('man nmap');
    await H.axe('end');
    await H.report('2.3.5');
  } catch (e) { console.log('FAIL', e.message.slice(0, 500)); await H.report('2.3.5'); }
  await H.browser.close();
})();
