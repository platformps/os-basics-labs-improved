/* Lab 4.2.2 TalkBack edition: learners check off tasks themselves. */
Lab.init({
  id: '4.2.2-real', title: 'Lab 4.2.2 Working with Android, TalkBack Edition', onReset: () => location.reload(),
  tasks: [
    { id: 'shortcut', label: 'Add an app shortcut to the home screen' },
    { id: 'widget', label: 'Add a widget' },
    { id: 'move', label: 'Move an app to another screen' },
    { id: 'remove', label: 'Remove a shortcut and confirm the app is still installed' },
    { id: 'folder', label: 'Create and rename a folder' },
    { id: 'unfolder', label: 'Move an app out of the folder' },
    { id: 'install', label: 'Install LastPass' },
    { id: 'uninstall', label: 'Uninstall LastPass' }
  ]
});
