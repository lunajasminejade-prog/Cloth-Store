import * as SQLite from 'expo-sqlite';

const results = [];
const show = () => { document.getElementById('results').textContent = JSON.stringify(results, null, 2); };
results.push({ crossOriginIsolated, SharedArrayBuffer: typeof SharedArrayBuffer });
show();
(async () => {
  try {
    const db = SQLite.openDatabaseSync(':memory:');
    results.push({ syncColdOpen: 'passed' });
    db.closeSync();
  } catch (error) { results.push({ syncColdOpen: error.message }); }
  show();
  try {
    const db = await SQLite.openDatabaseAsync(':memory:');
    results.push({ asyncOpen: 'passed' });
    try {
      results.push({ syncSmallQuery: db.getFirstSync('SELECT 42 AS answer') });
      results.push({ syncLargeQuery: db.getFirstSync("SELECT printf('%01000d', 1) AS content").content.length });
    } catch (error) { results.push({ syncQueryError: error.message }); }
    results.push({ asyncLargeQuery: (await db.getFirstAsync("SELECT printf('%01000d', 1) AS content")).content.length });
    await db.closeAsync();
  } catch (error) { results.push({ asyncError: error.message }); }
  show();
})();
