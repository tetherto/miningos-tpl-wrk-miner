'use strict'

module.exports = () => {
  const v = {
    stats_validate: {
      type: 'schema',
      schema: {
        success: { type: 'boolean', enum: [true] },
        stats: {
          type: 'object',
          children: {
            status: { type: 'string', enum: ['mining', 'sleeping', 'error', 'offline'] },
            error_msg: { type: 'string', optional: true },
            power_w: { type: 'number', min: 0 },
            pool_status: {
              type: 'array',
              children: {
                pool: { type: 'string' },
                accepted: { type: 'number', min: 0 },
                rejected: { type: 'number', min: 0 }
              }
            },
            uptime_ms: { type: 'number', min: 0 },
            hashrate_mhs: {
              type: 'object',
              children: {
                avg: { type: 'number', min: 0 },
                t_5s: { type: 'number', min: 0 },
                t_30s: { type: 'number', min: 0 },
                t_1m: { type: 'number', min: 0 },
                t_5m: { type: 'number', min: 0 },
                t_15m: { type: 'number', min: 0 },
                t_30m: { type: 'number', min: 0 }
              }
            },
            frequency_mhz: {
              type: 'object',
              children: {
                avg: { type: 'number', min: 0 },
                target: { type: 'number', min: 0 },
                chips: {
                  type: 'array',
                  children: {
                    index: { type: 'number', min: 0 },
                    current: { type: 'number', min: 0 },
                    target: { type: 'number', min: 0 }
                  }
                }
              }
            },
            temperature_c: {
              type: 'object',
              children: {
                ambient: { type: 'number', min: 0 },
                max: { type: 'number', min: 0 },
                avg: { type: 'number', min: 0 },
                chips: {
                  type: 'array',
                  children: {
                    index: { type: 'number', min: 0 },
                    max: { type: 'number', min: 0 },
                    min: { type: 'number', min: 0 },
                    avg: { type: 'number', min: 0 }
                  }
                }
              }
            },
            miner_specific: { type: 'object', optional: true }
          }
        }
      }
    },
    info_validate: {
      type: 'schema',
      schema: {
        success: { type: 'boolean', enum: [true] },
        info: {
          type: 'object',
          children: {
            model: { type: 'string' },
            serial_num: { type: 'string' },
            ip_address: { type: 'string', regex: /^(?:(?:^|\.)(?:2(?:5[0-5]|[0-4]\d)|1?\d?\d)){4}$/ },
            mac_address: { type: 'string', regex: /^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/ },
            firmware_ver: { type: 'string' }
          }
        }
      }
    },
    config_validate: {
      type: 'schema',
      schema: {
        success: { type: 'boolean', enum: [true] },
        config: {
          type: 'object',
          children: {
            network_config: {
              type: 'object',
              children: {
                ip_address: { type: 'string', regex: /^(?:(?:^|\.)(?:2(?:5[0-5]|[0-4]\d)|1?\d?\d)){4}$/ },
                dns: {
                  type: 'array',
                  primitive: { type: 'string' }
                },
                ip_gw: { type: 'string', regex: /^(?:(?:^|\.)(?:2(?:5[0-5]|[0-4]\d)|1?\d?\d)){4}$/ },
                ip_netmask: { type: 'string', regex: /^(?:(?:^|\.)(?:2(?:5[0-5]|[0-4]\d)|1?\d?\d)){4}$/ }
              }
            },
            pool_config: {
              type: 'array',
              children: {
                url: { type: 'string' },
                username: { type: 'string' }
              }
            },
            power_mode: { type: 'string', enum: ['low', 'normal', 'high'] },
            suspended: { type: 'boolean' },
            led_status: { type: 'boolean' },
            firmware_ver: { type: 'string' }
          }
        }
      }
    }
  }

  return {
    ...v,
    snap_validate: {
      type: 'schema',
      schema: {
        success: { type: 'boolean', enum: [true] },
        config: {
          type: 'object',
          children: v.config_validate.schema.config.children
        },
        stats: {
          type: 'object',
          children: v.stats_validate.schema.stats.children
        }
      }
    }
  }
}
