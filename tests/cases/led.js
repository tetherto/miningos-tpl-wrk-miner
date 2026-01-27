'use strict'

const path = require('path')
const { getSchema } = require(path.join(process.cwd(), 'tests/utils'))
const { getSnapExecutor, setLEDExecutor } = require('../executors')
const defaults = getSchema()

module.exports = () => ({
  setLED: {
    stages: [
      {
        name: 'setLED on',
        executor: setLEDExecutor(true),
        validate: defaults.success_validate
      },
      {
        name: 'check LED on',
        executor: getSnapExecutor,
        validate: defaults.led_on_validate
      },
      {
        name: 'setLED off',
        executor: setLEDExecutor(false),
        validate: defaults.success_validate
      },
      {
        name: 'check LED off',
        executor: getSnapExecutor,
        validate: defaults.led_off_validate
      }
    ]
  }
})
