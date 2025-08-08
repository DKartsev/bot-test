const { google } = require('googleapis');

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;
const SCOPE = ['https://www.googleapis.com/auth/spreadsheets'];

async function getAuth() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64) {
    const json = JSON.parse(
      Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64, 'base64').toString('utf8')
    );
    return new google.auth.JWT(json.client_email, null, json.private_key, SCOPE);
  }
  // Default creds via GOOGLE_APPLICATION_CREDENTIALS
  return await google.auth.getClient({ scopes: SCOPE });
}

let sheets;
async function getSheets() {
  if (!sheets) {
    const auth = await getAuth();
    sheets = google.sheets({ version: 'v4', auth });
  }
  return sheets;
}

function mapRows(values) {
  if (!values || !values.length) return [];
  const headers = values[0];
  return values.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i];
    });
    return obj;
  });
}

async function fetchAll() {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Sheet1'
  });
  return mapRows(res.data.values);
}

async function pushChanges({ upserts = [], deletes = [] }) {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Sheet1'
  });
  const values = res.data.values || [];
  const headers = values[0] || [];
  const idIdx = headers.indexOf('id');
  const map = new Map();
  for (let i = 1; i < values.length; i++) {
    const id = values[i][idIdx];
    if (id) map.set(id, i + 1); // sheet rows start at 1
  }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  for (const row of upserts) {
    const arr = headers.map((h) => row[h] || '');
    const rowNum = map.get(row.id);
    if (rowNum) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Sheet1!A${rowNum}:H${rowNum}`,
        valueInputOption: 'RAW',
        resource: { values: [arr] }
      });
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Sheet1',
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: { values: [arr] }
      });
    }
    await sleep(100);
  }

  if (process.env.SYNC_BIDIRECTIONAL === '1' && process.env.SYNC_ALLOW_DELETES === '1') {
    for (const id of deletes) {
      const rowNum = map.get(id);
      if (!rowNum) continue;
      const arr = headers.map((h) => (h === 'id' ? id : h === 'status' ? 'deleted' : ''));
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Sheet1!A${rowNum}:H${rowNum}`,
        valueInputOption: 'RAW',
        resource: { values: [arr] }
      });
      await sleep(100);
    }
  }
}

module.exports = { fetchAll, pushChanges };
