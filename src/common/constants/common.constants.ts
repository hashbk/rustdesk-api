/**
 * 公共常量定义
 */

/**
 * 时间相关常量
 */
export const TIME_CONSTANTS = {
  /** 一分钟的毫秒数 */
  ONE_MINUTE_MS: 60 * 1000,
  /** 一小时的毫秒数 */
  ONE_HOUR_MS: 60 * 60 * 1000,
  /** 一天的毫秒数 */
  ONE_DAY_MS: 24 * 60 * 60 * 1000,
} as const;

/**
 * 分页相关常量
 */
export const PAGINATION_CONSTANTS = {
  /** 默认页码 */
  DEFAULT_PAGE: 1,
  /** 默认每页数量 */
  DEFAULT_LIMIT: 20,
  /** 最大每页数量 */
  MAX_LIMIT: 100,
} as const;

/**
 * 安全相关常量
 */
export const SECURITY_CONSTANTS = {
  /** bcrypt 加密轮数 */
  BCRYPT_ROUNDS: 10,
  /** Token 默认过期天数 */
  TOKEN_EXPIRY_DAYS: 7,
  /** 管理员 Token 过期天数 */
  ADMIN_TOKEN_EXPIRY_DAYS: 30,
} as const;

/**
 * 用户状态常量
 */
export const USER_STATUS = {
  /** 禁用 */
  DISABLED: 0,
  /** 正常 */
  ACTIVE: 1,
  /** 未验证 */
  UNVERIFIED: -1,
} as const;

/**
 * 在线状态阈值（设备超过此时间未更新视为离线）
 */
export const ONLINE_THRESHOLD_MS = TIME_CONSTANTS.ONE_MINUTE_MS;
