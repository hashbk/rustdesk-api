import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Version } from './entities/version.entity';
import { VersionCheckRequestDto, VersionCheckResponseDto, ReleaseSyncRequestDto, ReleaseSyncResponseDto } from './dto';

/**
 * 版本检查服务
 * 负责处理客户端的版本更新检查请求
 *
 * 功能：
 * - 根据客户端的平台、架构等信息查询最新版本
 * - 返回版本号、下载链接、构建时间戳
 * - 支持版本上下线管理
 * - 记录请求日志
 * - 接收 GitHub Action Release Sync 工具推送的版本信息
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

  /**
   * 同步 Release
   * 接收 GitHub Action Release Sync 工具推送的版本信息并保存到数据库
   *
   * @param request Release 同步请求
   * @returns Release 同步响应
   */
  async syncRelease(request: ReleaseSyncRequestDto): Promise<ReleaseSyncResponseDto> {
    const startTime = Date.now();

    this.logger.log(
      `收到 Release 同步请求: tag=${request.tag}, name=${request.name}, assets=${request.assets.length}`
    );

    try {
      // 从 tag 中提取版本号（假设 tag 格式为 v1.0.0）
      const version = request.tag.startsWith('v')
        ? request.tag.substring(1)
        : request.tag;

      // 解析每个资产文件
      const processedAssets: Array<{
        version: string;
        os: string;
        arch: string;
        typ: string;
        download_url: string;
        build_date: number;
        remarks: string;
      }> = [];

      for (const asset of request.assets) {
        try {
          // 从文件名解析平台、架构和类型信息
          const parsedInfo = this.parseAssetFilename(asset.name);

          // 保存文件到本地存储（可选）
          // const savedFilePath = await this.saveAssetFile(asset);

          const versionData = {
            version,
            os: parsedInfo.os,
            arch: parsedInfo.arch,
            typ: parsedInfo.typ,
            download_url: asset.name, // 这里可以根据实际需求设置下载链接
            build_date: Math.floor(Date.now() / 1000), // 使用当前时间作为构建时间
            remarks: request.body || '',
            enabled: true,
          };

          // 检查是否已存在相同版本的记录
          const existingVersion = await this.versionRepository.findOne({
            where: {
              version: versionData.version,
              os: versionData.os,
              arch: versionData.arch,
              typ: versionData.typ,
            },
          });

          if (existingVersion) {
            // 更新现有记录
            await this.versionRepository.update(existingVersion.id, versionData);
            this.logger.log(
              `版本记录已更新: version=${version}, os=${versionData.os}, arch=${versionData.arch}, typ=${versionData.typ}`
            );
          } else {
            // 创建新记录
            await this.versionRepository.save(versionData);
            this.logger.log(
              `新版本记录已创建: version=${version}, os=${versionData.os}, arch=${versionData.arch}, typ=${versionData.typ}`
            );
          }

          processedAssets.push(versionData);
        } catch (error) {
          this.logger.error(
            `处理资产文件失败: ${asset.name}, error=${error.message}`,
            error.stack
          );
          throw new BadRequestException(`Failed to process asset ${asset.name}: ${error.message}`);
        }
      }

      const responseTime = Date.now() - startTime;
      this.logger.log(
        `Release 同步成功: tag=${request.tag}, processed=${processedAssets.length}, response_time=${responseTime}ms`
      );

      return {
        success: true,
        release_id: version,
        release_url: `/api/version/check`,
        message: `Release synchronized successfully with ${processedAssets.length} version(s)`,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.error(
        `Release 同步失败: tag=${request.tag}, error=${error.message}, response_time=${responseTime}ms`,
        error.stack
      );

      return {
        success: false,
        error: error.message,
        message: `Failed to synchronize release: ${error.message}`,
      };
    }
  }

  /**
   * 从资产文件名解析平台、架构和类型信息
   *
   * 支持的文件名格式示例:
   * - rustdesk-1.2.3-x86_64.exe
   * - rustdesk-1.2.3-x86_64.dmg
   * - rustdesk-1.2.3-x86_64.deb
   * - rustdesk-android-1.2.3.apk
   *
   * @param filename 文件名
   * @returns 解析的平台、架构和类型信息
   */
  private parseAssetFilename(filename: string): { os: string; arch: string; typ: string } {
    const lowerFilename = filename.toLowerCase();

    // 默认值
    let os = 'unknown';
    let arch = 'unknown';
    let typ = 'rustdesk';

    // 解析操作系统
    if (lowerFilename.includes('windows') || lowerFilename.endsWith('.exe') || lowerFilename.endsWith('.msi')) {
      os = 'windows';
    } else if (lowerFilename.includes('macos') || lowerFilename.includes('darwin') || lowerFilename.endsWith('.dmg') || lowerFilename.endsWith('.pkg')) {
      os = 'macos';
    } else if (lowerFilename.includes('linux')) {
      if (lowerFilename.endsWith('.deb')) {
        os = 'linux';
      } else if (lowerFilename.endsWith('.rpm')) {
        os = 'linux';
      } else if (lowerFilename.endsWith('.AppImage')) {
        os = 'linux';
      } else {
        os = 'linux';
      }
    } else if (lowerFilename.includes('android') || lowerFilename.endsWith('.apk')) {
      os = 'android';
    } else if (lowerFilename.includes('ios') || lowerFilename.endsWith('.ipa')) {
      os = 'ios';
    }

    // 解析架构
    if (lowerFilename.includes('x86_64') || lowerFilename.includes('amd64') || lowerFilename.includes('64')) {
      arch = 'x86_64';
    } else if (lowerFilename.includes('x86') || lowerFilename.includes('i386') || lowerFilename.includes('32')) {
      arch = 'x86';
    } else if (lowerFilename.includes('arm64') || lowerFilename.includes('aarch64')) {
      arch = 'arm64';
    } else if (lowerFilename.includes('armv7') || lowerFilename.includes('armhf')) {
      arch = 'armv7';
    }

    // 解析类型
    if (lowerFilename.includes('android')) {
      typ = 'android';
    } else if (lowerFilename.includes('ios')) {
      typ = 'ios';
    }

    return { os, arch, typ };
  }

  /**
   * 保存资产文件到本地存储（可选实现）
   *
   * @param asset 资产文件信息
   * @returns 保存的文件路径
   */
  private async saveAssetFile(asset: any): Promise<string> {
    // 这里可以实现文件保存逻辑
    // 例如保存到本地文件系统或上传到对象存储服务（如 AWS S3、MinIO 等）
    // 目前仅记录日志
    this.logger.debug(`保存资产文件: ${asset.name}, size=${asset.size} bytes`);
    return asset.name;
  }
}
