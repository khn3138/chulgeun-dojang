/**
 * 출근도장 — 구글 시트 백엔드 (Google Apps Script 웹앱)
 *
 * 설치:
 *  1. 구글 시트 → 확장 프로그램 → Apps Script → 기존 내용을 모두 지우고 이 파일 내용을 붙여넣고 저장
 *  2. 프로젝트 설정(⚙️) → 스크립트 속성 → 속성 추가: SYNC_TOKEN = (아무 비밀 문자열)
 *  3. 편집기에서 setup 함수를 한 번 실행 (권한 허용) → records, months 시트가 만들어짐
 *  4. 배포 → 새 배포 → 유형: 웹 앱, 실행 계정: 나, 액세스 권한: 모든 사용자 → 배포
 *  5. 나온 웹 앱 URL(…/exec)과 SYNC_TOKEN 값을 앱 [설정]에 입력
 *
 * 코드를 고친 뒤에는 "새 배포"가 아니라 배포 관리 → ✏️ → 버전: 새 버전 으로 배포해야 URL이 유지된다.
 *
 * 시트 구조
 *  records: date | worked | memo | updatedAt | amount | overtime | night | extra
 *           (amount: 하루 1, 반나절 0.5, 안 함 0 / overtime·night·extra: 연장·야간·추가근무 시간)
 *  months : month | memo | updatedAt   (월별 정리 메모, month = 'YYYY-MM')
 */

var RECORDS = {
  name: 'records',
  headers: ['date', 'worked', 'memo', 'updatedAt', 'amount', 'overtime', 'night', 'extra'],
  keyRe: /^\d{4}-\d{2}-\d{2}$/,
  updatedCol: 4,
};
var MONTHS = {
  name: 'months',
  headers: ['month', 'memo', 'updatedAt'],
  keyRe: /^\d{4}-\d{2}$/,
  updatedCol: 3,
};

function doGet(e) {
  try {
    checkToken_(e && e.parameter && e.parameter.token);
    return json_({ ok: true, records: readRecords_(), months: readMonths_() });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function doPost(e) {
  try {
    // 앱은 CORS 프리플라이트를 피하려고 Content-Type: text/plain 으로 JSON을 보낸다.
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    checkToken_(body.token);
    if (!Array.isArray(body.records)) throw new Error('records 배열이 필요합니다');
    var count = upsert_(RECORDS, body.records.map(recordToRow_));
    if (Array.isArray(body.months)) count += upsert_(MONTHS, body.months.map(monthToRow_));
    return json_({ ok: true, count: count });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

/** 처음 한 번 실행: records, months 시트와 헤더를 만든다. (다시 실행해도 안전) */
function setup() {
  getSheet_(RECORDS);
  getSheet_(MONTHS);
}

/**
 * 보호자가 시트에서 직접 고치면 updatedAt을 지금 시각으로 바꿔
 * 앱이 다음 실행 때 시트 쪽 수정을 가져가게 한다 (단순 트리거, 설치 불필요).
 */
function onEdit(e) {
  var range = e && e.range;
  if (!range) return;
  var sheet = range.getSheet();
  var def = sheet.getName() === RECORDS.name ? RECORDS : sheet.getName() === MONTHS.name ? MONTHS : null;
  if (!def) return;
  var firstRow = Math.max(range.getRow(), 2);
  var lastRow = range.getLastRow();
  if (lastRow < firstRow) return;
  // updatedAt 열만 고친 경우는 건드리지 않는다.
  if (range.getColumn() === def.updatedCol && range.getLastColumn() === def.updatedCol) return;
  var now = Date.now();
  var values = [];
  for (var r = firstRow; r <= lastRow; r++) values.push([now]);
  sheet.getRange(firstRow, def.updatedCol, values.length, 1).setValues(values);
}

// ---------------------------------------------------------------------------

function checkToken_(token) {
  var expected = PropertiesService.getScriptProperties().getProperty('SYNC_TOKEN');
  if (!expected) throw new Error('스크립트 속성 SYNC_TOKEN이 설정되지 않았습니다');
  if (token !== expected) throw new Error('토큰이 맞지 않습니다');
}

/** 시트가 없으면 만들고, 헤더가 모자라면(예전 버전 시트) 채운다. */
function getSheet_(def) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(def.name) || ss.insertSheet(def.name);
  var width = def.headers.length;
  var header = sheet.getRange(1, 1, 1, width);
  var current = header.getValues()[0];
  if (current.join('|') !== def.headers.join('|')) {
    header.setValues([def.headers]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  // 키 열을 일반 텍스트로 고정해 '2026-09-03'이 날짜 값으로 바뀌지 않게 한다.
  sheet.getRange('A:A').setNumberFormat('@');
  return sheet;
}

function formatKey_(v, pattern) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), pattern);
  return String(v).trim();
}

function toBool_(v) {
  return v === true || String(v).toUpperCase() === 'TRUE';
}

function readRows_(def) {
  var sheet = getSheet_(def);
  var last = sheet.getLastRow();
  if (last < 2) return [];
  return sheet.getRange(2, 1, last - 1, def.headers.length).getValues();
}

function readRecords_() {
  var out = [];
  readRows_(RECORDS).forEach(function (row) {
    var date = formatKey_(row[0], 'yyyy-MM-dd');
    if (!RECORDS.keyRe.test(date)) return;
    out.push({
      date: date,
      worked: toBool_(row[1]),
      memo: row[2] == null ? '' : String(row[2]),
      updatedAt: Number(row[3]) || 0,
      amount: row[4] === '' ? (toBool_(row[1]) ? 1 : 0) : Number(row[4]) || 0,
      overtime: Number(row[5]) || 0,
      night: Number(row[6]) || 0,
      extra: Number(row[7]) || 0,
    });
  });
  return out;
}

function readMonths_() {
  var out = [];
  readRows_(MONTHS).forEach(function (row) {
    var month = formatKey_(row[0], 'yyyy-MM');
    if (!MONTHS.keyRe.test(month)) return;
    out.push({ month: month, memo: row[1] == null ? '' : String(row[1]), updatedAt: Number(row[2]) || 0 });
  });
  return out;
}

function recordToRow_(r) {
  if (!r || !RECORDS.keyRe.test(String(r.date))) return null;
  var worked = r.worked === true;
  var amount = worked ? (Number(r.amount) === 0.5 || r.half === true ? 0.5 : 1) : 0;
  return [
    String(r.date),
    worked,
    r.memo == null ? '' : String(r.memo),
    Number(r.updatedAt) || Date.now(),
    amount,
    Number(r.overtime) || 0,
    Number(r.night) || 0,
    Number(r.extra) || 0,
  ];
}

function monthToRow_(m) {
  if (!m || !MONTHS.keyRe.test(String(m.month))) return null;
  return [String(m.month), m.memo == null ? '' : String(m.memo), Number(m.updatedAt) || Date.now()];
}

/** 첫 열(키) 기준 upsert. 시트 쪽이 더 최근에 고쳐졌으면 덮어쓰지 않는다. */
function upsert_(def, rows) {
  rows = rows.filter(function (r) { return r; });
  if (!rows.length) return 0;
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sheet = getSheet_(def);
    var width = def.headers.length;
    var u = def.updatedCol - 1;
    var last = sheet.getLastRow();
    var existing = last >= 2 ? sheet.getRange(2, 1, last - 1, width).getValues() : [];
    var index = {};
    for (var i = 0; i < existing.length; i++) {
      index[formatKey_(existing[i][0], def === RECORDS ? 'yyyy-MM-dd' : 'yyyy-MM')] = i;
    }

    var appended = [];
    var changed = 0;
    rows.forEach(function (row) {
      var at = index[row[0]];
      if (at === undefined) {
        index[row[0]] = existing.length + appended.length;
        appended.push(row);
        changed++;
      } else if (at < existing.length) {
        if ((Number(existing[at][u]) || 0) <= row[u]) {
          existing[at] = row;
          changed++;
        }
      } else if (appended[at - existing.length][u] <= row[u]) {
        appended[at - existing.length] = row;
      }
    });

    if (existing.length) sheet.getRange(2, 1, existing.length, width).setValues(existing);
    if (appended.length) {
      sheet.getRange(existing.length + 2, 1, appended.length, width).setValues(appended);
      var total = sheet.getLastRow();
      if (total > 2) sheet.getRange(2, 1, total - 1, width).sort({ column: 1, ascending: true });
    }
    return changed;
  } finally {
    lock.releaseLock();
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------------------
// 기존 엑셀(월별 시트) 데이터 이전 — 필요할 때 편집기에서 한 번만 실행
// ---------------------------------------------------------------------------

/**
 * 기존 월별 시트를 records / months 시트로 옮긴다.
 *
 * 기존 형식 (다르면 아래 설정값을 고쳐서 실행):
 *  - 탭 이름에 월이 들어 있음: '9월', '2026-09', '2026년 9월' 등.
 *    '9월'처럼 연도가 없으면 LEGACY_DEFAULT_YEAR(올해) 사용 — 작년 탭은 '2025년 12월'처럼 연도를 넣을 것.
 *  - 1~31행이 그 달의 1~31일.
 *  - A열: 출근한 날은 일차 숫자, 출근 안 한 날은 빈칸.
 *  - B열: 메모 (있을 수도 없을 수도). A열이 비어 있고 B열만 있으면 메모만 있는 날(쉬는 날).
 *  - 32행부터: 그 달의 정리 메모 (예: '21.5일 근무', '연장 3시간') → months 시트로.
 *
 * 메모에서 아래를 읽어 앱의 입력 칸으로도 옮긴다 (메모 글자는 그대로 둔다):
 *  - '반차' / '반나절' → 반나절 근무 (또는 A열 일차가 앞날보다 0.5만 늘어난 경우)
 *  - '연장 1시간', '야간 2', '추가근무 1.5시간', '연장 30분' → 해당 근무 시간
 * 이미 records / months 에 있는 날짜·월은 덮어쓰지 않는다. 결과는 실행 로그에 나온다.
 */
var LEGACY_DEFAULT_YEAR = new Date().getFullYear();
var LEGACY_FIRST_ROW = 1;
var LEGACY_DAY_COL = 1; // A
var LEGACY_MEMO_COL = 2; // B
var LEGACY_SUMMARY_FIRST_ROW = 32;
var LEGACY_SUMMARY_MAX_ROWS = 20;

function migrateLegacy() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var haveDay = {};
  readRecords_().forEach(function (r) { haveDay[r.date] = true; });
  var haveMonth = {};
  readMonths_().forEach(function (m) { if (m.memo) haveMonth[m.month] = true; });

  var now = Date.now();
  var records = [];
  var months = [];
  var width = Math.max(LEGACY_DAY_COL, LEGACY_MEMO_COL);
  ss.getSheets().forEach(function (sheet) {
    var ym = parseYearMonth_(sheet.getName());
    if (!ym) return;
    var ymKey = ym.year + '-' + pad2_(ym.month);
    var daysInMonth = new Date(ym.year, ym.month, 0).getDate();
    var values = sheet.getRange(LEGACY_FIRST_ROW, 1, daysInMonth, width).getValues();
    var prevNumber = 0;
    for (var d = 1; d <= daysInMonth; d++) {
      var row = values[d - 1];
      var num = parseDayNumber_(row[LEGACY_DAY_COL - 1]);
      var memo = row[LEGACY_MEMO_COL - 1] == null ? '' : String(row[LEGACY_MEMO_COL - 1]).trim();
      var worked = num !== null;
      if (!worked && !memo) continue;
      var rec = { date: ymKey + '-' + pad2_(d), worked: worked, memo: memo, updatedAt: now };
      if (worked) {
        var half = /반차|반나절/.test(memo) || num - prevNumber === 0.5;
        rec.amount = half ? 0.5 : 1;
        rec.overtime = parseHours_(memo, /연장/);
        rec.night = parseHours_(memo, /야간/);
        rec.extra = parseHours_(memo, /추가\s*근무|추가/);
        prevNumber = num;
      }
      if (!haveDay[rec.date]) records.push(rec);
    }

    var summary = sheet
      .getRange(LEGACY_SUMMARY_FIRST_ROW, 1, LEGACY_SUMMARY_MAX_ROWS, width)
      .getDisplayValues()
      .map(function (r) { return r.map(function (c) { return String(c).trim(); }).filter(String).join(' '); })
      .filter(String)
      .join('\n');
    if (summary && !haveMonth[ymKey]) months.push({ month: ymKey, memo: summary, updatedAt: now });
  });

  var n = upsert_(RECORDS, records.map(recordToRow_));
  var m = upsert_(MONTHS, months.map(monthToRow_));
  Logger.log('옮긴 기록: ' + n + '일, 월 정리 메모: ' + m + '개월');
}

function parseYearMonth_(name) {
  var m = String(name).match(/(\d{4})\D{0,3}(\d{1,2})/);
  if (m) return validMonth_(Number(m[1]), Number(m[2]));
  m = String(name).match(/^\s*(\d{1,2})\s*월/);
  if (m) return validMonth_(LEGACY_DEFAULT_YEAR, Number(m[1]));
  return null;
}

function validMonth_(year, month) {
  return month >= 1 && month <= 12 ? { year: year, month: month } : null;
}

/** A열 일차: 숫자면 그 값, 비었거나 숫자가 아니면 null */
function parseDayNumber_(v) {
  if (v === '' || v == null) return null;
  var n = typeof v === 'number' ? v : Number(String(v).replace(/일차|일/g, '').trim());
  return isFinite(n) && n > 0 ? n : null;
}

/** '연장 1시간', '연장1.5', '연장 30분', '연장 1시간 30분' → 시간(30분 단위). 숫자가 없으면 0 */
function parseHours_(memo, labelRe) {
  var re = new RegExp('(?:' + labelRe.source + ')\\s*(?:근무)?\\s*(?:(\\d+(?:\\.\\d+)?)\\s*(?:시간|h)?)?\\s*(?:(\\d+)\\s*분)?');
  var m = memo.match(re);
  if (!m) return 0;
  var h = (m[1] ? Number(m[1]) : 0) + (m[2] ? Number(m[2]) / 60 : 0);
  return Math.round(h * 2) / 2;
}

function pad2_(n) {
  return (n < 10 ? '0' : '') + n;
}
