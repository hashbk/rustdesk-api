import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { AddressBookRule, AddressBook } from '../entities';
import { AddressBookService } from './address-book.service';
import { RuleQueryDto, CreateRuleDto, UpdateRuleDto } from '../dto';

/**
 * 地址簿规则服务
 * 管理地址簿的访问规则，包括增删改查操作
 *
 * 功能：
 * - 获取规则列表（分页）
 * - 创建新规则
 * - 更新规则权限
 * - 批量删除规则
 *
 * 权限级别：
 * - 1 (READ): 只读权限
 * - 2 (READ_WRITE): 读写权限
 * - 3 (FULL_CONTROL): 完全控制
 */
@Injectable()
export class AddressBookRuleService {
  constructor(
    @InjectRepository(AddressBookRule)
    private ruleRepository: Repository<AddressBookRule>,

    @InjectRepository(AddressBook)
    private addressBookRepository: Repository<AddressBook>,

    private readonly addressBookService: AddressBookService,
  ) {}

  /**
   * 获取地址簿规则列表
   * 分页查询指定地址簿的所有规则
   *
   * @param query 查询参数（包含地址簿 GUID 和分页信息）
   * @param userId 当前用户 ID
   * @returns 规则列表（分页）
   * @throws ForbiddenException 用户无权限访问该地址簿
   */
  async getRules(query: RuleQueryDto, userId: string) {
    // 检查用户是否有权限访问该地址簿
    await this.checkAddressBookPermissions(query.ab, userId);

    const { ab, current = 1, pageSize = 30 } = query;

    // 查询总数
    const total = await this.ruleRepository.count({
      where: { ab },
    });

    // 查询规则列表
    const rules = await this.ruleRepository.find({
      where: { ab },
      relations: ['addressBook'],
      skip: (current - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'ASC' },
    });

    return {
      data: rules.map((rule) => this.toResponseFormat(rule)),
      total,
    };
  }

  /**
   * 创建新规则
   * 为指定地址簿添加新的访问规则
   *
   * @param dto 创建规则数据
   * @param userId 当前用户 ID
   * @returns 新创建的规则 GUID
   * @throws NotFoundException 地址簿不存在
   * @throws ForbiddenException 用户无权限修改该地址簿
   * @throws ConflictException 规则已存在
   */
  async createRule(dto: CreateRuleDto, userId: string) {
    // 检查地址簿是否存在且用户有权限修改
    await this.checkAddressBookPermissions(dto.guid, userId);

    // 确定规则类型和目标
    const { user, group, rule = 1 } = dto;

    // 验证用户和组互斥
    if (user && group) {
      throw new ConflictException('用户和组不能同时指定');
    }

    // 如果没有指定用户或组，默认为 everyone
    const targetUser = user || '';
    const targetGroup = group || '';

    // 检查是否已存在相同规则
    const whereClause: any = {
      ab: dto.guid,
    };
    
    // 只添加非空值到 where 子句
    if (targetUser) {
      whereClause.user = targetUser;
    }
    if (targetGroup) {
      whereClause.group = targetGroup;
    }
    
    const existingRule = await this.ruleRepository.findOne({
      where: whereClause,
    });

    if (existingRule) {
      throw new ConflictException('该规则已存在');
    }

    // 创建新规则
    const newRule: Partial<AddressBookRule> = {
      guid: uuidv4(),
      ab: dto.guid,
      user: targetUser,
      group: targetGroup,
      rule,
    };

    await this.ruleRepository.save(newRule);

    return { guid: newRule.guid };
  }

  /**
   * 更新规则
   * 修改指定规则的权限级别
   *
   * @param dto 更新规则数据
   * @param userId 当前用户 ID
   * @returns 更新成功消息
   * @throws NotFoundException 规则不存在
   * @throws ForbiddenException 用户无权限修改该规则
   */
  async updateRule(dto: UpdateRuleDto, userId: string) {
    // 查找规则
    const rule = await this.ruleRepository.findOne({
      where: { guid: dto.guid },
      relations: ['addressBook'],
    });

    if (!rule) {
      throw new NotFoundException('规则不存在');
    }

    // 检查用户是否有权限修改该规则
    await this.checkAddressBookPermissions(rule.ab, userId);

    // 更新规则权限
    rule.rule = dto.rule;
    await this.ruleRepository.save(rule);

    return { message: '更新成功' };
  }

  /**
   * 批量删除规则
   * 删除一个或多个规则
   *
   * @param ruleGuids 要删除的规则 GUID 数组
   * @param userId 当前用户 ID
   * @returns 删除成功消息
   * @throws BadRequestException 参数无效
   * @throws ForbiddenException 用户无权限修改地址簿
   */
  async deleteRules(ruleGuids: string[], userId: string) {
    if (!ruleGuids || ruleGuids.length === 0) {
      throw new BadRequestException('至少需要一个规则 GUID');
    }

    // 获取所有规则的信息（用于权限检查和获取 ab 字段）
    const rules = await this.ruleRepository.find({
      where: ruleGuids.map((g) => ({ guid: g })),
      relations: ['addressBook'],
    });

    if (rules.length === 0) {
      throw new NotFoundException('未找到任何规则');
    }

    // 检查第一个规则的地址簿权限（假设所有规则都属于同一地址簿）
    const firstRule = rules[0];
    await this.checkAddressBookPermissions(firstRule.ab, userId);

    // 由于 AddressBookRule 有多个主键，需要使用完整的主键对象删除
    for (const rule of rules) {
      await this.ruleRepository.delete({
        guid: rule.guid,
        ab: rule.ab,
      });
    }

    return { message: '删除成功' };
  }

  /**
   * 检查用户对地址簿的权限
   * 调用 AddressBookService 的私有方法（因为它们在同一个模块）
   *
   * @param addressBookGuid 地址簿 GUID
   * @param userId 用户 ID
   * @throws ForbiddenException 无权限访问
   */
  private async checkAddressBookPermissions(
    addressBookGuid: string,
    userId: string,
  ): Promise<void> {
    // 调用 AddressBookService 的私有方法
    // 注意：由于它们是同一个模块，可以直接访问私有方法
    try {
      await (this.addressBookService as any).checkAddressBookAccess(
        addressBookGuid,
        userId,
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * 将规则转换为响应格式
   * @param rule 规则实体
   * @returns 响应格式的对象
   */
  private toResponseFormat(rule: AddressBookRule): any {
    return {
      guid: rule.guid,
      addressBook: {
        guid: rule.ab,
        name: rule.addressBook?.name,
      },
      user: rule.user,
      group: rule.group,
      rule: rule.rule,
      ruleType: rule.ruleType,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    };
  }
}
