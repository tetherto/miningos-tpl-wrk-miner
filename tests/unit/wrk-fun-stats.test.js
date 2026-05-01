'use strict'

const test = require('brittle')
const path = require('path')

const utilsPath = require.resolve('@tetherto/hp-svc-facs-store/utils')
const logsPath = require.resolve('@tetherto/miningos-tpl-wrk-thing/workers/lib/wrk-fun-logs')
const wrkFunStatsPath = require.resolve('../../workers/lib/wrk-fun-stats')

function cacheModule (resolvedPath, exports) {
  require.cache[resolvedPath] = {
    id: resolvedPath,
    path: path.dirname(resolvedPath),
    filename: resolvedPath,
    loaded: true,
    exports
  }
}

function clearModuleChain () {
  delete require.cache[wrkFunStatsPath]
  delete require.cache[utilsPath]
  delete require.cache[logsPath]
}

test('saveStats function exists and is callable', (t) => {
  const { saveStats } = require('../../workers/lib/wrk-fun-stats')
  t.ok(typeof saveStats === 'function', 'saveStats should be a function')
  t.is(saveStats.length, 3, 'saveStats should accept 3 parameters (logKey, dataKey, data)')
})

test('saveStats module exports', (t) => {
  const wrkFunStats = require('../../workers/lib/wrk-fun-stats')

  t.ok(wrkFunStats, 'Module should export an object')
  t.ok(typeof wrkFunStats.saveStats === 'function', 'Module should export saveStats function')
  t.is(Object.keys(wrkFunStats).length, 1, 'Module should export exactly one function')
})

test('saveStats returns early when log is missing', async (t) => {
  t.teardown(() => {
    clearModuleChain()
  })

  clearModuleChain()
  cacheModule(utilsPath, {
    convIntToBin: (dataKey) => Buffer.from(String(dataKey))
  })
  cacheModule(logsPath, {
    getBeeTimeLog: async function () {
      return null
    },
    releaseBeeTimeLog: async function () {
      t.fail('releaseBeeTimeLog should not run when log is missing')
    }
  })

  const { saveStats } = require('../../workers/lib/wrk-fun-stats')
  await saveStats.call({}, 'logKey', 1, { a: 1 })
  t.pass('completed without throwing')
})

test('saveStats puts data and releases log', async (t) => {
  t.teardown(() => {
    clearModuleChain()
  })

  const putCalls = []
  let releaseCalls = 0
  const mockLog = {
    put: async (key, buf) => {
      putCalls.push({ key, json: JSON.parse(buf.toString()) })
    }
  }

  clearModuleChain()
  cacheModule(utilsPath, {
    convIntToBin: (dataKey) => Buffer.from('bin:' + dataKey)
  })
  cacheModule(logsPath, {
    getBeeTimeLog: async function () {
      return mockLog
    },
    releaseBeeTimeLog: async function () {
      releaseCalls++
    }
  })

  const { saveStats } = require('../../workers/lib/wrk-fun-stats')
  const payload = { foo: 'bar', n: 42 }
  await saveStats.call({}, 'myLog', 7, payload)

  t.is(releaseCalls, 1, 'releaseBeeTimeLog should run once')
  t.is(putCalls.length, 1, 'log.put should run once')
  t.ok(Buffer.isBuffer(putCalls[0].key), 'key should be a buffer from convIntToBin')
  t.is(putCalls[0].json.foo, 'bar', 'stored JSON should match payload')
  t.is(putCalls[0].json.n, 42, 'stored JSON should match payload')
})
