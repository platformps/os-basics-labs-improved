/* Lab 4.3.4 real-phone edition: learners check off tasks themselves. */
Lab.init({
  id: '4.3.4-real', title: 'Lab 4.3.4 Mobile Device Features, Screen Reader Edition', onReset: () => location.reload(),
  tasks: [
    { id: 'rot', label: 'Rotate the phone with rotation locked and unlocked' },
    { id: 'bright', label: 'Change brightness and try automatic brightness' },
    { id: 'display', label: 'Explore the display settings' },
    { id: 'loc', label: 'Turn location off and on, and locate yourself in Maps' },
    { id: 'geo', label: 'Check which apps use your location, including the Camera' }
  ]
});
