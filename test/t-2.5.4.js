const { open } = require('./helpers');
(async () => {
  const H = await open('Lab_2.5.4_Filesystem_and_Permissions_Simulation.html');
  const { page } = H;
  const out = async (n = 900) => (await H.win().locator('.term-entry').last().innerText()).slice(0, n);
  const t = async (c, n) => { await H.term(c); console.log('$ ' + c + '\n' + await out(n)); };
  try {
    await H.start('terminal');
    await t('lsblk'); await t('mount', 500); await t('mount | grep sda1');
    await t('cd /'); await t('ls -l', 400);
    await t('cd ~'); await t('ls -l second_drive/');
    await t('mount /dev/sdb1 ~/second_drive/');
    await H.term('sudo mount /dev/sdb1 ~/second_drive/'); await t('cyberops');
    await t('ls -l second_drive/'); await t('mount | grep /dev/sd');
    await t('cd second_drive'); await t('sudo umount /dev/sdb1'); await t('cd ~'); await t('sudo umount /dev/sdb1'); await t('ls -l second_drive/');
    await t('cd lab.support.files/scripts/'); await t('ls -l', 400);
    await t('touch /mnt/myNewFile.txt'); await t('ls -ld /mnt');
    await t('sudo mount /dev/sdb1 ~/second_drive/'); await t('cd ~/second_drive'); await t('ls -l');
    await t('chmod 665 myFile.txt'); await t('echo test >> myFile.txt');
    await t('sudo chmod 665 myFile.txt'); await t('ls -l');
    await t('sudo chown analyst myFile.txt'); await t('ls -l'); await t('echo test >> myFile.txt'); await t('cat myFile.txt');
    await t('cd ~/lab.support.files/'); await t('ls -l', 600);
    await t('cd ~'); await t('ls -l /dev/', 700);
    await t('echo "symbolic" > file1.txt'); await t('echo"hard" > file2.txt'); await t('echo "hard" > file2.txt');
    await t('ln -s file1.txt file1symbolic'); await t('ln file2.txt file2hard'); await t('ls -l');
    await t('mv file1.txt file1new.txt'); await t('mv file2.txt file2new.txt');
    await t('cat file1symbolic'); await t('cat file2hard'); await t('ls -l');
    await t('stat file2hard');
    await H.axe('end');
    await H.report('2.5.4');
  } catch (e) { console.log('FAIL', e.message.slice(0, 500)); await H.report('2.5.4'); }
  await H.browser.close();
})();
