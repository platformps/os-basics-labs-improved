const { open } = require('./helpers');
(async () => {
  const H = await open('Lab_2.2.7_Linux_Shell_Simulation.html');
  const { page } = H;
  const out = async () => (await H.win().locator('.term-entry').last().innerText()).slice(0, 500);
  try {
    await H.start('terminal');
    for (const c of ['man man', 'man cp', 'man pwd', 'pwd', 'cd /home/analyst', 'ls -l', 'mkdir cyops_folder1', 'mkdir cyops_folder2', 'mkdir cyops_folder3', 'cd /home/analyst/cyops_folder3', 'cd ~', 'mkdir /home/analyst/cyops_folder3/cyops_folder4', 'ls \u2013l /home/analyst/cyops_folder3', 'ls -la /home/analyst/cyops_folder3', 'cd /home/analyst/cyops_folder3', 'cd .', 'cd ..', 'pwd', 'cd ..', 'pwd', 'cd ..', 'cd ..', 'pwd', 'cd /home/analyst/',
      'echo This is a message echoed to the terminal by echo.', 'echo This is a message echoed to the terminal by echo. > some_text_file.txt', 'ls -l some_text_file.txt', 'echo This is a DIFFERENT message, once again echoed to the terminal by echo. > some_text_file.txt', 'cat some_text_file.txt',
      'echo This is another line of text. It will be APPENDED to the output file. >> some_text_file.txt', 'cat some_text_file.txt', 'ls -l', 'ls -la', 'man ls', 'cp some_text_file.txt cyops_folder2/', 'ls cyops_folder2/', 'rm some_text_file.txt', 'rm cyops_folder1', 'rm -r cyops_folder1', 'mv cyops_folder2/some_text_file.txt .', 'ls -l cyops_folder2/', 'rm -r cyops_folder2', 'ls -l', 'foo', 'cat nofile']) {
      await H.term(c, 60);
      if (/^(ls -l$|pwd|cat some|ls -la \/|ls \u2013l|rm cyops|foo|cat nofile|ls -l some)/.test(c)) console.log(await out());
    }
    await H.axe('end');
    await H.report('2.2.7');
  } catch (e) { console.log('FAIL', e.message.slice(0, 500)); await H.report('2.2.7'); }
  await H.browser.close();
})();
