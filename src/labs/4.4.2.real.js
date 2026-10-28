/* Lab 4.4.2 real-phone edition: learners check off tasks themselves. */
Lab.init({
  id: '4.4.2-real', title: 'Lab 4.4.2 Passcode Locks, Screen Reader Edition', onReset: () => location.reload(),
  tasks: [
    { id: 'safe', label: 'Check the safety notes and the erase setting' },
    { id: 'set', label: 'Set (or use your existing) PIN or passcode' },
    { id: 'unlock', label: 'Lock and unlock with it' },
    { id: 'wrong', label: 'Enter wrong codes until the phone makes you wait' },
    { id: 'bio', label: 'Try fingerprint or face unlock, if available' },
    { id: 'clean', label: 'Clean up (only if you had no lock before)' }
  ]
});
