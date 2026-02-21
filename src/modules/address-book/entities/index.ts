/**
 * 地址簿实体模块
 * 导出所有地址簿相关的实体类和枚举
 */

/** 地址簿实体 - 管理所有地址簿信息 */
export { AddressBook } from './address-book.entity';

/** 地址簿节点实体 - 管理地址簿中的所有设备节点 */
export { AddressBookPeer } from './address-book-peer.entity';

/** 地址簿标签实体 - 管理地址簿中的所有标签 */
export { AddressBookTag } from './address-book-tag.entity';

/** 地址簿共享实体和共享权限枚举 - 管理地址簿的共享关系和权限 */
export { AddressBookShare, ShareRule } from './address-book-share.entity';

/** 地址簿节点标签关联实体 - 管理设备与标签的多对多关系 */
export { AddressBookPeerTag } from './address-book-peer-tag.entity';
