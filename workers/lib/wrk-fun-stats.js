'use strict'

const utilsStore = require('@tetherto/hp-svc-facs-store/utils')
const lWrkFunLogs = require('@tetherto/miningos-tpl-wrk-thing/workers/lib/wrk-fun-logs')

async function saveStats (logKey, dataKey, data) {
  const log = await lWrkFunLogs.getBeeTimeLog.call(this, logKey, 0, true)
  if (!log) return

  await log.put(
    utilsStore.convIntToBin(dataKey),
    Buffer.from(JSON.stringify(data))
  )
  await lWrkFunLogs.releaseBeeTimeLog.call(this, log)
}

module.exports = {
  saveStats
}
