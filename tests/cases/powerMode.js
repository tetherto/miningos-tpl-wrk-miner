'use strict'

const path = require('path')
const { getSchema } = require(path.join(process.cwd(), 'tests/utils'))
const { getSnapExecutor, setPowerModeExecutor } = require('../executors')
const defaults = getSchema()

module.exports = () => ({
  setPowerModeSleep: {
    stages: [
      {
        name: 'setPowerMode sleep',
        ask: true,
        executor: setPowerModeExecutor('sleep'),
        validate: defaults.success_validate
      },
      {
        name: 'check config if suspended',
        executor: getSnapExecutor,
        validate: defaults.power_mode_sleep_validate
      }
    ]
  },
  setPowerModeNormal: {
    stages: [
      {
        name: 'setPowerMode normal',
        ask: true,
        executor: setPowerModeExecutor('normal'),
        validate: defaults.success_validate
      },
      {
        name: 'check config if not suspended and power mode normal',
        executor: getSnapExecutor,
        validate: defaults.power_mode_normal_validate
      }
    ]
  },
  setPowerModeLow: {
    stages: [
      {
        name: 'setPowerMode low',
        ask: true,
        executor: setPowerModeExecutor('low'),
        validate: defaults.success_validate
      },
      {
        name: 'check config if not suspended and power mode low',
        executor: getSnapExecutor,
        validate: defaults.power_mode_low_validate
      }
    ]
  },
  setPowerModeHigh: {
    stages: [
      {
        name: 'setPowerMode high',
        ask: true,
        executor: setPowerModeExecutor('high'),
        validate: defaults.success_validate
      },
      {
        name: 'check config if not suspended and power mode high',
        executor: getSnapExecutor,
        validate: defaults.power_mode_high_validate
      }
    ]
  }
}
)
