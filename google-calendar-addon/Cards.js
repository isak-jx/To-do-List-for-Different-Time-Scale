/* Google Calendar desktop side panel. All user text is escaped before CardService rendering. */
function escape_(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function input_(e, name, fallback) {
  var f = ((e.commonEventObject || {}).formInputs || {})[name];
  return f && f.stringInputs ? (f.stringInputs.value || [''])[0] : (fallback === undefined ? '' : fallback);
}
function params_(e) { return Object.assign({}, e.parameters || {}, (e.commonEventObject || {}).parameters || {}); }
function zone_(e) { return ((e.commonEventObject || {}).timeZone || {}).id || 'Etc/UTC'; }
function today_(e) { return Utilities.formatDate(new Date(), zone_(e), 'yyyy-MM-dd'); }
function action_(fn, values) {
  var p = {}; Object.keys(values || {}).forEach(function (k) { if (values[k] != null) p[k] = String(values[k]); });
  return CardService.newAction().setFunctionName(fn).setParameters(p);
}
function button_(label, fn, values) { return CardService.newTextButton().setText(label).setOnClickAction(action_(fn, values)); }
function paragraph_(s, text) { s.addWidget(CardService.newTextParagraph().setText(escape_(text))); }
function field_(s, name, title, value, multi) {
  s.addWidget(CardService.newTextInput().setFieldName(name).setTitle(title).setValue(String(value || '')).setMultiline(Boolean(multi)));
}
function row_(s, label, fn, p) { s.addWidget(button_(label, fn, p)); }
function link_(s, text, url) {
  if (!/^https:\/\/calendar\.google\.com\//.test(url)) return;
  s.addWidget(CardService.newTextButton().setText(text).setOpenLink(CardService.newOpenLink().setUrl(url)));
}
function pages_(section, items, p, render) {
  var offset = Math.max(0, parseInt(p.offset || '0', 10) || 0), count = 12;
  items.slice(offset, offset + count).forEach(render);
  if (!items.length) paragraph_(section, '还没有内容。');
  var buttons = CardService.newButtonSet();
  if (offset) buttons.addButton(button_('上一页', 'navigate', Object.assign({}, p, {offset: Math.max(0, offset - count)})));
  if (offset + count < items.length) buttons.addButton(button_('下一页', 'navigate', Object.assign({}, p, {offset: offset + count})));
  if (offset || offset + count < items.length) section.addWidget(buttons);
}
function onHomepage(e) {
  try { return buildCard_(e || {}, {view: 'day', day: today_(e || {})}, readState_()); }
  catch (err) {
    var section = CardService.newCardSection(); paragraph_(section, err.message);
    row_(section, '重试', 'navigate', {view: 'day'});
    return CardService.newCardBuilder().setHeader(CardService.newCardHeader().setTitle('FocusFlow · 连接提示')).addSection(section).build();
  }
}
function notifyError_(err) { return CardService.newActionResponseBuilder().setNotification(CardService.newNotification().setText(err.message || '未完成，请重试。')).build(); }
function response_(card, message) {
  var b = CardService.newActionResponseBuilder().setNavigation(CardService.newNavigation().updateCard(card));
  if (message) b.setStateChanged(true);
  if (message) b.setNotification(CardService.newNotification().setText(message));
  return b.build();
}
function compactButtons_(section, items) {
  var set = CardService.newButtonSet();
  items.forEach(function (item) { set.addButton(button_(item[0], item[1], item[2])); });
  section.addWidget(set);
}
function navigate(e) {
  try {
    var p = params_(e);
    if (p.chooseDate) p.day = FF.date(input_(e, 'selectedDay', p.day));
    return response_(buildCard_(e, p, readState_(!p.forceRefresh)));
  } catch (err) { return notifyError_(err); }
}
function buildCard_(e, parameters, state) {
  var p = Object.assign({view: 'day', day: today_(e)}, parameters);
  FF.date(p.day);
  var card = CardService.newCardBuilder().setHeader(CardService.newCardHeader().setTitle('FocusFlow').setSubtitle(p.day + ' · ' + zone_(e)));
  var nav = CardService.newCardSection();
  compactButtons_(nav, [['今天', 'navigate', {view: 'day', day: p.day}], ['本周', 'navigate', {view: 'week', day: p.day}], ['长期列表', 'navigate', {view: 'lists', day: p.day}]]);
  compactButtons_(nav, [['更多', 'navigate', {view: 'more', day: p.day}], ['刷新', 'navigate', Object.assign({}, p, {forceRefresh: '1'})]]);
  card.addSection(nav);
  var s = CardService.newCardSection();
  var mutation = Object.assign({}, p, {revision: state.revision});
  function taskRow(t) { row_(s, (t.completed ? '☑ ' : '☐ ') + t.title, 'navigate', {view: 'task', id: t.id, day: p.day}); }
  if (p.view === 'day' || p.view === 'week') {
    field_(s, 'selectedDay', '查看日期 YYYY-MM-DD', p.day);
    row_(s, '切换日期', 'navigate', Object.assign({}, p, {chooseDate: '1', offset: 0}));
    var visible = state.tasks.filter(function (t) { return !t.archived && (p.view === 'week' ? t.scale === 'weekly' && t.date === FF.week(p.day) : (t.scale === 'daily' || t.scale === 'event') && t.date === p.day); });
    var done = visible.filter(function (t) { return t.completed; }).length;
    paragraph_(s, (p.view === 'week' ? '本周任务池 · ' + FF.week(p.day) + ' 起' : '当天任务') + '\n' + done + ' / ' + visible.length + ' 已完成');
    row_(s, '＋ 添加任务', 'navigate', {view: 'edit', scale: p.view === 'week' ? 'weekly' : 'daily', day: p.day});
    pages_(s, visible, p, taskRow);
  } else if (p.view === 'lists') {
    var activeLists = state.longTermLists.filter(function (l) { return !l.archived; });
    paragraph_(s, activeLists.length + ' 个长期列表\n长期目标保持独立，不会进入日程或日历。');
    field_(s, 'listName', '新列表名称', '');
    row_(s, '＋ 创建列表', 'mutate', Object.assign({}, mutation, {op: 'listAdd'}));
    pages_(s, activeLists, p, function (l) {
      var tasks = state.tasks.filter(function (t) { return !t.archived && t.scale === 'longterm' && t.parentLongtermId === l.id; });
      var done = tasks.filter(function (t) { return t.completed; }).length;
      row_(s, l.name + ' · ' + done + '/' + tasks.length + ' · ' + (tasks.length ? Math.round(done / tasks.length * 100) : 0) + '%', 'navigate', {view: 'list', listId: l.id, day: p.day});
    });
  } else if (p.view === 'list') {
    var list = state.longTermLists.find(function (l) { return l.id === p.listId; });
    if (!list) throw new Error('列表不存在。');
    field_(s, 'listName', '列表名称', list.name);
    row_(s, '保存名称', 'mutate', Object.assign({}, mutation, {op: 'listRename'}));
    row_(s, list.archived ? '恢复列表' : '归档列表', 'mutate', Object.assign({}, mutation, {op: 'listArchive', archived: list.archived ? '0' : '1'}));
    if (!list.archived) row_(s, '＋ 添加事项', 'navigate', {view: 'edit', scale: 'longterm', listId: list.id, day: p.day});
    pages_(s, state.tasks.filter(function (t) { return !t.archived && t.scale === 'longterm' && t.parentLongtermId === list.id; }), p, taskRow);
  } else if (p.view === 'task') {
    var task = FF.get(state, p.id);
    paragraph_(s, (task.completed ? '已完成 · ' : '') + task.title);
    if (task.description) paragraph_(s, task.description);
    row_(s, '编辑任务', 'navigate', {view: 'edit', id: task.id, day: p.day});
    row_(s, task.completed ? '标记未完成' : '标记完成', 'mutate', Object.assign({}, mutation, {op: 'complete', completed: task.completed ? '0' : '1'}));
    row_(s, task.archived ? '恢复任务' : '归档任务', 'mutate', Object.assign({}, mutation, {op: 'archive', archived: task.archived ? '0' : '1'}));
    pages_(s, task.subTasks || [], p, function (sub) { row_(s, (sub.completed ? '☑ ' : '☐ ') + sub.title, 'mutate', Object.assign({}, mutation, {op: 'subComplete', subId: sub.id, completed: sub.completed ? '0' : '1'})); });
    field_(s, 'subTitle', '新增子任务', ''); row_(s, '添加子任务', 'mutate', Object.assign({}, mutation, {op: 'subAdd'}));
    if (task.scale === 'weekly' && !task.archived) {
      field_(s, 'assignDay', '安排到同一周的哪天 YYYY-MM-DD', p.day);
      row_(s, '加入当天', 'mutate', Object.assign({}, mutation, {op: 'assign'}));
      row_(s, '复制到下周（保留原任务）', 'mutate', Object.assign({}, mutation, {op: 'nextWeek'}));
    }
    if ((task.scale === 'daily' || task.scale === 'event') && !task.archived) {
      paragraph_(s, '安排后，时间调整和取消在 Google Calendar 中进行；勾选或归档任务不会删除工作时段。');
      field_(s, 'scheduleDay', '工作日期 YYYY-MM-DD', task.date);
      field_(s, 'start', '开始 HH:mm', '09:00'); field_(s, 'end', '结束 HH:mm', '10:00');
      field_(s, 'zone', '时区', zone_(e));
      row_(s, '安排到 Google Calendar', 'mutate', Object.assign({}, mutation, {op: 'schedule'}));
      row_(s, '查看日历中的实际时间', 'navigate', Object.assign({}, p, {view: 'blocks'}));
    }
  } else if (p.view === 'blocks') {
    FF.get(state, p.id);
    var blocks = calendarEvents_(p.id);
    paragraph_(s, '从 Google Calendar 实时读取（最多 25 项）；任务所属日期不会随工作时段移动。');
    blocks.forEach(function (b) {
      paragraph_(s, b.summary + '\n' + (b.start.dateTime || b.start.date) + ' → ' + (b.end.dateTime || b.end.date));
      if (b.htmlLink) link_(s, '打开日历时段', b.htmlLink);
    });
    if (!blocks.length) paragraph_(s, '还没有工作时段，或已在日历删除。');
  } else if (p.view === 'edit') {
    var editing = p.id ? FF.get(state, p.id) : {title: '', description: ''};
    field_(s, 'title', '任务名称', editing.title); field_(s, 'description', '说明', editing.description, true);
    row_(s, '保存', 'mutate', Object.assign({}, mutation, {op: 'saveTask'}));
  } else if (p.view === 'more') {
    paragraph_(s, '辅助功能');
    compactButtons_(s, [['复盘与日志', 'navigate', {view: 'review', day: p.day}], ['数据与归档', 'navigate', {view: 'data', day: p.day}]]);
    paragraph_(s, '任务和长期列表是两套清晰分开的内容。日历只保存你主动安排的工作时段。');
  } else if (p.view === 'review') {
    var dn = state.dailyNotes[p.day] || {}, wn = state.weeklyNotes[FF.week(p.day)] || {};
    field_(s, 'dailySummary', '每日总结 · ' + p.day, dn.summary, true);
    field_(s, 'rating', '当天评分（留空或 0.5–5，间隔 0.5）', dn.rating == null ? '' : String(dn.rating));
    field_(s, 'weeklySummary', '每周总结 · ' + FF.week(p.day), wn.summary, true);
    row_(s, '保存复盘', 'mutate', Object.assign({}, mutation, {op: 'review'}));
    field_(s, 'logTime', '记录时间 HH:mm', Utilities.formatDate(new Date(), zone_(e), 'HH:mm'));
    field_(s, 'logContent', '日记 / 过程记录', '', true);
    if (state.logTags.length) {
      var tags = CardService.newSelectionInput().setType(CardService.SelectionInputType.DROPDOWN).setFieldName('logTag').setTitle('标签');
      tags.addItem('不分类', '', true);
      state.logTags.forEach(function (t) { tags.addItem(t.name, t.id, false); }); s.addWidget(tags);
    }
    row_(s, '添加记录', 'mutate', Object.assign({}, mutation, {op: 'logAdd'}));
    pages_(s, state.logEntries.filter(function (l) { return l.date === p.day; }).sort(function (a, b) { return a.time.localeCompare(b.time); }), p, function (l) {
      var tag = state.logTags.find(function (t) { return t.id === l.tagId; });
      paragraph_(s, l.time + (tag ? ' · ' + tag.name : '') + '\n' + l.content);
    });
  } else if (p.view === 'data') {
    paragraph_(s, '插件数据保存到当前账号的 Google Drive 应用专用隐藏空间。原网页数据需首次导入；两边不会自动同步。');
    row_(s, '导入旧数据', 'navigate', {view: 'import', day: p.day});
    row_(s, '导出备份 JSON', 'navigate', {view: 'export', day: p.day});
    row_(s, '归档任务', 'navigate', {view: 'archive', day: p.day});
    row_(s, '归档列表', 'navigate', {view: 'archivedLists', day: p.day});
  } else if (p.view === 'archive') {
    pages_(s, state.tasks.filter(function (t) { return t.archived; }), p, taskRow);
  } else if (p.view === 'archivedLists') {
    pages_(s, state.longTermLists.filter(function (l) { return l.archived; }), p, function (l) { row_(s, l.name, 'navigate', {view: 'list', listId: l.id, day: p.day}); });
  } else if (p.view === 'import') {
    paragraph_(s, '把原网页备份合并到插件，现有内容会保留。长期列表保持独立，也不会自动创建日历事件。粘贴 JSON 后先看预览，再确认。');
    field_(s, 'importJson', 'FocusFlow JSON', '', true);
    row_(s, '检查并预览', 'previewImport', mutation);
  } else if (p.view === 'export') {
    paragraph_(s, '复制下面全部内容，保存为 focusflow-backup.json。包含列表、任务、复盘、日志；日历事件由 Google Calendar 独立保存。');
    field_(s, 'exportJson', '完整备份', JSON.stringify(state), true);
  } else throw new Error('未知页面。');
  return card.addSection(s).build();
}
function mutate(e) {
  try {
    var p = params_(e), next = Object.assign({}, p), message = '已保存';
    var state = withState_(p.revision, function (s) {
      var t, subs, title;
      switch (p.op) {
        case 'listAdd':
          title = FF.text(input_(e, 'listName'), 300, true).trim();
          var list = {id: Utilities.getUuid(), name: title, startDate: null, endDate: null, tasks: []};
          s.longTermLists.push(list); next = {view: 'list', listId: list.id, day: p.day}; break;
        case 'listRename': case 'listArchive':
          var l = s.longTermLists.find(function (x) { return x.id === p.listId; });
          if (!l) throw new Error('列表不存在。');
          if (p.op === 'listRename') l.name = FF.text(input_(e, 'listName'), 300, true).trim();
          else l.archived = p.archived === '1'; break;
        case 'saveTask':
          var patch = {title: FF.text(input_(e, 'title'), 300, true).trim(), description: FF.text(input_(e, 'description'), 8000, false)};
          if (p.id) { FF.update(s, p.id, patch); t = FF.get(s, p.id); }
          else t = FF.add(s, Object.assign(patch, {scale: p.scale, date: p.day, parentLongtermId: p.listId || null}), Utilities.getUuid);
          next = {view: 'task', id: t.id, day: p.day}; break;
        case 'complete': FF.update(s, p.id, {completed: p.completed === '1'}); break;
        case 'archive': FF.get(s, p.id).archived = p.archived === '1'; break;
        case 'subAdd': case 'subComplete':
          t = FF.get(s, p.id); subs = JSON.parse(JSON.stringify(t.subTasks || []));
          if (p.op === 'subAdd') subs.push({id: Utilities.getUuid(), title: FF.text(input_(e, 'subTitle'), 300, true).trim(), completed: false});
          else {
            var sub = subs.find(function (x) { return x.id === p.subId; });
            if (!sub) throw new Error('子任务不存在。'); sub.completed = p.completed === '1';
          }
          FF.update(s, p.id, {subTasks: subs, descriptionMode: 'list'}); break;
        case 'assign':
          var day = FF.date(input_(e, 'assignDay'));
          t = FF.assign(s, p.id, day, Utilities.getUuid); next = {view: 'task', id: t.id, day: day}; break;
        case 'nextWeek':
          t = FF.nextWeek(s, p.id, Utilities.getUuid); next = {view: 'week', day: t.date}; break;
        case 'review':
          var r = input_(e, 'rating').trim(), n = r ? Number(r) : null;
          if (r && (!Number.isFinite(n) || n < 0.5 || n > 5 || n * 2 % 1)) throw new Error('评分应为 0.5–5，间隔 0.5。');
          s.dailyNotes[p.day] = {date: p.day, rating: n, summary: FF.text(input_(e, 'dailySummary'), 8000, false)};
          s.weeklyNotes[FF.week(p.day)] = {weekStart: FF.week(p.day), summary: FF.text(input_(e, 'weeklySummary'), 8000, false)}; break;
        case 'logAdd':
          var time = input_(e, 'logTime');
          if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('记录时间请填写 HH:mm。');
          s.logEntries.push({id: Utilities.getUuid(), date: p.day, time: time, tagId: input_(e, 'logTag'), content: FF.text(input_(e, 'logContent'), 8000, true), createdAt: Date.now()}); break;
        case 'schedule':
          writeSchedule_(FF.get(s, p.id), FF.date(input_(e, 'scheduleDay')), input_(e, 'start'), input_(e, 'end'), input_(e, 'zone'));
          message = '已创建日历时段。时间调整请在 Google Calendar 中进行。'; break;
        default: throw new Error('未知操作。');
      }
    });
    return response_(buildCard_(e, next, state), message);
  } catch (err) { return notifyError_(err); }
}
function previewImport(e) {
  try {
    var raw = input_(e, 'importJson');
    if (raw.length > 1000000) throw new Error('数据过大，第一版最多接受 100 万字符。');
    var state = FF.validate(JSON.parse(raw));
    var current = readState_();
    var merged = FF.merge(current, state);
    // Store the candidate privately; action parameters carry only an opaque ID.
    var fileId = createDataFile_('focusflow-import-' + Utilities.getUuid() + '.json', state);
    var section = CardService.newCardSection();
    paragraph_(section, '将新增 ' + (merged.tasks.length - current.tasks.length) + ' 个任务、' + (merged.longTermLists.length - current.longTermLists.length) + ' 个长期列表。合并后共 ' + merged.tasks.length + ' 个任务、' + merged.longTermLists.length + ' 个长期列表。');
    var taskExamples = state.tasks.slice(0, 3).map(function (t) { return t.title; }).filter(Boolean);
    var listExamples = state.longTermLists.slice(0, 3).map(function (l) { return l.name; }).filter(Boolean);
    if (taskExamples.length) paragraph_(section, '任务示例：' + taskExamples.join(' · ') + (state.tasks.length > taskExamples.length ? ' …' : ''));
    if (listExamples.length) paragraph_(section, '列表示例：' + listExamples.join(' · ') + (state.longTermLists.length > listExamples.length ? ' …' : ''));
    paragraph_(section, '另含 ' + Object.keys(state.dailyNotes).length + ' 份每日复盘、' + Object.keys(state.weeklyNotes).length + ' 份周复盘、' + state.logEntries.length + ' 条日志。确认后会先保存当前插件备份。');
    compactButtons_(section, [['确认导入', 'commitImport', Object.assign({}, params_(e), {candidate: fileId})], ['返回数据', 'navigate', {view: 'data', day: params_(e).day}]]);
    return response_(CardService.newCardBuilder().setHeader(CardService.newCardHeader().setTitle('导入预览')).addSection(section).build());
  } catch (err) { return notifyError_(err); }
}
function commitImport(e) {
  try {
    var p = params_(e);
    var candidate = FF.validate(googleRequest_('drive/v3/files/' + encodeURIComponent(p.candidate) + '?alt=media'));
    var state = withState_(p.revision, function (s) {
      var merged = FF.merge(s, candidate);
      createDataFile_('focusflow-before-import-' + Utilities.getUuid() + '.json', s);
      ['tasks', 'longTermLists', 'dailyNotes', 'weeklyNotes', 'logTags', 'logEntries'].forEach(function (k) { s[k] = merged[k]; });
    });
    return response_(buildCard_(e, {view: 'day', day: today_(e)}, state), '导入完成。原网页数据保持不变。');
  } catch (err) { return notifyError_(err); }
}
