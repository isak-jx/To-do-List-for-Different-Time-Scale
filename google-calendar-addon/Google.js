/* User-isolated storage. No website backend, shared database or public endpoint. */
function googleRequest_(path, method, body, headers) {
  var options = {method: method || 'get', muteHttpExceptions: true, headers: Object.assign({Authorization: 'Bearer ' + ScriptApp.getOAuthToken()}, headers || {})};
  if (body !== undefined) { options.contentType = 'application/json'; options.payload = JSON.stringify(body); }
  var response = UrlFetchApp.fetch('https://www.googleapis.com/' + path, options);
  var code = response.getResponseCode(), raw = response.getContentText();
  if (code < 200 || code >= 300) {
    var err = new Error(code === 401 || code === 403 ? 'Google 权限或 API 未启用。请按安装说明检查 Drive / Calendar API 和授权。' : 'Google 服务暂未完成操作（HTTP ' + code + '）。请刷新后重试。');
    err.status = code; throw err;
  }
  return raw ? JSON.parse(raw) : {};
}
function stateFile_() {
  var props = PropertiesService.getUserProperties();
  var id = props.getProperty('focusflowStateFile');
  if (id) return id;
  var query = encodeURIComponent("name = 'focusflow-state-v1.json' and trashed = false");
  var found = googleRequest_('drive/v3/files?spaces=appDataFolder&q=' + query + '&fields=files(id)&pageSize=2').files || [];
  if (found.length > 1) throw new Error('发现多个数据文件，请先在 Apps Script 中检查，未自动选择或覆盖。');
  if (found.length) { props.setProperty('focusflowStateFile', found[0].id); return found[0].id; }
  return null;
}
function cacheState_(state) {
  try {
    var raw = JSON.stringify(state), cache = CacheService.getUserCache();
    var generation = Utilities.getUuid(), chunks = {}, keys = [];
    for (var i = 0; i < raw.length; i += 20000) {
      var key = 'ff:' + generation + ':' + i;
      keys.push(key); chunks[key] = raw.slice(i, i + 20000);
    }
    cache.putAll(chunks, 60);
    cache.put('focusflowState', JSON.stringify(keys), 30);
  } catch (_) { /* Cache is optional; Drive remains authoritative. */ }
}
function readState_(allowCache) {
  if (allowCache) {
    try {
      var cache = CacheService.getUserCache(), cached = cache.get('focusflowState');
      if (cached) {
        var keys = JSON.parse(cached), chunks = cache.getAll(keys);
        if (keys.every(function (key) { return typeof chunks[key] === 'string'; })) return FF.validate(JSON.parse(keys.map(function (key) { return chunks[key]; }).join('')));
      }
    } catch (_) {}
  }
  var id = stateFile_();
  var state = id ? FF.validate(googleRequest_('drive/v3/files/' + encodeURIComponent(id) + '?alt=media')) : FF.empty();
  cacheState_(state);
  return state;
}
function createDataFile_(name, state) {
  // Multipart creates metadata and content together; interruption never leaves an empty state file.
  var boundary = 'focusflow_' + Utilities.getUuid().replace(/-/g, '');
  var metadata = {name: name, mimeType: 'application/json', parents: ['appDataFolder']};
  var payload = '--' + boundary + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata) + '\r\n--' + boundary + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(state) + '\r\n--' + boundary + '--';
  var response = UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {method: 'post', contentType: 'multipart/related; boundary=' + boundary, payload: payload, headers: {Authorization: 'Bearer ' + ScriptApp.getOAuthToken()}, muteHttpExceptions: true});
  if (response.getResponseCode() !== 200) throw new Error('创建 Google 数据文件失败，请检查 Drive API 和授权后重试。');
  return JSON.parse(response.getContentText()).id;
}
function saveState_(state) {
  state = FF.validate(state); state.revision += 1;
  var id = stateFile_();
  if (id) googleRequest_('upload/drive/v3/files/' + encodeURIComponent(id) + '?uploadType=media', 'patch', state);
  else PropertiesService.getUserProperties().setProperty('focusflowStateFile', createDataFile_('focusflow-state-v1.json', state));
  cacheState_(state);
  return state;
}
function withState_(revision, fn) {
  var lock = LockService.getUserLock();
  if (!lock.tryLock(5000)) throw new Error('另一个操作正在保存，请稍后再试。');
  try {
    var s = readState_();
    if (String(s.revision) !== String(revision)) throw new Error('此页面已过期，请点击首页刷新后重新操作。你的输入尚未保存。');
    fn(s); return saveState_(s);
  } finally { lock.releaseLock(); }
}
function calendarId_() {
  return PropertiesService.getUserProperties().getProperty('focusflowCalendarId');
}
function initializeCalendar_(zone) {
  var id = calendarId_();
  if (id) return id;
  var c = googleRequest_('calendar/v3/calendars', 'post', {summary: 'FocusFlow', timeZone: zone, description: 'FocusFlow 安排的个人工作时段'});
  PropertiesService.getUserProperties().setProperty('focusflowCalendarId', c.id);
  return c.id;
}
function calendarEvents_(taskId) {
  var id = calendarId_();
  if (!id) return [];
  return googleRequest_('calendar/v3/calendars/' + encodeURIComponent(id) + '/events?maxResults=25&singleEvents=true&privateExtendedProperty=' + encodeURIComponent('focusflowTaskId=' + taskId)).items || [];
}
function writeSchedule_(task, day, start, end, zone) {
  var body = FF.schedule(task, day, start, end, zone);
  // Reject nonexistent and ambiguous wall-clock times at daylight-saving transitions.
  [start, end].forEach(function (time) {
    var wall = day + ' ' + time, parsed;
    try { parsed = Utilities.parseDate(wall, zone, 'yyyy-MM-dd HH:mm'); }
    catch (_) { throw new Error('时区或时间无效，请使用 IANA 时区名称。'); }
    if (Utilities.formatDate(parsed, zone, 'yyyy-MM-dd HH:mm') !== wall) throw new Error('这个时间在夏令时切换中不存在，请换一个时间。');
    [-120, -60, -30, 30, 60, 120].forEach(function (minutes) {
      if (Utilities.formatDate(new Date(parsed.getTime() + minutes * 60000), zone, 'yyyy-MM-dd HH:mm') === wall) throw new Error('这个时间在夏令时切换中出现两次，请直接在 Google Calendar 中安排。');
    });
  });
  var cal = initializeCalendar_(zone);
  var hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, task.id + ':' + day, Utilities.Charset.UTF_8).map(function (b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');
  body.id = 'ff' + hash;
  var base = 'calendar/v3/calendars/' + encodeURIComponent(cal) + '/events';
  try { return googleRequest_(base, 'post', body); }
  catch (err) {
    if (err.status !== 409) throw err;
    // Never overwrite an existing block (including one moved by the user in Calendar).
    var existing = googleRequest_(base + '/' + body.id);
    if (existing.status === 'cancelled') throw new Error('这一天的工作时段已在日历删除。请在 Google Calendar 中恢复或手动新建。');
    throw new Error('这项任务当天已有工作时段，请在 Google Calendar 中调整时间，不会重复创建。');
  }
}
