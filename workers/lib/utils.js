'use strict'

const libUtils = require('miningos-tpl-wrk-thing/workers/lib/utils')
const crypto = require('crypto')
const { getVal } = require('miningos-lib-stats/utils')

function getRackFromPos (pos) {
  if (!pos) return null
  const parts = pos.split('_')
  return parts[0] || null
}

function groupByContainerRack (entry) {
  const container = getVal(entry, 'info.container')
  const pos = getVal(entry, 'info.pos')
  const rack = getRackFromPos(pos)
  if (!container || !rack) return null
  return `${container}_${rack}`
}

function getRandomString (length) {
  return crypto.randomBytes(length)
    .toString('base64')
    .replace(/[^a-z0-9]/gi, '')
    .slice(0, length)
}

function hasErrorAndPositiveHashrate (entry) {
  const { errors, hashrate_mhs: hashrateMHS } = entry?.last?.snap?.stats || {}
  const hashrate = hashrateMHS?.t_5m

  return errors?.length && hashrate > 0
}

function sumPoolsShares (pools, key) {
  if (!Array.isArray(pools)) return 0

  return pools?.reduce((acc, pool) => {
    const value = parseInt(pool[key])
    return acc + (isNaN(value) ? 0 : value)
  }, 0)
}
module.exports = {
  ...libUtils,
  getRandomString,
  hasErrorAndPositiveHashrate,
  sumPoolsShares,
  groupByContainerRack,
  getRackFromPos
}
