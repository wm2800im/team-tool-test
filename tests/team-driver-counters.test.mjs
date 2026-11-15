import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const start = source.indexOf('function driverSuggestion(');
const end = source.indexOf('async function addSelectedGroup(', start);
assert.ok(start >= 0 && end > start);
const suggestion = new Function('canonical', 'flattenTrips', 'lastDrivingDateBefore', 'groupCode',
  source.slice(start, end) + '\nreturn driverSuggestion;');

test('La suggestion de conducteur suit uniquement les trajets chargés pour l’équipe', () => {
  const members = ['alex', 'zoe'];
  const predict = driver => suggestion(
    people => [...people].sort(),
    () => [
      { date: '2026-11-10', participants: members, driver },
      { date: '2026-11-20', participants: members, driver: driver === 'alex' ? 'zoe' : 'alex' }
    ],
    () => '',
    people => people.join('|')
  )('2026-11-15', members);
  assert.deepEqual(predict('alex').counts, { alex: 1, zoe: 0 });
  assert.deepEqual(predict('alex').candidates, ['zoe']);
  assert.deepEqual(predict('zoe').counts, { alex: 0, zoe: 1 });
  assert.deepEqual(predict('zoe').candidates, ['alex']);
});
