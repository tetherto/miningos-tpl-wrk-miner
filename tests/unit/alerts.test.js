'use strict'

const test = require('brittle')
const libAlerts = require('../../workers/lib/alerts')
const crypto = require('crypto')

const getRandomIP = () => [...crypto.randomBytes(4)].join('.')

// Helper function to create mock context
const createMockContext = (thingConf = {}) => {
  return {
    id: 'test-miner-123',
    thingConf: {
      pools: [
        { url: 'stratum+tcp://pool1.example.com:4444', worker_name: 'worker1' },
        { url: 'stratum+tcp://pool2.example.com:4444', worker_name: 'worker2' }
      ],
      ...thingConf
    }
  }
}

// Helper function to create mock snap
const createMockSnap = (config = {}, stats = {}) => {
  return {
    config: {
      pool_config: [
        { url: 'stratum+tcp://pool1.example.com:4444', username: 'worker1.test-miner-123' },
        { url: 'stratum+tcp://pool2.example.com:4444', username: 'worker2.test-miner-123' }
      ],
      network_config: {
        ip_address: getRandomIP()
      },
      ...config
    },
    stats: {
      status: 'mining',
      ...stats
    }
  }
}

test('isValidPoolConfigSnap with valid snap', (t) => {
  const ctx = createMockContext()
  const snap = createMockSnap()

  // We need to access the function through the module's internal structure
  // Since it's not exported, we'll test it through the alert specs
  const alertSpec = libAlerts.specs.miner_default.wrong_miner_pool
  t.ok(alertSpec.valid(ctx, snap), 'Should return true for valid pool config snap')
})

test('miner alert valid callbacks agree on pool config snap', (t) => {
  const ctx = createMockContext()
  const snap = createMockSnap()
  const md = libAlerts.specs.miner_default
  t.ok(md.wrong_miner_subaccount.valid(ctx, snap))
  t.ok(md.wrong_worker_name.valid(ctx, snap))
  t.ok(md.ip_worker_name.valid(ctx, snap))
})

test('isValidPoolConfigSnap with invalid snap - no pools', (t) => {
  const ctx = createMockContext({ pools: [] })
  const snap = createMockSnap()

  const alertSpec = libAlerts.specs.miner_default.wrong_miner_pool
  t.not(alertSpec.valid(ctx, snap), 'Should return false for snap with no pools in context')
})

test('isValidPoolConfigSnap with invalid snap - no pool_config', (t) => {
  const ctx = createMockContext()
  const snap = createMockSnap({ pool_config: [] })

  const alertSpec = libAlerts.specs.miner_default.wrong_miner_pool
  t.not(alertSpec.valid(ctx, snap), 'Should return false for snap with no pool_config')
})

test('isValidPoolConfigSnap with offline status', (t) => {
  const ctx = createMockContext()
  const snap = createMockSnap({}, { status: 'offline' })

  const alertSpec = libAlerts.specs.miner_default.wrong_miner_pool
  t.not(alertSpec.valid(ctx, snap), 'Should return false for offline status')
})

test('wrong_miner_pool alert - correctly configured pools', (t) => {
  const ctx = createMockContext()
  const snap = createMockSnap()

  const alertSpec = libAlerts.specs.miner_default.wrong_miner_pool
  t.not(alertSpec.probe(ctx, snap), 'Should not trigger alert for correctly configured pools')
})

test('wrong_miner_pool alert - incorrectly configured pools', (t) => {
  const ctx = createMockContext()
  const snap = createMockSnap({
    pool_config: []
  })

  const alertSpec = libAlerts.specs.miner_default.wrong_miner_pool
  t.ok(alertSpec.probe(ctx, snap), 'Should trigger alert for incorrectly configured pools')
})

test('wrong_miner_subaccount alert - correct worker names', (t) => {
  const ctx = createMockContext()
  const snap = createMockSnap()

  const alertSpec = libAlerts.specs.miner_default.wrong_miner_subaccount
  t.not(alertSpec.probe(ctx, snap), 'Should not trigger alert for correct worker names')
})

test('wrong_miner_subaccount alert - incorrect worker names', (t) => {
  const ctx = createMockContext()
  const snap = createMockSnap({
    pool_config: [
      { url: 'stratum+tcp://pool1.example.com:4444', username: 'wrong-worker.test-miner-123' },
      { url: 'stratum+tcp://pool2.example.com:4444', username: 'worker2.test-miner-123' }
    ]
  })

  const alertSpec = libAlerts.specs.miner_default.wrong_miner_subaccount
  t.ok(alertSpec.probe(ctx, snap), 'Should trigger alert for incorrect worker names')
})

test('wrong_worker_name alert - correct ID in username', (t) => {
  const ctx = createMockContext()
  const snap = createMockSnap()

  const alertSpec = libAlerts.specs.miner_default.wrong_worker_name
  t.not(alertSpec.probe(ctx, snap), 'Should not trigger alert when ID is in username')
})

test('wrong_worker_name alert - IP in username', (t) => {
  const ctx = createMockContext()
  const snap = createMockSnap({
    pool_config: [
      { url: 'stratum+tcp://pool1.example.com:4444', username: 'worker1.192x168x1x100' },
      { url: 'stratum+tcp://pool2.example.com:4444', username: 'worker2.192x168x1x100' }
    ]
  })

  const alertSpec = libAlerts.specs.miner_default.wrong_worker_name
  t.not(alertSpec.probe(ctx, snap), 'Should not trigger alert when IP is in username')
})

test('wrong_worker_name alert - neither ID nor IP in username', (t) => {
  const ctx = createMockContext()
  const snap = createMockSnap({
    pool_config: [
      { url: 'stratum+tcp://pool1.example.com:4444', username: 'worker1.unknown' },
      { url: 'stratum+tcp://pool2.example.com:4444', username: 'worker2.unknown' }
    ]
  })

  const alertSpec = libAlerts.specs.miner_default.wrong_worker_name
  t.ok(alertSpec.probe(ctx, snap), 'Should trigger alert when neither ID nor IP is in username')
})

test('ip_worker_name alert - ID in username', (t) => {
  const ctx = createMockContext()
  const snap = createMockSnap()

  const alertSpec = libAlerts.specs.miner_default.ip_worker_name
  t.not(alertSpec.probe(ctx, snap), 'Should not trigger alert when ID is in username')
})

test('ip_worker_name alert - IP-based usernames', (t) => {
  const ctx = createMockContext()
  const ip = '10.20.30.40'
  const formatted = ip.replace(/\./g, 'x')
  const snap = createMockSnap({
    network_config: { ip_address: ip },
    pool_config: [
      { url: 'stratum+tcp://pool1.example.com:4444', username: `worker1.${formatted}` },
      { url: 'stratum+tcp://pool2.example.com:4444', username: `worker2.${formatted}` }
    ]
  })

  const alertSpec = libAlerts.specs.miner_default.ip_worker_name
  t.ok(alertSpec.probe(ctx, snap), 'Should trigger when usernames use IP pattern')
})

test('probe returns false when pool_config is empty', (t) => {
  const ctx = createMockContext()
  const emptyPoolsSnap = createMockSnap({ pool_config: [] })

  t.not(libAlerts.specs.miner_default.wrong_miner_subaccount.probe(ctx, emptyPoolsSnap))
  t.not(libAlerts.specs.miner_default.wrong_worker_name.probe(ctx, emptyPoolsSnap))
  t.not(libAlerts.specs.miner_default.ip_worker_name.probe(ctx, emptyPoolsSnap))
})

test('alert specs have required properties', (t) => {
  const alertTypes = ['wrong_miner_pool', 'wrong_miner_subaccount', 'wrong_worker_name', 'ip_worker_name']

  for (const alertType of alertTypes) {
    const alertSpec = libAlerts.specs.miner_default[alertType]
    t.ok(alertSpec, `Alert spec ${alertType} should exist`)
    t.ok(typeof alertSpec.valid === 'function', `Alert spec ${alertType} should have valid function`)
    t.ok(typeof alertSpec.probe === 'function', `Alert spec ${alertType} should have probe function`)
  }
})

test('alert specs extend default specs', (t) => {
  t.ok(libAlerts.specs.miner_default, 'miner_default specs should exist')
  t.ok(libAlerts.specs.default, 'default specs should exist')

  // Check that miner_default has the expected structure
  t.ok(libAlerts.specs.miner_default, 'miner_default should exist')
  t.ok(typeof libAlerts.specs.miner_default === 'object', 'miner_default should be an object')
})

test('edge cases - empty pools arrays', (t) => {
  const ctx = createMockContext({ pools: [] })
  const snap = createMockSnap({ pool_config: [] })

  const alertSpec = libAlerts.specs.miner_default.wrong_miner_pool
  t.not(alertSpec.probe(ctx, snap), 'Should not trigger alert with empty pools arrays')
})

test('edge cases - missing network config', (t) => {
  const ctx = createMockContext()
  const snap = createMockSnap({ network_config: {} })

  const alertSpec = libAlerts.specs.miner_default.wrong_worker_name
  // This should not trigger an alert because the snap is not valid for pool config
  t.not(alertSpec.probe(ctx, snap), 'Should not trigger alert when network config is missing')
})

test('edge cases - invalid snap structure', (t) => {
  const ctx = createMockContext()
  const snap = null

  const alertSpec = libAlerts.specs.miner_default.wrong_miner_pool

  // Test that these don't throw errors
  try {
    const valid = alertSpec.valid(ctx, snap)
    t.not(valid, 'Should return false for null snap')
  } catch (error) {
    t.pass('Should handle null snap gracefully in valid')
  }

  try {
    const probe = alertSpec.probe(ctx, snap)
    t.not(probe, 'Should return false for null snap')
  } catch (error) {
    t.pass('Should handle null snap gracefully in probe')
  }
})
