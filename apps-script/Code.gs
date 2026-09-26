/**
 * 출근도장 — 구글 시트 백엔드 (Google Apps Script 웹앱)
 *
 * 설치:
 *  1. 구글 시트 → 확장 프로그램 → Apps Script → 이 파일 내용을 붙여넣고 저장
 *  2. 프로젝트 설정(⚙️) → 스크립트 속성 → 속성 추가: SYNC_TOKEN = (아무 비밀 문자열)
 *  3. 편집기에서 setup 함수를 한 번 실행 (권한 허용) → records 시트가 만들어짐
 *  4. 배포 → 새 배포 → 유형: 웹 앱, 실행 계정: 나, 액세스 권한: 모든 사용자 → 배포
 *  5. 나온 웹 앱 URL(…/exec)과 SYNC_TOKEN 값을 앱 [설정]에 입력
 *
 * 시트 구조 (시트 이름 records, 1행 헤더):  date | worked | memo | updatedAt
 */

var SHEET_NAME = 'records';
var HEADERS = ['date', 'worked', 'memo', 'updatedAt'];
var DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function doGet(e) {
  try {
    checkToken_(e && e.parameter && e.parameter.token);
    return json_({ ok: true, records: readAll_() });
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
    var count = upsert_(body.records);
    return json_({ ok: true, count: count });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

/** 처음 한 번 실행: records 시트와 헤더를 만든다. */
function setup() {
  getSheet_();
}

/**
 * 보호자가 시트에서 직접 고치면 updatedAt을 지금 시각으로 바꿔
 * 앱이 다음 실행 때 시트 쪽 수정을 가져가게 한다 (단순 트리거, 설치 불필요).
 */
function onEdit(e) {
  var range = e && e.range;
  if (!range) return;
  var sheet = range.getSheet();
  if (sheet.getName() !== SHEET_NAME) return;
  var firstRow = Math.max(range.getRow(), 2);
  var lastRow = range.getLastRow();
  if (lastRow < firstRow) return;
  // updatedAt 열(4열)만 고친 경우는 건드리지 않는다.
  if (range.getColumn() === 4 && range.getLastColumn() === 4) return;
  var now = Date.now();
  var values = [];
  for (var r = firstRow; r <= lastRow; r++) values.push([now]);
  sheet.getRange(firstRow, 4, values.length, 1).setValues(values);
}

// ---------------------------------------------------------------------------

function checkToken_(token) {
  var expected = PropertiesService.getScriptProperties().getProperty('SYNC_TOKEN');
  if (!expected) throw new Error('스크립트 속성 SYNC_TOKEN이 설정되지 않았습니다');
  if (token !== expected) throw new Error('토큰이 맞지 않습니다');
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  // date 열을 일반 텍스트로 고정해 '2026-09-03'이 날짜 값으로 바뀌지 않게 한다.
  sheet.getRange('A:A').setNumberFormat('@');
  return sheet;
}

function formatDate_(v) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(v).trim();
}

function toBool_(v) {
  return v === true || String(v).toUpperCase() === 'TRUE';
}

function readAll_() {
  var sheet = getSheet_();
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var rows = sheet.getRange(2, 1, last - 1, 4).getValues();
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    var date = formatDate_(rows[i][0]);
    if (!DATE_RE.test(date)) continue;
    out.push({
      date: date,
      worked: toBool_(rows[i][1]),
      memo: rows[i][2] == null ? '' : String(rows[i][2]),
      updatedAt: Number(rows[i][3]) || 0,
    });
  }
  return out;
}

/** date 기준 upsert. 시트 쪽이 더 최근에 고쳐졌으면 덮어쓰지 않는다. */
function upsert_(records) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sheet = getSheet_();
    var last = sheet.getLastRow();
    var existing = last >= 2 ? sheet.getRange(2, 1, last - 1, 4).getValues() : [];
    var index = {};
    for (var i = 0; i < existing.length; i++) {
      index[formatDate_(existing[i][0])] = i;
    }

    var appended = [];
    var changed = 0;
    for (var j = 0; j < records.length; j++) {
      var r = records[j];
      if (!r || !DATE_RE.test(String(r.date))) continue;
      var row = [String(r.date), r.worked === true, r.memo == null ? '' : String(r.memo), Number(r.updatedAt) || Date.now()];
      var at = index[row[0]];
      if (at === undefined) {
        index[row[0]] = existing.length + appended.length;
        appended.push(row);
        changed++;
      } else if (at < existing.length) {
        if ((Number(existing[at][3]) || 0) <= row[3]) {
          existing[at] = row;
          changed++;
        }
      } else {
        appended[at - existing.length] = row;
      }
    }

    if (existing.length) sheet.getRange(2, 1, existing.length, 4).setValues(existing);
    if (appended.length) sheet.getRange(existing.length + 2, 1, appended.length, 4).setValues(appended);
    if (appended.length) sortByDate_(sheet);
    return changed;
  } finally {
    lock.releaseLock();
  }
}

function sortByDate_(sheet) {
  var last = sheet.getLastRow();
  if (last > 2) sheet.getRange(2, 1, last - 1, 4).sort({ column: 1, ascending: true });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------------------
// 기존 엑셀(월별 시트) 데이터 이전 — 필요할 때 편집기에서 한 번만 실행
// ---------------------------------------------------------------------------

/**
 * 기존 월별 시트를 records 시트로 옮긴다.
 *
 * 가정한 기존 형식 (다르면 아래 설정값을 고쳐서 실행):
 *  - 시트 이름에 연·월이 들어 있음: '2026-09', '2026.9', '2026년 9월' 등.
 *    '9월'처럼 연도가 없으면 LEGACY_DEFAULT_YEAR 사용.
 *  - 1~31행이 그 달의 1~31일.
 *  - B열: 출근한 날은 일차 숫자(예: 3). 숫자 뒤에 글자가 있으면 메모로 본다(예: '4 연장').
 *    숫자 없이 글자만 있으면 메모만 있는 날(출근 아님)로 본다.
 *  - C열에 메모가 따로 있으면 함께 가져온다.
 * 이미 records에 있는 날짜는 덮어쓰지 않는다. 결과는 로그(보기 → 실행 로그)에 나온다.
 */
var LEGACY_DEFAULT_YEAR = new Date().getFullYear();
var LEGACY_FIRST_ROW = 1;
var LEGACY_DAY_COL = 2; // B
var LEGACY_MEMO_COL = 3; // C

function migrateLegacy() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var already = {};
  readAll_().forEach(function (r) {
    already[r.date] = true;
  });

  var now = Date.now();
  var records = [];
  ss.getSheets().forEach(function (sheet) {
    var ym = parseYearMonth_(sheet.getName());
    if (!ym) return;
    var daysInMonth = new Date(ym.year, ym.month, 0).getDate();
    var values = sheet.getRange(LEGACY_FIRST_ROW, 1, daysInMonth, Math.max(LEGACY_DAY_COL, LEGACY_MEMO_COL)).getValues();
    for (var d = 1; d <= daysInMonth; d++) {
      var row = values[d - 1];
      var parsed = parseLegacyCell_(row[LEGACY_DAY_COL - 1]);
      var extra = row[LEGACY_MEMO_COL - 1] == null ? '' : String(row[LEGACY_MEMO_COL - 1]).trim();
      var memo = [parsed.memo, extra].filter(function (s) { return s; }).join(', ');
      if (!parsed.worked && !memo) continue;
      var date = ym.year + '-' + pad2_(ym.month) + '-' + pad2_(d);
      if (already[date]) continue;
      records.push({ date: date, worked: parsed.worked, memo: memo, updatedAt: now });
    }
  });

  var n = records.length ? upsert_(records) : 0;
  Logger.log('옮긴 기록: ' + n + '일');
}

function parseYearMonth_(name) {
  var m = String(name).match(/(\d{4})\D{0,3}(\d{1,2})/);
  if (m) return valid_(Number(m[1]), Number(m[2]));
  m = String(name).match(/^(\d{1,2})\s*월/);
  if (m) return valid_(LEGACY_DEFAULT_YEAR, Number(m[1]));
  return null;
}

function valid_(year, month) {
  return month >= 1 && month <= 12 ? { year: year, month: month } : null;
}

function parseLegacyCell_(v) {
  if (v === '' || v == null) return { worked: false, memo: '' };
  if (typeof v === 'number') return { worked: v > 0, memo: '' };
  var s = String(v).trim();
  var m = s.match(/^(\d+)\s*(?:일차)?\s*[,·.\-]?\s*(.*)$/);
  if (m) return { worked: true, memo: m[2].trim() };
  return { worked: false, memo: s };
}

function pad2_(n) {
  return (n < 10 ? '0' : '') + n;
}
