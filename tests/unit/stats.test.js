'use strict'

const test = require('brittle')
const libStats = require('../../workers/lib/stats')
const { STATUS, MAINTENANCE } = require('../../workers/lib/constants')
const { hasErrorAndPositiveHashrate, getRackFromPos, groupByContainerRack } = require('../../workers/lib/utils')

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

function createFilterTest (opName, expectedCount) {
  return (t) => {
    testFilterOperation(t, opName, expectedCount)
  }
}

function groupEntriesBy (entries, propertyPath) {
  return entries.reduce((acc, entry) => {
    const group = propertyPath.split('.').reduce((obj, key) => obj?.[key], entry)
    if (!acc[group]) acc[group] = []
    acc[group].push(entry)
    return acc
  }, {})
}

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

test('Filters: hashrate_mhs_1m_type_group_sum excludes maintenance container', (t) => {
  const filter = libStats.specs.miner_default.ops.hashrate_mhs_1m_type_group_sum.filter
  const nonMaint = testEntries.find(e => e.info.container !== MAINTENANCE)
  const maint = testEntries.find(e => e.info.container === MAINTENANCE)
  t.ok(filter(nonMaint), 'non-maintenance entry should pass filter')
  t.absent(filter(maint), 'maintenance entry should not pass filter')
})

test('Filters: hashrate_mhs_5m_cnt_active', createFilterTest('hashrate_mhs_5m_cnt_active', 1))

test('Filters: not_mining_cnt and not_mining_type_cnt', (t) => {
  const entry = {
    last: { snap: { stats: { status: STATUS.NOT_MINING, hashrate_mhs: { t_5m: 0 } }, config: { power_mode: 'low' } } },
    info: { container: 'group1', type: 'typeX' }
  }
  const notMiningCnt = libStats.specs.miner_default.ops.not_mining_cnt.filter
  const notMiningTypeCnt = libStats.specs.miner_default.ops.not_mining_type_cnt.filter
  t.ok(notMiningCnt(entry), 'not_mining_cnt filter should match NOT_MINING entry')
  t.ok(notMiningTypeCnt(entry), 'not_mining_type_cnt filter should match NOT_MINING entry')
})

test('Filters: offline_type_cnt with maintenance', (t) => {
  // add maintenance entry
  const maintenanceEntry = { last: { snap: { stats: { status: STATUS.OFFLINE }, config: { power_mode: 'low' } } }, info: { container: 'maintenance', type: 'typeD' } }
  const testEntriesWithMaintenance = [...testEntries, maintenanceEntry]

  const offlineGroup = filterEntriesByOperation(testEntriesWithMaintenance, 'offline_type_cnt')
  t.is(offlineGroup.length, 1, 'Offline count should be 1')
})

// Rack helper function tests
test('getRackFromPos extracts rack from position string', (t) => {
  t.is(getRackFromPos('1-1_1'), '1-1', 'Should extract rack from "1-1_1"')
  t.is(getRackFromPos('1-2_3'), '1-2', 'Should extract rack from "1-2_3"')
  t.is(getRackFromPos('2-5_10'), '2-5', 'Should extract rack from "2-5_10"')
  t.is(getRackFromPos('rack1_socket5'), 'rack1', 'Should extract rack from "rack1_socket5"')
  t.is(getRackFromPos(null), null, 'Should return null for null input')
  t.is(getRackFromPos(undefined), null, 'Should return null for undefined input')
  t.is(getRackFromPos(''), null, 'Should return null for empty string')
  t.is(getRackFromPos('no-underscore'), 'no-underscore', 'Should return full string if no underscore')
})

test('groupByContainerRack returns container-rack key', (t) => {
  const ext1 = { info: { container: 'group-1', pos: '1-1_1' } }
  const ext2 = { info: { container: 'group-2', pos: '2-3_5' } }
  const ext3 = { info: { container: 'group-1', pos: '1-2_2' } }
  const extNoPos = { info: { container: 'group-1' } }
  const extNoContainer = { info: { pos: '1-1_1' } }

  t.is(groupByContainerRack(ext1), 'group-1_1-1', 'Should return "group-1-1-1" for container "group-1" and pos "1-1_1"')
  t.is(groupByContainerRack(ext2), 'group-2_2-3', 'Should return "group-2-2-3" for container "group-2" and pos "2-3_5"')
  t.is(groupByContainerRack(ext3), 'group-1_1-2', 'Should return "group-1-1-2" for container "group-1" and pos "1-2_2"')
  t.is(groupByContainerRack(extNoPos), null, 'Should return null when pos is missing')
  t.is(groupByContainerRack(extNoContainer), null, 'Should return null when container is missing')
  t.is(groupByContainerRack(null), null, 'Should return null when ext is null')
})

// Rack stats operations tests
test('Rack stats operations are defined', (t) => {
  const ops = libStats.specs.miner_default.ops

  t.ok(ops.hashrate_mhs_5m_pdu_rack_group_sum, 'hashrate_mhs_5m_pdu_rack_group_sum should be defined')
  t.ok(ops.hashrate_mhs_5m_pdu_rack_group_avg, 'hashrate_mhs_5m_pdu_rack_group_avg should be defined')
  t.ok(ops.efficiency_w_ths_pdu_rack_group_avg, 'efficiency_w_ths_pdu_rack_group_avg should be defined')
  t.ok(ops.power_w_pdu_rack_group_sum, 'power_w_pdu_rack_group_sum should be defined')
})
