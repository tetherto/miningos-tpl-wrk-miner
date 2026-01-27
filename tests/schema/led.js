'use strict'

module.exports = () => ({
  led_on_validate: {
    type: 'schema',
    schema: {
      success: { type: 'boolean', enum: [true] },
      config: {
        type: 'object',
        children: {
          led_status: { type: 'boolean', enum: [true] }
        }
      }
    }
  },
  led_off_validate: {
    type: 'schema',
    schema: {
      success: { type: 'boolean', enum: [true] },
      config: {
        type: 'object',
        children: {
          led_status: { type: 'boolean', enum: [false] }
        }
      }
    }
  }
})
