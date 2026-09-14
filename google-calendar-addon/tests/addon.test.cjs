const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

function harness() {
  let counter = 0;
  const files = new Map(), properties = new Map(), events = new Map(), requests = [], cache = new Map();
  let lockHeld = false, failSave = false;
  const widgetMethods = new Set(['setFieldName','setTitle','setValue','setMultiline','setText','setOnClickAction','setFunctionName','setParameters','setType','addItem','addWidget','addButton','setUrl','setOpenLink','setHeader','setSubtitle','addSection','setNotification','setNavigation','updateCard','setStateChanged','build']);
  function factory(type) {
    const target = {type, calls: []};
    const proxy = new Proxy(target, {get(t, k) {
      if (k in t) return t[k];
      if (!widgetMethods.has(k)) throw new Error('Unknown CardService method: ' + String(k));
      return (...args) => { t.calls.push([k, ...args]); return proxy; };
    }}); return proxy;
  }
  const CardService = {SelectionInputType: {DROPDOWN: 'DROPDOWN'}};
  ['Action','TextButton','TextParagraph','TextInput','ButtonSet','SelectionInput','CardBuilder','CardHeader','CardSection','ActionResponseBuilder','Navigation','Notification','OpenLink'].forEach(k => CardService['new' + k] = () => factory(k));
  function response(code, body) { return {getResponseCode: () => code, getContentText: () => JSON.stringify(body)}; }
  const context = vm.createContext({console, Date, Set, JSON, Number, Object, String, Array, RegExp, Error, parseInt,
    CardService,
    CacheService: {getUserCache: () => ({get: k => cache.get(k), put: (k,v) => cache.set(k,v), remove: k => cache.delete(k), putAll: values => Object.entries(values).forEach(([k,v])=>cache.set(k,v)), getAll: keys => Object.fromEntries(keys.filter(k=>cache.has(k)).map(k=>[k,cache.get(k)]))})},
    ScriptApp: {getOAuthToken: () => 'mock-token'},
    PropertiesService: {getUserProperties: () => ({getProperty: k => properties.get(k) || null, setProperty: (k, v) => properties.set(k, v)})},
    LockService: {getUserLock: () => ({tryLock: () => {assert.equal(lockHeld, false); lockHeld = true; return true;}, releaseLock: () => {lockHeld = false;}})},
    Utilities: {
      getUuid: () => 'id-' + ++counter,
      DigestAlgorithm: {SHA_256: 'sha256'}, Charset: {UTF_8: 'utf8'},
      computeDigest: (a, s) => Array.from(crypto.createHash(a).update(s).digest()),
      parseDate: (s, z) => {assert.equal(z, 'Etc/UTC'); return new Date(s.replace(' ', 'T') + ':00Z');},
      formatDate: (d, zone, fmt) => {
        const parts = new Intl.DateTimeFormat('en-CA', {timeZone: zone, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23'}).formatToParts(d);
        const p = Object.fromEntries(parts.map(x => [x.type, x.value]));
        const day = `${p.year}-${p.month}-${p.day}`, time = `${p.hour}:${p.minute}`;
        return fmt === 'yyyy-MM-dd' ? day : fmt === 'HH:mm' ? time : day + ' ' + time;
      }
    },
    UrlFetchApp: {fetch(url, options) {
      requests.push({url, options});
      assert.ok(url.startsWith('https://www.googleapis.com/'));
      const u = new URL(url), method = options.method;
      if (u.pathname === '/upload/drive/v3/files') {
        const chunks = options.payload.split('\r\n\r\n');
        const metadata = JSON.parse(chunks[1].split('\r\n--')[0]);
        const content = JSON.parse(chunks[2].split('\r\n--')[0]);
        const id = 'file-' + ++counter; files.set(id, {metadata, content}); return response(200, {id});
      }
      if (u.pathname === '/drive/v3/files') {
        return response(200, {files: Array.from(files).filter(([id, f]) => f.metadata.name === 'focusflow-state-v1.json').map(([id]) => ({id}))});
      }
      const fileMatch = u.pathname.match(/^\/(?:upload\/)?drive\/v3\/files\/([^/]+)$/);
      if (fileMatch) {
        const file = files.get(fileMatch[1]);
        if (!file) return response(404, {});
        if (method === 'patch') {
          if (failSave) {failSave = false; return response(503, {});}
          file.content = JSON.parse(options.payload);
        }
        return response(200, file.content);
      }
      if (u.pathname === '/calendar/v3/calendars') return response(200, {id: 'owned-calendar'});
      if (u.pathname === '/calendar/v3/calendars/owned-calendar/events' && method === 'post') {
        const b = JSON.parse(options.payload);
        if (events.has(b.id)) return response(409, {});
        events.set(b.id, {...b, htmlLink:'https://calendar.google.com/calendar/event?eid=test'});
        return response(200, events.get(b.id));
      }
      if (u.pathname === '/calendar/v3/calendars/owned-calendar/events') return response(200, {items: Array.from(events.values()).filter(x => x.status !== 'cancelled')});
      const eventMatch = u.pathname.match(/\/events\/([^/]+)$/);
      if (eventMatch) return response(events.has(eventMatch[1]) ? 200 : 404, events.get(eventMatch[1]) || {});
      throw new Error('Unmocked request ' + url);
    }}
  });
  for (const name of ['Core.js','Google.js','Cards.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', name), 'utf8'), context, {filename: name});
  return {context, FF: context.FF, files, properties, events, requests, failNextSave: () => {failSave = true;}};
}
function event(parameters = {}, fields = {}) {
  return {commonEventObject: {parameters, timeZone: {id:'Etc/UTC'}, formInputs: Object.fromEntries(Object.entries(fields).map(([k,v]) => [k, {stringInputs:{value:[v]}}]))}};
}
function strings(tree) {
  const out = [];
  function visit(x) { if (typeof x === 'string') out.push(x); else if (Array.isArray(x)) x.forEach(visit); else if (x && typeof x === 'object') Object.values(x).forEach(visit); }
  visit(tree); return out.join('\n');
}
test('week boundaries and invalid calendar dates', () => {
  const {FF} = harness();
  assert.equal(FF.week('2026-01-01'), '2025-12-29');
  assert.equal(FF.week('2026-09-20'), '2026-09-14');
  assert.throws(() => FF.date('2026-02-30'));
  assert.equal(FF.shift('2024-02-28', 1), '2024-02-29');
});
test('daily creation and shared completion; assigning the same day is idempotent', () => {
  const {FF, context:c} = harness(), s = FF.empty();
  const daily = FF.add(s, {title:'GRE', scale:'daily', date:'2026-09-14'}, c.Utilities.getUuid);
  assert.equal(s.tasks.length, 2);
  const weekly = FF.get(s, daily.linkedWeeklyId);
  assert.equal(FF.assign(s, weekly.id, daily.date, c.Utilities.getUuid).id, daily.id);
  const second = FF.assign(s, weekly.id, '2026-09-15', c.Utilities.getUuid);
  FF.update(s, second.id, {completed:true, subTasks:[{id:'sub', title:'Mechanics', completed:true}]});
  assert.ok(s.tasks.every(t => t.completed && t.subTasks[0].completed));
  assert.throws(() => FF.assign(s, weekly.id, '2026-09-21', c.Utilities.getUuid));
  const copied = FF.nextWeek(s, weekly.id, c.Utilities.getUuid);
  assert.notEqual(copied.id, weekly.id); assert.equal(copied.date, '2026-09-21');
  assert.equal(copied.completed, false); assert.equal(copied.linkedDailyIds.length, 0);
});
test('long-term tasks cannot acquire day/week/calendar relationships', () => {
  const {FF, context:c} = harness(), s = FF.empty();
  s.longTermLists.push({id:'list', name:'Independent list'});
  const t = FF.add(s, {title:'Read', scale:'longterm', parentLongtermId:'list', date:'2026-09-14', linkedWeeklyId:'bad'}, c.Utilities.getUuid);
  assert.equal(t.date, null); assert.equal(t.linkedWeeklyId, null); assert.equal(s.tasks.length, 1);
  assert.throws(() => FF.assign(s, t.id, '2026-09-14', c.Utilities.getUuid));
  assert.throws(() => FF.schedule(t, '2026-09-14','09:00','10:00','Etc/UTC'));
  t.linkedWeeklyId = 'bad'; t.linkedDailyIds = ['bad'];
  const imported = FF.validate(s); assert.equal(imported.tasks[0].linkedWeeklyId, null);
});
test('invalid imports reject duplicates and dangling relationships without mutating input', () => {
  const {FF, context:c} = harness(), s = FF.empty();
  FF.add(s, {title:'Task',scale:'daily',date:'2026-09-14'}, c.Utilities.getUuid);
  const duplicate = JSON.parse(JSON.stringify(s)); duplicate.tasks.push(duplicate.tasks[0]);
  assert.throws(() => FF.validate(duplicate));
  const broken = JSON.parse(JSON.stringify(s)); broken.tasks[1].linkedWeeklyId = 'missing';
  assert.throws(() => FF.validate(broken));
  const good = FF.validate(s); good.tasks[0].title = 'changed'; assert.equal(s.tasks[0].title,'Task');
});
test('Drive persistence is account-scoped and stale writes are rejected', () => {
  const {context:c, files} = harness();
  c.withState_(0, s => c.FF.add(s, {title:'Persist',scale:'weekly',date:'2026-09-14'}, c.Utilities.getUuid));
  assert.equal(c.readState_().revision, 1); assert.equal(files.size, 1);
  assert.throws(() => c.withState_(0, s => {s.tasks=[];}), /已过期/);
  assert.equal(c.readState_().tasks.length, 1);
  c.withState_(1, s => c.FF.update(s, s.tasks[0].id, {completed:true}));
  assert.equal(files.size, 1); assert.equal(c.readState_().tasks[0].completed,true);
});
test('calendar retry never duplicates or overwrites a user-rescheduled event, even after storage failure', () => {
  const {context:c, events, failNextSave} = harness();
  c.withState_(0, s => c.FF.add(s, {title:'Work',scale:'daily',date:'2026-09-14'}, c.Utilities.getUuid));
  const t = c.readState_().tasks.find(t => t.scale === 'daily');
  failNextSave();
  assert.throws(() => c.withState_(1, s => c.writeSchedule_(t,'2026-09-14','09:00','10:00','Etc/UTC')));
  assert.equal(events.size,1);
  const saved = [...events.values()][0]; saved.start.dateTime = '2026-09-15T15:00:00';
  assert.throws(() => c.writeSchedule_(t,'2026-09-14','09:00','10:00','Etc/UTC'), /已有工作时段/);
  assert.equal(events.size,1); assert.equal(saved.start.dateTime,'2026-09-15T15:00:00');
  assert.equal(c.calendarEvents_(t.id)[0].start.dateTime,'2026-09-15T15:00:00');
  assert.throws(() => c.writeSchedule_(t,'2026-09-14','25:00','26:00','Etc/UTC'));
});
test('card actions create independent list items and round-trip a first import', () => {
  const {context:c} = harness();
  let result = c.mutate(event({view:'lists',day:'2026-09-14',revision:'0',op:'listAdd'},{listName:'Books'}));
  assert.match(strings(result), /已保存/);
  let s = c.readState_();
  c.mutate(event({view:'edit',scale:'longterm',listId:s.longTermLists[0].id,day:'2026-09-14',revision:'1',op:'saveTask'}, {title:'Read',description:'<b>literal</b>'}));
  s = c.readState_(); assert.equal(s.tasks.length,1);
  assert.equal(s.tasks[0].scale,'longterm');
  const card = c.buildCard_(event(),{view:'task',day:'2026-09-14',id:s.tasks[0].id},s);
  assert.doesNotMatch(strings(card), /安排到 Google Calendar|加入当天/);
  assert.match(strings(card), /&lt;b&gt;literal/);
  const other = harness();
  const preview = other.context.previewImport(event({revision:'0',day:'2026-09-14'}, {importJson:JSON.stringify(s)}));
  assert.match(strings(preview), /1 个长期列表/);
  const candidate = [...other.files.keys()][0];
  const imported = other.context.commitImport(event({revision:'0',candidate,day:'2026-09-14'}));
  assert.match(strings(imported), /导入完成/);
  assert.equal(other.context.readState_().tasks[0].title,'Read');
  assert.equal(other.events.size,0);
  const again = other.context.commitImport(event({revision:'1',candidate,day:'2026-09-14'}));
  assert.match(strings(again), /导入完成/);
  assert.equal(other.context.readState_().tasks.length, s.tasks.length);
});
test('all primary screens render, pagination bounds cards, review survives persistence', () => {
  const {context:c} = harness();
  let s = c.FF.empty();
  for(let i=0;i<30;i++) c.FF.add(s,{title:'Task '+i,scale:'weekly',date:'2026-09-14'},c.Utilities.getUuid);
  c.saveState_(s); s=c.readState_();
  for(const view of ['day','week','lists','review','data','archive','archivedLists','import','export']) assert.ok(c.buildCard_(event(),{view,day:'2026-09-14'},s));
  const page=strings(c.buildCard_(event(),{view:'week',day:'2026-09-14'},s));
  assert.match(page,/下一页/); assert.doesNotMatch(page,/Task 12\n/);
  const res=c.mutate(event({op:'review',revision:'1',view:'review',day:'2026-09-14'}, {dailySummary:'今天',weeklySummary:'本周',rating:'4.5'}));
  assert.match(strings(res),/已保存/); assert.equal(c.readState_().dailyNotes['2026-09-14'].rating,4.5);
});
test('DST gaps and repeated wall times are rejected before any Calendar write', () => {
  const {context:c, requests} = harness();
  const task = {id:'task',title:'Work',scale:'daily'};
  c.Utilities.parseDate = () => new Date('2026-03-08T07:30:00Z');
  assert.throws(() => c.writeSchedule_(task,'2026-03-08','02:30','04:00','America/New_York'), /不存在/);
  c.Utilities.parseDate = () => new Date('2026-11-01T05:30:00Z');
  assert.throws(() => c.writeSchedule_(task,'2026-11-01','01:30','03:00','America/New_York'), /出现两次/);
  assert.equal(requests.length,0);
});
test('separate users have separate state, and failed writes preserve stored data', () => {
  const a=harness(), b=harness();
  a.context.withState_(0,s=>a.FF.add(s,{title:'A private task',scale:'weekly',date:'2026-09-14'},a.context.Utilities.getUuid));
  assert.equal(b.context.readState_().tasks.length,0);
  a.failNextSave();
  assert.throws(()=>a.context.withState_(1,s=>{s.tasks=[];}));
  assert.equal(a.context.readState_().tasks[0].title,'A private task');
  const state=a.context.readState_();state.version=2;
  assert.throws(()=>a.FF.validate(state),/版本/);
});

test('merge preserves trial tasks and calendar IDs; repeated import is idempotent and conflicts are atomic', () => {
  const {FF,context:c} = harness(), trial = FF.empty(), old = FF.empty();
  const t = FF.add(trial,{title:'trial',scale:'daily',date:'2026-09-14'},c.Utilities.getUuid);
  t.calendarEventId = 'keep-event';
  old.longTermLists.push({id:'old-list',name:'Independent'});
  FF.add(old,{title:'old',scale:'longterm',parentLongtermId:'old-list'},c.Utilities.getUuid);
  const merged = FF.merge(trial,old);
  assert.equal(merged.tasks.length,trial.tasks.length+1);
  assert.equal(FF.get(merged,t.id).calendarEventId,'keep-event');
  assert.equal(JSON.stringify(FF.merge(merged,old)),JSON.stringify(merged));
  const conflict = JSON.parse(JSON.stringify(old)); conflict.tasks[0].title='changed';
  assert.throws(()=>FF.merge(merged,conflict),/冲突/);
  assert.equal(merged.tasks.at(-1).title,'old');
});
test('navigation cache avoids Drive reads but writes always check latest revision', () => {
  const {context:c,requests,files,properties} = harness();
  c.saveState_(c.FF.empty());
  const before=requests.length;
  c.readState_(true); c.readState_(true);
  assert.equal(requests.length,before);
  files.get(properties.get('focusflowStateFile')).content.revision=9;
  assert.throws(()=>c.withState_(1,()=>{}),/过期/);
  assert.equal(c.readState_().revision,9);
});
