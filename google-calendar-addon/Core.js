/* Pure domain operations; shared by Apps Script and the offline test suite. */
var FF = (function () {
  function fail(message) { throw new Error(message); }
  function text(value, max, required) {
    if (typeof value !== 'string' || value.length > max || (required && !value.trim())) fail('文字为空或超出长度限制（' + max + ' 字符）。');
    return value;
  }
  function date(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value + 'T12:00:00Z')) || new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) !== value) fail('日期请填写 YYYY-MM-DD。');
    return value;
  }
  function week(value) {
    var d = new Date(date(value) + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7);
    return d.toISOString().slice(0, 10);
  }
  function shift(value, days) {
    var d = new Date(date(value) + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }
  function empty() { return {version: 1, revision: 0, tasks: [], longTermLists: [], dailyNotes: {}, weeklyNotes: {}, logTags: [], logEntries: []}; }
  function get(s, id) { return s.tasks.find(function (t) { return t.id === id; }) || fail('任务不存在，请刷新。'); }
  function group(s, t) {
    if (t.scale !== 'daily' && t.scale !== 'weekly') return [t];
    var w = t.scale === 'weekly' ? t.id : t.linkedWeeklyId;
    return w ? s.tasks.filter(function (x) { return (x.scale === 'weekly' && x.id === w) || (x.scale === 'daily' && x.linkedWeeklyId === w); }) : [t];
  }
  function update(s, id, patch) {
    var t = get(s, id);
    group(s, t).forEach(function (x) {
      ['title', 'description', 'completed', 'subTasks', 'descriptionMode'].forEach(function (k) {
        if (Object.prototype.hasOwnProperty.call(patch, k)) x[k] = JSON.parse(JSON.stringify(patch[k]));
      });
      x.updatedAt = Date.now();
    });
  }
  function add(s, values, uuid) {
    if (['daily', 'weekly', 'longterm', 'event'].indexOf(values.scale) < 0) fail('任务类型无效。');
    if (values.scale === 'longterm' && !s.longTermLists.some(function (l) { return l.id === values.parentLongtermId && !l.archived; })) fail('请选择有效的长期列表。');
    var t = Object.assign({id: uuid(), title: '', description: '', subTasks: [], completed: false, date: null, timeRange: {start: null, end: null}, location: null, linkedWeeklyId: null, linkedDailyIds: [], parentLongtermId: null, createdAt: Date.now(), updatedAt: Date.now()}, values);
    text(t.title, 300, true); text(t.description, 8000, false);
    t.linkedWeeklyId = null; t.linkedDailyIds = [];
    if (t.scale === 'longterm') t.date = null;
    else { date(t.date); t.parentLongtermId = null; }
    if (t.scale === 'weekly') t.date = week(t.date);
    if (t.scale === 'daily') {
      var w = JSON.parse(JSON.stringify(t));
      w.id = uuid(); w.scale = 'weekly'; w.date = week(t.date); w.linkedDailyIds = [t.id];
      t.linkedWeeklyId = w.id; s.tasks.push(w);
    }
    s.tasks.push(t); return t;
  }
  function assign(s, id, day, uuid) {
    var w = get(s, id); date(day);
    if (w.scale !== 'weekly' || w.archived) fail('只有周任务可以加入当天。');
    if (week(day) !== w.date) fail('请选择同一周的日期；跨周请使用“复制到下周”。');
    var found = s.tasks.find(function (t) { return t.scale === 'daily' && t.linkedWeeklyId === id && t.date === day && !t.archived; });
    if (found) return found;
    var t = JSON.parse(JSON.stringify(w));
    t.id = uuid(); t.scale = 'daily'; t.date = day; t.linkedWeeklyId = id; t.linkedDailyIds = []; t.createdAt = t.updatedAt = Date.now();
    w.linkedDailyIds.push(t.id); s.tasks.push(t); return t;
  }
  function nextWeek(s, id, uuid) {
    var t = get(s, id);
    if (t.scale !== 'weekly' || t.archived) fail('请选择周任务。');
    var copy = JSON.parse(JSON.stringify(t));
    delete copy.id; copy.date = shift(t.date, 7); copy.completed = false;
    copy.subTasks = (copy.subTasks || []).map(function (x) { return {id: uuid(), title: x.title, completed: x.completed}; });
    return add(s, copy, uuid);
  }
  function validate(raw) {
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.tasks) || !Array.isArray(raw.longTermLists)) fail('不是 FocusFlow 数据文件。');
    if (raw.version != null && raw.version !== 1) fail('不支持这个版本的数据文件。');
    var s = Object.assign(empty(), JSON.parse(JSON.stringify(raw)));
    if (s.tasks.length > 5000 || s.longTermLists.length > 1000) fail('第一版最多支持 5000 个任务和 1000 个列表。');
    var ids = new Set(), lists = new Set();
    s.longTermLists.forEach(function (l) {
      text(l.id, 200, true); text(l.name, 300, true);
      if (lists.has(l.id)) fail('列表 ID 重复。'); lists.add(l.id);
      if (l.startDate) date(l.startDate); if (l.endDate) date(l.endDate);
    });
    s.tasks.forEach(function (t) {
      text(t.id, 200, true); text(t.title, 300, true); text(t.description || '', 8000, false);
      if (ids.has(t.id)) fail('任务 ID 重复。'); ids.add(t.id);
      if (['daily', 'weekly', 'longterm', 'event'].indexOf(t.scale) < 0) fail('任务类型无效。');
      if (typeof t.completed !== 'boolean') fail('完成状态无效。');
      if (!Array.isArray(t.linkedDailyIds)) t.linkedDailyIds = [];
      if (t.scale === 'longterm') {
        if (!lists.has(t.parentLongtermId)) fail('长期任务缺少所属列表。');
        t.linkedWeeklyId = null; t.linkedDailyIds = [];
      } else {
        t.parentLongtermId = null; date(t.date);
        if (t.scale === 'weekly') t.date = week(t.date);
      }
      if (!Array.isArray(t.subTasks || [] ) || (t.subTasks || []).length > 100) fail('子任务最多 100 项。');
      var subIds = new Set();
      (t.subTasks || []).forEach(function (x) { text(x.id, 200, true); text(x.title, 300, true); if (typeof x.completed !== 'boolean' || subIds.has(x.id)) fail('子任务状态或 ID 无效。'); subIds.add(x.id); });
    });
    s.tasks.forEach(function (t) {
      if (t.scale === 'daily' && t.linkedWeeklyId) {
        var w = get(s, t.linkedWeeklyId);
        if (w.scale !== 'weekly') fail('日／周关联无效。');
      } else t.linkedWeeklyId = null;
      t.linkedDailyIds = t.scale === 'weekly' ? s.tasks.filter(function (d) { return d.scale === 'daily' && d.linkedWeeklyId === t.id; }).map(function (d) { return d.id; }) : [];
    });
    ['dailyNotes', 'weeklyNotes'].forEach(function (key) {
      if (!s[key] || typeof s[key] !== 'object' || Array.isArray(s[key])) fail('复盘格式无效。');
      Object.keys(s[key]).forEach(function (d) { date(d); text(s[key][d].summary, 8000, false); });
    });
    if (!Array.isArray(s.logTags) || !Array.isArray(s.logEntries)) fail('日志格式无效。');
    s.logTags.forEach(function (t) { text(t.id, 200, true); text(t.name, 100, true); });
    s.logEntries.forEach(function (x) { text(x.id, 200, true); date(x.date); text(x.content, 8000, true); text(x.time, 20, true); });
    s.version = 1; s.revision = Number.isSafeInteger(s.revision) ? s.revision : 0;
    if (JSON.stringify(s).length > 1000000) fail('第一版数据上限为 100 万字符，请先导出并整理历史记录。');
    return s;
  }
  function merge(current, incoming) {
    var s = validate(current), source = validate(incoming);
    ['tasks', 'longTermLists', 'logTags', 'logEntries'].forEach(function (key) {
      var byId = new Map(s[key].map(function (item) { return [item.id, item]; }));
      source[key].forEach(function (item) {
        var existing = byId.get(item.id);
        if (!existing) { s[key].push(item); byId.set(item.id, item); }
        else if (JSON.stringify(existing) !== JSON.stringify(item)) fail('导入与现有数据存在 ID 冲突（' + key + '），未覆盖任何数据。');
      });
    });
    ['dailyNotes', 'weeklyNotes'].forEach(function (key) {
      Object.keys(source[key]).forEach(function (day) {
        if (!s[key][day]) s[key][day] = source[key][day];
        else if (JSON.stringify(s[key][day]) !== JSON.stringify(source[key][day])) fail(day + ' 的复盘已有不同内容，未覆盖，请先整理两份备份。');
      });
    });
    return validate(s);
  }
  function schedule(t, day, start, end, zone) {
    if (t.scale !== 'daily' && t.scale !== 'event') fail('只有当天任务或日程可以安排到日历，长期列表保持独立。');
    if (t.archived) fail('归档任务不能排时。');
    date(day);
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end) || end <= start) fail('请填写有效的同日开始／结束时间，例如 14:00 和 15:00。');
    text(zone, 100, true);
    return {summary: t.title, description: 'FocusFlow 工作时段。任务完成状态在侧栏管理。', start: {dateTime: day + 'T' + start + ':00', timeZone: zone}, end: {dateTime: day + 'T' + end + ':00', timeZone: zone}, extendedProperties: {private: {focusflowTaskId: t.id}}, reminders: {useDefault: false, overrides: [{method: 'popup', minutes: 10}]}};
  }
  return {fail: fail, text: text, date: date, week: week, shift: shift, empty: empty, get: get, update: update, add: add, assign: assign, nextWeek: nextWeek, validate: validate, merge: merge, schedule: schedule};
})();
