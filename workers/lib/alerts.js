'use strict'

const libAlerts = require('@tetherto/miningos-tpl-wrk-thing/workers/lib/alerts')
const libUtils = require('@tetherto/miningos-tpl-wrk-thing/workers/lib/utils')

function isValidPoolConfigSnap (ctx, snap) {
  return (
    libUtils.isValidSnap(snap) &&
    !libUtils.isOffline(snap) &&
    ctx.thingConf.pools &&
    ctx.thingConf.pools.length > 0 &&
    snap.config.pool_config &&
    snap.config.pool_config.length > 0
  )
}

function isIpPoolUsername (ip, minerPools, confPools) {
  for (let i = 0; i < confPools.length; i++) {
    const formattedIP = ip.replace(/\./g, 'x')
    const username = minerPools[i].username

    if (!username.includes(formattedIP)) {
      return false
    }
  }
  return true
}

function isCorrectPoolUsername (id, minerPools, confPools) {
  for (let i = 0; i < confPools.length; i++) {
    const username = minerPools[i].username
    if (!username.includes(id)) {
      return false
    }
  }
  return true
}

function isConfigWorkerNameInPoolUsername (minerPools, confPools) {
  for (let i = 0; i < confPools.length; i++) {
    const workerName = confPools[i].worker_name
    const username = minerPools[i].username

    if (!username.includes(workerName)) {
      return false
    }
  }
  return true
}

function areMinerPoolsUrlsCorrectlySetup (minerPools, confPools) {
  return minerPools?.length && confPools?.length
}

function wrongMinerPoolProbe (ctx, snap) {
  const configPools = ctx.thingConf.pools
  const minerPools = snap.config.pool_config
  return !areMinerPoolsUrlsCorrectlySetup(minerPools, configPools)
}

function wrongMinerSubaccountProbe (ctx, snap) {
  const configPools = ctx.thingConf.pools
  const minerPools = snap.config.pool_config
  if (configPools.length > 0 && minerPools.length > 0) {
    return !isConfigWorkerNameInPoolUsername(minerPools, configPools)
  }
  return false
}

function wrongWorkerNameProbe (ctx, snap) {
  const configPools = ctx.thingConf.pools
  const minerPools = snap.config.pool_config
  const id = ctx.id
  const ip = snap.config.network_config.ip_address
  if (configPools.length > 0 && minerPools.length > 0) {
    return (
      !isCorrectPoolUsername(id, minerPools, configPools) &&
      !isIpPoolUsername(ip, minerPools, configPools)
    )
  }
  return false
}

function ipWorkerNameProbe (ctx, snap) {
  const configPools = ctx.thingConf.pools
  const minerPools = snap.config.pool_config
  const ip = snap.config.network_config.ip_address

  if (configPools.length > 0 && minerPools.length > 0) {
    return isIpPoolUsername(ip, minerPools, configPools)
  }
  return false
}

libAlerts.specs.miner_default = {
  ...libAlerts.specs.default,
  wrong_miner_pool: {
    valid: (ctx, snap) => {
      return isValidPoolConfigSnap(ctx, snap)
    },
    probe: wrongMinerPoolProbe
  },
  wrong_miner_subaccount: {
    valid: (ctx, snap) => {
      return isValidPoolConfigSnap(ctx, snap)
    },
    probe: wrongMinerSubaccountProbe
  },
  wrong_worker_name: {
    valid: (ctx, snap) => {
      return isValidPoolConfigSnap(ctx, snap)
    },
    probe: wrongWorkerNameProbe
  },
  ip_worker_name: {
    valid: (ctx, snap) => {
      return isValidPoolConfigSnap(ctx, snap)
    },
    probe: ipWorkerNameProbe
  },
  'custom.low_hashrate.warning': {
    valid: (ctx, snap) => {
      const configuredParams = ctx.configuredParams['custom.low_hashrate.warning']
      const enabled = configuredParams?.enabled

      return enabled && isValidPoolConfigSnap(ctx, snap)
    },
    probe: (ctx, snap) => {
      const configuredParams = ctx.configuredParams['custom.low_hashrate.warning']
      const threshold = configuredParams.minHashRateMhs
      return snap.stats.hashrate_mhs.avg < threshold
    }
  },
  'custom.low_hashrate.critical': {
    valid: (ctx, snap) => {
      const configuredParams = ctx.configuredParams['custom.low_hashrate.critical']
      const enabled = configuredParams?.enabled

      return enabled && isValidPoolConfigSnap(ctx, snap)
    },
    probe: (ctx, snap) => {
      const configuredParams = ctx.configuredParams['custom.low_hashrate.critical']
      const threshold = configuredParams.minHashRateMhs
      return snap.stats.hashrate_mhs.avg < threshold
    }
  },
  'custom.wrong_miner_pool.warning': {
    valid: (ctx, snap) => {
      const configuredParams = ctx.configuredParams['custom.wrong_miner_pool.warning']
      const enabled = configuredParams?.enabled

      return enabled && isValidPoolConfigSnap(ctx, snap)
    },
    probe: wrongMinerPoolProbe
  },
  'custom.wrong_miner_pool.critical': {
    valid: (ctx, snap) => {
      const configuredParams = ctx.configuredParams['custom.wrong_miner_pool.critical']
      const enabled = configuredParams?.enabled

      return enabled && isValidPoolConfigSnap(ctx, snap)
    },
    probe: wrongMinerPoolProbe
  },
  'custom.wrong_miner_subaccount.warning': {
    valid: (ctx, snap) => {
      const configuredParams = ctx.configuredParams['custom.wrong_miner_subaccount.warning']
      const enabled = configuredParams?.enabled

      return enabled && isValidPoolConfigSnap(ctx, snap)
    },
    probe: wrongMinerSubaccountProbe
  },
  'custom.wrong_miner_subaccount.critical': {
    valid: (ctx, snap) => {
      const configuredParams = ctx.configuredParams['custom.wrong_miner_subaccount.critical']
      const enabled = configuredParams?.enabled

      return enabled && isValidPoolConfigSnap(ctx, snap)
    },
    probe: wrongMinerSubaccountProbe
  },
  'custom.wrong_worker_name.warning': {
    valid: (ctx, snap) => {
      const configuredParams = ctx.configuredParams['custom.wrong_worker_name.warning']
      const enabled = configuredParams?.enabled

      return enabled && isValidPoolConfigSnap(ctx, snap)
    },
    probe: wrongWorkerNameProbe
  },
  'custom.wrong_worker_name.critical': {
    valid: (ctx, snap) => {
      const configuredParams = ctx.configuredParams['custom.wrong_worker_name.critical']
      const enabled = configuredParams?.enabled

      return enabled && isValidPoolConfigSnap(ctx, snap)
    },
    probe: wrongWorkerNameProbe
  },
  'custom.ip_worker_name.warning': {
    valid: (ctx, snap) => {
      const configuredParams = ctx.configuredParams['custom.ip_worker_name.warning']
      const enabled = configuredParams?.enabled

      return enabled && isValidPoolConfigSnap(ctx, snap)
    },
    probe: ipWorkerNameProbe
  },
  'custom.ip_worker_name.critical': {
    valid: (ctx, snap) => {
      const configuredParams = ctx.configuredParams['custom.ip_worker_name.critical']
      const enabled = configuredParams?.enabled

      return enabled && isValidPoolConfigSnap(ctx, snap)
    },
    probe: ipWorkerNameProbe
  }
}

module.exports = libAlerts
