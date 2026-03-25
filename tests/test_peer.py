"""
设备管理测试
测试设备的添加、查看、更新、删除、查询功能
"""

import sys
import os

# 添加父目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tests.test_base import BaseTester
from ab import (
    send_heartbeat,
    view_ab_peers,
    add_peer,
    update_peer,
    delete_peer,
)


class PeerTester(BaseTester):
    """设备管理测试器"""

    def test_peer_management(self):
        """测试设备管理功能"""
        self.print_section("第三部分：设备管理测试")

        ab_guid = self.test_data['shared_ab_guid'] or self.test_data['personal_ab_guid']
        if not ab_guid:
            print("   [WARN] 跳过设备测试：没有可用的地址簿")
            return

        # 1. 查看设备列表
        self.run_test(
            "查看地址簿设备列表",
            view_ab_peers,
            self.url, self.token, ab_guid
        )

        # 2. 生成多个设备ID并发送心跳
        for i in range(3):
            peer_id = self._generate_random_peer_id()
            self.test_data['peer_ids'].append(peer_id)

            self.run_test(
                f"发送设备心跳 '{peer_id}'（注册设备）",
                send_heartbeat,
                self.url, peer_id, peer_id, 1, 0
            )

        # 3. 先创建几个临时标签用于测试
        from ab import add_tag
        temp_tags = ['temp_tag_1', 'temp_tag_2', 'temp_tag_3']
        self.test_data['temp_tags'] = temp_tags

        for tag_name in temp_tags:
            self.run_test(
                f"创建临时标签 '{tag_name}'",
                add_tag,
                self.url, self.token, ab_guid,
                tag_name,
                color=0xFFFF0000
            )

        # 4. 添加第一个设备（带别名、备注、标签、密码）
        peer_id = self.test_data['peer_ids'][0]
        self.run_test(
            f"添加设备 '{peer_id}'（带别名、备注、标签、密码）",
            add_peer,
            self.url, self.token, ab_guid,
            peer_id,
            alias='测试设备1',
            note='这是测试设备1的备注',
            tags=[temp_tags[0]],
            password='peer_password1'
        )

        # 5. 添加第二个设备（仅必需参数）
        peer_id = self.test_data['peer_ids'][1]
        self.run_test(
            f"添加设备 '{peer_id}'（仅必需参数）",
            add_peer,
            self.url, self.token, ab_guid,
            peer_id,
            note='这是测试设备2的备注'
        )

        # 6. 添加第三个设备（带多个标签）
        peer_id = self.test_data['peer_ids'][2]
        self.run_test(
            f"添加设备 '{peer_id}'（带多个标签）",
            add_peer,
            self.url, self.token, ab_guid,
            peer_id,
            alias='测试设备3',
            tags=temp_tags[1:3]  # 使用两个标签
        )

        # 7. 查看设备列表（验证添加）
        self.run_test(
            "查看设备列表（验证添加）",
            view_ab_peers,
            self.url, self.token, ab_guid
        )

        # 8. 按ID查询设备
        peer_id = self.test_data['peer_ids'][0]
        self.run_test(
            f"按ID查询设备 '{peer_id}'",
            view_ab_peers,
            self.url, self.token, ab_guid, peer_id=peer_id
        )

        # 9. 按别名查询设备
        self.run_test(
            "按别名查询设备 '测试设备1'",
            view_ab_peers,
            self.url, self.token, ab_guid,
            alias='测试设备1'
        )

        # 10. 更新第一个设备（仅更新别名）
        peer_id = self.test_data['peer_ids'][0]
        self.run_test(
            f"更新设备 '{peer_id}'（仅别名）",
            update_peer,
            self.url, self.token, ab_guid,
            peer_id,
            alias='test_device1'
        )

        # 11. 更新第二个设备（仅更新备注）
        peer_id = self.test_data['peer_ids'][1]
        self.run_test(
            f"更新设备 '{peer_id}'（仅备注）",
            update_peer,
            self.url, self.token, ab_guid,
            peer_id,
            note='仅更新备注'
        )

        # 12. 更新第三个设备（清空标签）
        peer_id = self.test_data['peer_ids'][2]
        self.run_test(
            f"更新设备 '{peer_id}'（清空标签）",
            update_peer,
            self.url, self.token, ab_guid,
            peer_id,
            tags=[]
        )

        # 13. 查看设备列表（验证更新）
        self.run_test(
            "查看设备列表（验证更新）",
            view_ab_peers,
            self.url, self.token, ab_guid
        )

        # 14. 删除单个设备
        peer_id = self.test_data['peer_ids'][2]
        self.run_test(
            f"删除设备 '{peer_id}'",
            delete_peer,
            self.url, self.token, ab_guid,
            peer_id
        )
        self.test_data['peer_ids'].remove(peer_id)

        # 15. 批量删除设备
        remaining_peers = self.test_data['peer_ids'][:2]
        self.run_test(
            f"批量删除设备 {remaining_peers}",
            delete_peer,
            self.url, self.token, ab_guid,
            remaining_peers
        )
        self.test_data['peer_ids'] = []

        # 16. 查看设备列表（验证删除）
        self.run_test(
            "查看设备列表（验证删除）",
            view_ab_peers,
            self.url, self.token, ab_guid
        )

        # 17. 清理临时标签
        if self.test_data.get('temp_tags'):
            from ab import delete_tags
            self.run_test(
                f"清理临时标签 {self.test_data['temp_tags']}",
                delete_tags,
                self.url, self.token, ab_guid,
                self.test_data['temp_tags']
            )
            self.test_data['temp_tags'] = []

    def run_all_tests(self):
        """运行所有设备管理测试"""
        self.test_peer_management()
