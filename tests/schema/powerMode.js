'use strict'

module.exports = () => ({
  power_mode_low_validate: {
    type: 'schema',
    schema: {
      success: { type: 'boolean', enum: [true] },
      config: {
        type: 'object',
        children: {
          suspended: { type: 'boolean', enum: [false] },
          power_mode: { type: 'string', enum: ['low'] }
        }
      }
    }
  },
  power_mode_normal_validate: {
    type: 'schema',
    schema: {
      success: { type: 'boolean', enum: [true] },
      config: {
        type: 'object',
        children: {
          suspended: { type: 'boolean', enum: [false] },
          power_mode: { type: 'string', enum: ['normal'] }
        }
      }
    }
  },
  power_mode_sleep_validate: {
    type: 'schema',
    schema: {
      success: { type: 'boolean', enum: [true] },
      config: {
        type: 'object',
        children: {
          suspended: { type: 'boolean', enum: [true] },
          power_mode: { type: 'string', enum: ['sleep'] }
        }
      }
    }
  },
  power_mode_high_validate: {
    type: 'schema',
    schema: {
      success: { type: 'boolean', enum: [true] },
      config: {
        type: 'object',
        children: {
          suspended: { type: 'boolean', enum: [false] },
          power_mode: { type: 'string', enum: ['high'] }
        }
      }
    }
  }
}
)
