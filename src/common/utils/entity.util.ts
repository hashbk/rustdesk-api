import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Repository, ObjectLiteral, DeepPartial } from 'typeorm';

/**
 * 实体操作辅助工具
 * 提供通用的实体查找和验证方法
 */
export class EntityHelper {
  /**
   * 查找实体或抛出 NotFoundException
   * @param repository 实体仓库
   * @param criteria 查询条件
   * @param entityName 实体名称（用于错误消息）
   * @returns 找到的实体
   */
  static async findOneOrThrow<T extends ObjectLiteral>(
    repository: Repository<T>,
    criteria: any,
    entityName: string = '记录',
  ): Promise<T> {
    const entity = await repository.findOne({ where: criteria });
    if (!entity) {
      throw new NotFoundException(`${entityName}不存在`);
    }
    return entity;
  }

  /**
   * 检查实体是否存在
   * @param repository 实体仓库
   * @param criteria 查询条件
   * @returns 是否存在
   */
  static async exists<T extends ObjectLiteral>(
    repository: Repository<T>,
    criteria: any,
  ): Promise<boolean> {
    const count = await repository.count({ where: criteria });
    return count > 0;
  }

  /**
   * 检查唯一性，如果存在则抛出 BadRequestException
   * @param repository 实体仓库
   * @param criteria 查询条件
   * @param errorMessage 错误消息
   */
  static async checkUniqueness<T extends ObjectLiteral>(
    repository: Repository<T>,
    criteria: any,
    errorMessage: string = '记录已存在',
  ): Promise<void> {
    const exists = await this.exists(repository, criteria);
    if (exists) {
      throw new BadRequestException(errorMessage);
    }
  }

  /**
   * 查找实体，如果不存在则创建
   * @param repository 实体仓库
   * @param criteria 查询条件
   * @param createData 创建数据
   * @returns 找到或创建的实体
   */
  static async findOrCreate<T extends ObjectLiteral>(
    repository: Repository<T>,
    criteria: any,
    createData: DeepPartial<T>,
  ): Promise<T> {
    const existing = await repository.findOne({ where: criteria });
    if (existing) {
      return existing;
    }
    const newEntity = repository.create(createData);
    return repository.save(newEntity) as Promise<T>;
  }
}
