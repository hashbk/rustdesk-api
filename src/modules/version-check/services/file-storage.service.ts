import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { existsSync } from 'fs';

/**
 * 文件存储服务
 * 负责管理本地文件系统的文件存储
 */
@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);

  /**
   * 获取上传目录
   */
  private get uploadDir(): string {
    return process.env.UPLOAD_DIR || './uploads';
  }

  /**
   * 获取下载 URL 前缀
   */
  private get downloadUrlPrefix(): string {
    return process.env.DOWNLOAD_URL_PREFIX || '/downloads';
  }

  /**
   * 获取最大文件大小
   */
  private get maxFileSize(): number {
    return parseInt(process.env.MAX_FILE_SIZE || '524288000', 10); // 默认 500MB
  }

  /**
   * 获取允许的文件类型
   */
  private get allowedFileTypes(): Set<string> {
    const types = process.env.ALLOWED_FILE_TYPES || 'exe,dmg,deb,rpm,apk,ipa,zip,tar,gz,msi';
    return new Set(types.split(',').map(t => t.toLowerCase().trim()));
  }

  /**
   * 初始化文件存储目录
   */
  async initialize(): Promise<void> {
    const directories = [
      this.uploadDir,
      join(this.uploadDir, 'releases'),
      join(this.uploadDir, 'temp'),
      join(this.uploadDir, 'archives'),
    ];

    for (const dir of directories) {
      try {
        if (!existsSync(dir)) {
          await fs.mkdir(dir, { recursive: true });
          this.logger.log(`目录已创建: ${dir}`);
        }
      } catch (error) {
        this.logger.error(`创建目录失败: ${dir}, error=${error.message}`, error.stack);
        throw error;
      }
    }

    this.logger.log('文件存储目录初始化完成');
  }

  /**
   * 生成文件存储路径
   *
   * @param version 版本号
   * @param os 操作系统
   * @param arch 架构
   * @param filename 文件名
   * @returns 完整的文件路径
   */
  generateFilePath(
    version: string,
    os: string,
    arch: string,
    filename: string
  ): string {
    const versionDir = version.startsWith('v') ? version : `v${version}`;

    // 移动平台不需要架构目录
    const pathSegments = ['releases', versionDir, os.toLowerCase()];
    if (!['android', 'ios'].includes(os.toLowerCase())) {
      pathSegments.push(arch.toLowerCase());
    }
    pathSegments.push(filename);

    return join(this.uploadDir, ...pathSegments);
  }

  /**
   * 生成下载 URL
   *
   * @param version 版本号
   * @param os 操作系统
   * @param arch 架构
   * @param filename 文件名
   * @returns 下载 URL
   */
  generateDownloadUrl(
    version: string,
    os: string,
    arch: string,
    filename: string
  ): string {
    const versionDir = version.startsWith('v') ? version : `v${version}`;

    const pathSegments = ['releases', versionDir, os.toLowerCase()];
    if (!['android', 'ios'].includes(os.toLowerCase())) {
      pathSegments.push(arch.toLowerCase());
    }
    pathSegments.push(filename);

    return `${this.downloadUrlPrefix}/${pathSegments.join('/')}`;
  }

  /**
   * 保存文件
   *
   * @param version 版本号
   * @param os 操作系统
   * @param arch 架构
   * @param filename 文件名
   * @param buffer 文件内容
   * @param contentType 文件类型
   * @returns 下载 URL
   */
  async saveFile(
    version: string,
    os: string,
    arch: string,
    filename: string,
    buffer: Buffer,
    contentType: string
  ): Promise<string> {
    this.logger.debug(
      `开始保存文件: version=${version}, os=${os}, arch=${arch}, filename=${filename}, size=${buffer.length} bytes`
    );

    // 验证文件大小
    if (buffer.length > this.maxFileSize) {
      throw new BadRequestException(
        `文件大小超过限制: ${buffer.length} bytes (最大: ${this.maxFileSize} bytes)`
      );
    }

    // 验证文件类型
    const fileExtension = filename.split('.').pop()?.toLowerCase() || '';
    if (!this.allowedFileTypes.has(fileExtension)) {
      throw new BadRequestException(
        `不支持的文件类型: ${fileExtension} (支持: ${Array.from(this.allowedFileTypes).join(', ')})`
      );
    }

    // 生成文件路径
    const filePath = this.generateFilePath(version, os, arch, filename);

    try {
      // 确保目录存在
      const dir = dirname(filePath);
      if (!existsSync(dir)) {
        await fs.mkdir(dir, { recursive: true });
        this.logger.debug(`目录已创建: ${dir}`);
      }

      // 保存文件
      await fs.writeFile(filePath, buffer);
      this.logger.log(`文件已保存: ${filePath} (${buffer.length} bytes)`);

      // 生成下载 URL
      const downloadUrl = this.generateDownloadUrl(version, os, arch, filename);
      this.logger.debug(`下载 URL: ${downloadUrl}`);

      return downloadUrl;
    } catch (error) {
      this.logger.error(`保存文件失败: ${filePath}, error=${error.message}`, error.stack);
      throw new BadRequestException(`保存文件失败: ${error.message}`);
    }
  }

  /**
   * 删除文件
   *
   * @param version 版本号
   * @param os 操作系统
   * @param arch 架构
   * @param filename 文件名
   */
  async deleteFile(
    version: string,
    os: string,
    arch: string,
    filename: string
  ): Promise<void> {
    const filePath = this.generateFilePath(version, os, arch, filename);

    try {
      if (existsSync(filePath)) {
        await fs.unlink(filePath);
        this.logger.log(`文件已删除: ${filePath}`);
      } else {
        this.logger.warn(`文件不存在: ${filePath}`);
      }
    } catch (error) {
      this.logger.error(`删除文件失败: ${filePath}, error=${error.message}`, error.stack);
      throw new BadRequestException(`删除文件失败: ${error.message}`);
    }
  }

  /**
   * 检查文件是否存在
   *
   * @param version 版本号
   * @param os 操作系统
   * @param arch 架构
   * @param filename 文件名
   * @returns 文件是否存在
   */
  async fileExists(
    version: string,
    os: string,
    arch: string,
    filename: string
  ): Promise<boolean> {
    const filePath = this.generateFilePath(version, os, arch, filename);
    return existsSync(filePath);
  }

  /**
   * 获取文件大小
   *
   * @param version 版本号
   * @param os 操作系统
   * @param arch 架构
   * @param filename 文件名
   * @returns 文件大小（字节）
   */
  async getFileSize(
    version: string,
    os: string,
    arch: string,
    filename: string
  ): Promise<number> {
    const filePath = this.generateFilePath(version, os, arch, filename);

    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch (error) {
      this.logger.error(`获取文件大小失败: ${filePath}, error=${error.message}`, error.stack);
      return 0;
    }
  }

  /**
   * 清理临时文件
   * 删除超过指定时间的临时文件
   *
   * @param maxAge 最大保留时间（秒）
   */
  async cleanTempFiles(maxAge: number = 86400): Promise<void> {
    const tempDir = join(this.uploadDir, 'temp');
    const now = Date.now();
    const maxAgeMs = maxAge * 1000;

    try {
      if (!existsSync(tempDir)) {
        return;
      }

      const files = await fs.readdir(tempDir);
      let deletedCount = 0;

      for (const file of files) {
        const filePath = join(tempDir, file);
        const stats = await fs.stat(filePath);

        if (now - stats.mtimeMs > maxAgeMs) {
          await fs.unlink(filePath);
          deletedCount++;
          this.logger.debug(`临时文件已删除: ${filePath}`);
        }
      }

      if (deletedCount > 0) {
        this.logger.log(`临时文件清理完成: 删除了 ${deletedCount} 个文件`);
      }
    } catch (error) {
      this.logger.error(`清理临时文件失败: ${error.message}`, error.stack);
    }
  }

  /**
   * 清理旧版本
   * 保留指定数量的最新版本，删除旧版本的文件
   *
   * @param keepCount 保留版本数量
   */
  async cleanOldVersions(keepCount: number = 10): Promise<void> {
    const releasesDir = join(this.uploadDir, 'releases');

    try {
      if (!existsSync(releasesDir)) {
        return;
      }

      const versions = await fs.readdir(releasesDir);

      // 按版本号排序（假设版本号格式为 v1.0.0）
      versions.sort((a, b) => b.localeCompare(a));

      // 删除超过保留数量的旧版本
      const versionsToDelete = versions.slice(keepCount);

      for (const version of versionsToDelete) {
        const versionDir = join(releasesDir, version);

        try {
          await fs.rm(versionDir, { recursive: true, force: true });
          this.logger.log(`旧版本已删除: ${version}`);
        } catch (error) {
          this.logger.error(`删除旧版本失败: ${version}, error=${error.message}`, error.stack);
        }
      }

      if (versionsToDelete.length > 0) {
        this.logger.log(`旧版本清理完成: 删除了 ${versionsToDelete.length} 个版本`);
      }
    } catch (error) {
      this.logger.error(`清理旧版本失败: ${error.message}`, error.stack);
    }
  }

  /**
   * 获取存储空间信息
   *
   * @returns 存储空间信息
   */
  async getStorageInfo(): Promise<{
    totalSize: number;
    totalFiles: number;
    versions: string[];
  }> {
    const releasesDir = join(this.uploadDir, 'releases');
    let totalSize = 0;
    let totalFiles = 0;
    const versions: string[] = [];

    try {
      if (!existsSync(releasesDir)) {
        return { totalSize: 0, totalFiles: 0, versions: [] };
      }

      const versionDirs = await fs.readdir(releasesDir);

      for (const version of versionDirs) {
        versions.push(version);
        const versionDir = join(releasesDir, version);

        const walkDir = async (dir: string) => {
          const files = await fs.readdir(dir);

          for (const file of files) {
            const filePath = join(dir, file);
            const stats = await fs.stat(filePath);

            if (stats.isDirectory()) {
              await walkDir(filePath);
            } else {
              totalSize += stats.size;
              totalFiles++;
            }
          }
        };

        await walkDir(versionDir);
      }

      versions.sort((a, b) => b.localeCompare(a));

      this.logger.debug(`存储空间信息: totalSize=${totalSize}, totalFiles=${totalFiles}, versions=${versions.length}`);

      return { totalSize, totalFiles, versions };
    } catch (error) {
      this.logger.error(`获取存储空间信息失败: ${error.message}`, error.stack);
      return { totalSize: 0, totalFiles: 0, versions: [] };
    }
  }
}
