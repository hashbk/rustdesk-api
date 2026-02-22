/**
 * 分页辅助工具
 * 统一处理分页参数解析和计算
 */

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginationQuery {
  current?: number;
  pageSize?: number;
  page?: string;
  limit?: string;
}

/**
 * 分页辅助类
 */
export class PaginationHelper {
  /**
   * 默认页码
   */
  static readonly DEFAULT_PAGE = 1;

  /**
   * 默认每页数量
   */
  static readonly DEFAULT_LIMIT = 20;

  /**
   * 从查询参数解析分页参数
   * 支持两种格式：
   * - { current, pageSize } - 客户端格式
   * - { page, limit } - 管理端格式
   */
  static fromQuery(query: PaginationQuery): PaginationParams {
    let page: number;
    let limit: number;

    // 支持两种参数格式
    if (query.current !== undefined) {
      page = Number(query.current) || this.DEFAULT_PAGE;
      limit = Number(query.pageSize) || this.DEFAULT_LIMIT;
    } else {
      page = parseInt(query.page || '1', 10) || this.DEFAULT_PAGE;
      limit = parseInt(query.limit || '20', 10) || this.DEFAULT_LIMIT;
    }

    // 确保参数有效
    page = Math.max(1, page);
    limit = Math.max(1, Math.min(100, limit)); // 限制最大100条

    return {
      page,
      limit,
      skip: (page - 1) * limit,
    };
  }

  /**
   * 计算分页偏移量
   */
  static calculateSkip(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  /**
   * 构建分页响应
   */
  static buildResponse<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
  ): {
    data: T[];
    total: number;
    page: number;
    limit: number;
  } {
    return {
      data,
      total,
      page,
      limit,
    };
  }
}
