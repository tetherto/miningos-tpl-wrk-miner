'use strict'

const test = require('brittle')
const { saveStats } = require('../../workers/lib/wrk-fun-stats')

// Test the module structure and exports

test('saveStats function exists and is callable', (t) => {
  t.ok(typeof saveStats === 'function', 'saveStats should be a function')
  t.is(saveStats.length, 3, 'saveStats should accept 3 parameters (logKey, dataKey, data)')
})

test('saveStats module exports', (t) => {
  const wrkFunStats = require('../../workers/lib/wrk-fun-stats')

  t.ok(wrkFunStats, 'Module should export an object')
  t.ok(typeof wrkFunStats.saveStats === 'function', 'Module should export saveStats function')
  t.is(Object.keys(wrkFunStats).length, 1, 'Module should export exactly one function')
})
