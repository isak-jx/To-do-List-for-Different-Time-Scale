const fs = require('node:fs');
const path = require('node:path');
function exportOriginal() {
  if (location.origin !== 'https://to-do-list-for-different-time-scale.vercel.app') {
    alert('请在原 FocusFlow 网站点击此书签。'); return;
  }
  try {
    const data = {version: 1};
    for (const key of ['tasks','longTermLists','dailyNotes','weeklyNotes','logTags','logEntries']) {
      const raw = localStorage.getItem(key);
      data[key] = raw ? JSON.parse(raw) : ['dailyNotes','weeklyNotes'].includes(key) ? {} : [];
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type:'application/json'}));
    const a = document.createElement('a'); a.href = url; a.download = 'focusflow-backup.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (_) { alert('导出失败，原数据未修改。'); }
}
const href = 'javascript:' + encodeURIComponent('(' + exportOriginal.toString() + ')()');
const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FocusFlow 数据导出</title><style>body{font:18px/1.8 system-ui;max-width:720px;margin:80px auto;padding:24px;color:#202438;background:#f7f8fc}a{display:inline-block;padding:12px 24px;background:#4f46e5;color:white;border-radius:12px;text-decoration:none}p{margin:24px 0}</style><h1>导出原 FocusFlow 数据</h1><p>把下面的按钮拖到浏览器书签栏，然后在原 FocusFlow 网站点击这个书签。</p><a href="${href}">导出 FocusFlow 数据</a><p>会下载包含任务、长期列表、每日与每周复盘、日志和标签的 JSON 文件。只读取原网站的六个已知存储键，不修改数据，不发送网络请求。</p><p>随后在 Google Calendar 插件的“数据 / 归档 → 导入旧数据”中粘贴 JSON，预览并确认。</p></html>`;
const output = process.argv[2] || path.join(__dirname, 'export-bookmark.html');
fs.writeFileSync(output, html, 'utf8');
console.log('Export helper written: ' + output);
