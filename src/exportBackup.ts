/** Read only the six FocusFlow storage keys; never export unrelated browser data. */
export function exportBackup() {
  const arrayKeys = ['tasks', 'longTermLists', 'logTags', 'logEntries'];
  const recordKeys = ['dailyNotes', 'weeklyNotes'];
  const data: Record<string, unknown> = { version: 1 };
  try {
    for (const key of [...arrayKeys, ...recordKeys]) {
      const raw = localStorage.getItem(key);
      data[key] = raw ? JSON.parse(raw) : arrayKeys.includes(key) ? [] : {};
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `focusflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    alert('Backup could not be exported. Your saved data has not been changed.');
  }
}
