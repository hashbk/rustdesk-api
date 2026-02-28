import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Version } from './entities/version.entity';
import { VersionCheckRequestDto, VersionCheckResponseDto } from './dto';

/**
 * 版本检查服务
 * 负责处理客户端的版本更新检查请求
 *
 * 功能：
 * - 根据客户端的平台、架构等信息查询最新版本
 * - 返回版本号、下载链接、构建时间戳
 * - 支持版本上下线管理
 * - 记录请求日志
 */
@Injectable()
export class VersionCheckService {
  private readonly logger = new Logger(VersionCheckService.name);

  constructor(
    @InjectRepository(Version)
    private versionRepository: Repository<Version>,
  ) {}

  /**
   * 检查最新版本
   * 根据客户端上报的平台、架构等信息返回匹配的最新版本
   *
   * @param request 客户端版本检查请求
   * @returns 版本检查响应
   */
  async checkLatestVersion(request: VersionCheckRequestDto): Promise<VersionCheckResponseDto> {
    const startTime = Date.now();

    this.logger.debug(
      `收到版本检查请求: id=${request.id}, os=${request.os}, arch=${request.arch}, typ=${request.typ}`
    );

    try {
      // 构建查询条件
      const whereCondition: any = {
        enabled: true,
      };

      // 添加平台条件（如果提供）
      if (request.os && request.os !== '') {
        whereCondition.os = request.os.toLowerCase();
      }

      // 添加架构条件（如果提供）
      if (request.arch && request.arch !== '') {
        whereCondition.arch = request.arch.toLowerCase();
      }

      // 添加客户端类型条件（如果提供）
      if (request.typ && request.typ !== '') {
        whereCondition.typ = request.typ;
      }

      // 查询匹配的最新版本
      const latestVersion = await this.versionRepository.findOne({
        where: whereCondition,
        order: {
          created_at: 'DESC',
        },
      });

      const response: VersionCheckResponseDto = {
        download_url: '',
        version: '',
        build_date: 0,
      };

      if (latestVersion) {
        response.download_url = latestVersion.download_url || '';
        response.version = latestVersion.version || '';
        response.build_date = latestVersion.build_date || 0;

        this.logger.debug(
          `找到匹配版本: version=${response.version}, download_url=${response.download_url}, build_date=${response.build_date}`
        );
      } else {
        this.logger.debug(`未找到匹配的版本信息，客户端将触发降级逻辑`);
      }

      // 记录请求日志
      const responseTime = Date.now() - startTime;
      this.logger.log(
        `版本检查完成: id=${request.id}, os=${request.os}, arch=${request.arch}, response_time=${responseTime}ms, version_found=${!!latestVersion}`
      );

      return response;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.error(
        `版本检查失败: id=${request.id}, error=${error.message}, response_time=${responseTime}ms`,
        error.stack
      );

      // 发生错误时返回空响应，让客户端触发降级逻辑
      return {
        download_url: '',
        version: '',
        build_date: 0,
      };
    }
  }

  /**
   * 添加版本信息
   * 用于管理员手动添加新版本
   *
   * @param versionData 版本数据
   * @returns 保存后的版本信息
   */
  async addVersion(versionData: Partial<Version>): Promise<Version> {
    const version = this.versionRepository.create(versionData);
    const saved = await this.versionRepository.save(version);
    this.logger.log(`新版本已添加: version=${saved.version}, os=${saved.os}, arch=${saved.arch}`);
    return saved;
  }

  /**
   * 获取所有版本信息
   *
   * @returns 版本列表
   */
  async getAllVersions(): Promise<Version[]> {
    return this.versionRepository.find({
      order: {
        created_at: 'DESC',
      },
    });
  }

  /**
   * 更新版本启用状态
   *
   * @param id 版本ID
   * @param enabled 是否启用
   */
  async updateVersionStatus(id: number, enabled: boolean): Promise<void> {
    await this.versionRepository.update(id, { enabled });
    this.logger.log(`版本状态已更新: id=${id}, enabled=${enabled}`);
  }
}
