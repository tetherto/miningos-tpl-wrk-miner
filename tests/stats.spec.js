'use strict'

const test = require('brittle')
const libStats = require('../workers/lib/stats')
const { STATUS } = require('../workers/lib/constants')
const { hasErrorAndPositiveHashrate } = require('../workers/lib/utils')

const testEntries = [
  { last: { snap: { stats: { status: STATUS.OFFLINE, hashrate_mhs: { t_5m: 0 } }, config: { power_mode: 'low' } } }, info: { container: 'group1', type: 'typeA' } },
  { last: { snap: { stats: { status: STATUS.SLEEPING, hashrate_mhs: { t_5m: 10 } }, config: { power_mode: 'normal' } } }, info: { container: 'group2', type: 'typeB' } },
  { last: { snap: { stats: { status: STATUS.MINING, hashrate_mhs: { t_5m: 15 } }, config: { power_mode: 'high' } } }, info: { container: 'group1', type: 'typeA' } },
  { last: { snap: { stats: { status: STATUS.ERROR, errors: ['err'], hashrate_mhs: { t_5m: 5 } }, config: { power_mode: 'low' } } }, info: { container: 'group3', type: 'typeC' } },
  { last: { snap: { stats: { status: STATUS.OFFLINE, hashrate_mhs: { t_5m: 0 } }, config: { power_mode: 'low' } } }, info: { container: 'maintenance', type: 'typeD' } }
]

function testFilterOperation (t, opName, expectedCount) {
  const result = testEntries.filter(entry => libStats.specs.miner_default.ops[opName].filter(entry))
  t.is(result.length, expectedCount, `Operation "${opName}" should count ${expectedCount} entries`)
}

// Helper to generate test cases for filter operations
function createFilterTest (opName, expectedCount) {
  return (t) => {
    testFilterOperation(t, opName, expectedCount)
  }
}

// Helper to group entries by a property
function groupEntriesBy (entries, propertyPath) {
  return entries.reduce((acc, entry) => {
    const group = propertyPath.split('.').reduce((obj, key) => obj?.[key], entry)
    if (!acc[group]) acc[group] = []
    acc[group].push(entry)
    return acc
  }, {})
}

// Helper to filter entries by operation
function filterEntriesByOperation (entries, opName) {
  return entries.filter(entry => libStats.specs.miner_default.ops[opName].filter(entry))
}

test('hasErrorAndPositiveHashrate works correctly', (t) => {
  const entry = testEntries[3]
  t.ok(hasErrorAndPositiveHashrate(entry), 'Should return true for error status and positive hashrate')
})

test('Filters: hashrate_mhs_1m_cnt', createFilterTest('hashrate_mhs_1m_cnt', 4))
test('Filters: hashrate_mhs_1m_cnt_active', createFilterTest('hashrate_mhs_1m_cnt_active', 1))
test('Filters: offline_or_sleeping_miners_cnt', createFilterTest('offline_or_sleeping_miners_cnt', 2))
test('Filters: online_or_minor_error_miners_cnt', createFilterTest('online_or_minor_error_miners_cnt', 1))
test('Filters: error_miners_cnt', createFilterTest('error_miners_cnt', 1))

test('Filters: offline_cnt', (t) => {
  const groupedResult = groupEntriesBy(testEntries, 'info.container')
  const offlineGroup = filterEntriesByOperation(groupedResult.group1 || [], 'offline_cnt')
  t.is(offlineGroup.length, 1, 'Group offline count should be 1 for group1')
})

test('Filters: error_cnt', createFilterTest('error_cnt', 1))
test('Filters: power_mode_sleep_cnt', createFilterTest('power_mode_sleep_cnt', 1))
test('Filters: power_mode_low_cnt', createFilterTest('power_mode_low_cnt', 0))
test('Filters: power_mode_normal_cnt', createFilterTest('power_mode_normal_cnt', 0))
test('Filters: power_mode_high_cnt', createFilterTest('power_mode_high_cnt', 1))
test('Filters: power_mode_low_include_error_cnt', createFilterTest('power_mode_low_include_error_cnt', 1))
test('Filters: power_mode_normal_include_error_cnt', createFilterTest('power_mode_normal_include_error_cnt', 0))
test('Filters: power_mode_high_include_error_cnt', createFilterTest('power_mode_high_include_error_cnt', 0))
test('Filters: type_cnt', createFilterTest('type_cnt', 4))
test('Filters: offline_type_cnt', createFilterTest('offline_type_cnt', 1))
test('Filters: maintenance_type_cnt', createFilterTest('maintenance_type_cnt', 1))
test('Filters: online_positive_hashrate_type_cnt', createFilterTest('online_positive_hashrate_type_cnt', 3))
test('Filters: online_without_hashrate_type_cnt', createFilterTest('online_without_hashrate_type_cnt', 0))
test('Filters: error_type_cnt', createFilterTest('error_type_cnt', 1))
test('Filters: power_mode_sleep_type_cnt', createFilterTest('power_mode_sleep_type_cnt', 1))
test('Filters: power_mode_low_type_cnt', createFilterTest('power_mode_low_type_cnt', 0))
test('Filters: power_mode_normal_type_cnt', createFilterTest('power_mode_normal_type_cnt', 0))
test('Filters: power_mode_high_type_cnt', createFilterTest('power_mode_high_type_cnt', 1))

test('Filters: offline_type_cnt with maintenance', (t) => {
  // add maintenance entry
  const maintenanceEntry = { last: { snap: { stats: { status: STATUS.OFFLINE }, config: { power_mode: 'low' } } }, info: { container: 'maintenance', type: 'typeD' } }
  const testEntriesWithMaintenance = [...testEntries, maintenanceEntry]

  const offlineGroup = filterEntriesByOperation(testEntriesWithMaintenance, 'offline_type_cnt')
  t.is(offlineGroup.length, 1, 'Offline count should be 1')
})
