/**
 * 地址簿数据传输对象模块
 * 导出所有地址簿相关的DTO类
 */

/** 设备相关DTO - 添加、更新设备 */
export { AddPeerDto, UpdatePeerDto } from './peer.dto';

/** 标签相关DTO - 添加、更新、重命名标签 */
export { AddTagDto, UpdateTagDto, RenameTagDto } from './tag.dto';

/** 查询相关DTO - 分页查询、设备列表查询 */
export { PaginationDto, PeersQueryDto } from './query.dto';
