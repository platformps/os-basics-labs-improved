/* Lab 3.1.3 screen reader edition: learners check off tasks themselves. */
Lab.init({
  id: '3.1.3-real', title: 'Lab 3.1.3 Mobile Wi-Fi, Screen Reader Edition', onReset: () => location.reload(),
  tasks: [
    { id: 'find', label: 'Open the Wi-Fi settings with your screen reader' },
    { id: 'off', label: 'Turn Wi-Fi off and on again' },
    { id: 'forget', label: 'Forget your network' },
    { id: 'join', label: 'Join the network again with the password' }
  ]
});
