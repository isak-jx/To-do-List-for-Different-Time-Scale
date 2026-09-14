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
    const json = JSON.stringify(data, null, 2);
    const dialog = document.createElement('dialog');
    dialog.style.cssText = 'padding:24px;border:0;border-radius:16px;width:min(720px,90vw)';
    const title = document.createElement('h2'); title.textContent = '备份已下载 · 复制到 Google 日历';
    const content = document.createElement('textarea'); content.value = json;
    content.readOnly = true; content.setAttribute('aria-label', '完整备份 JSON');
    content.style.cssText = 'width:100%;height:45vh;margin:16px 0;font:12px monospace';
    const close = document.createElement('button'); close.textContent = '关闭';
    close.onclick = () => dialog.close(); dialog.onclose = () => dialog.remove();
    dialog.append(title, content, close); document.body.append(dialog); dialog.showModal();
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `focusflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    alert('Backup could not be exported. Your saved data has not been changed.');
  }
}
