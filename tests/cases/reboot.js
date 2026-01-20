'use strict'

const path = require('path')
const { getSchema } = require(path.join(process.cwd(), 'tests/utils'))
const { rebootExecutor } = require('../executors')
const defaults = getSchema()

module.exports = () => ({
  reboot: {
    stages: [
      {
        name: 'reboot',
        executor: rebootExecutor,
        validate: defaults.success_validate
      }
    ]
  }
})
