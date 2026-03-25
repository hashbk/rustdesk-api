"""
地址簿管理测试
测试地址簿的创建、查看、更新、删除功能
"""

import sys
import os

# 添加父目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tests.test_base import BaseTester
from ab import get_personal_ab, add_shared_ab, update_shared_ab, delete_shared_abs


class AddressBookTester(BaseTester):
    """地址簿管理测试器"""

    def test_address_book_management(self):
        """测试地址簿管理功能"""
        self.print_section("第二部分：地址簿管理测试")

        # 1. 获取个人地址簿 GUID
        self.run_test(
            "获取个人地址簿 GUID",
            get_personal_ab,
            self.url, self.token
        )

        # 2. 创建共享地址簿
        ab_name = self._generate_random_ab_name()
        self.test_data['shared_ab_name'] = ab_name

        result = self.run_test(
            f"创建共享地址簿 '{ab_name}'",
            add_shared_ab,
            self.url, self.token, ab_name, note="这是一个测试地址簿"
        )

        if isinstance(result, dict) and 'guid' in result:
            self.test_data['shared_ab_guid'] = result['guid']

        # 3. 获取个人地址簿 GUID（再次测试）
        personal_ab = self.run_test(
            "获取个人地址簿 GUID",
            get_personal_ab,
            self.url, self.token
        )

        if isinstance(personal_ab, dict) and 'guid' in personal_ab:
            self.test_data['personal_ab_guid'] = personal_ab['guid']

        # 4. 更新共享地址簿（更新名称）
        if self.test_data['shared_ab_guid']:
            new_ab_name = ab_name + '_updated'
            self.test_data['shared_ab_name'] = new_ab_name

            self.run_test(
                f"更新共享地址簿名称为 '{new_ab_name}'",
                update_shared_ab,
                self.url, self.token, self.test_data['shared_ab_guid'],
                name=new_ab_name
            )

        # 5. 更新共享地址簿（更新备注）
        if self.test_data['shared_ab_guid']:
            self.run_test(
                "更新共享地址簿备注",
                update_shared_ab,
                self.url, self.token, self.test_data['shared_ab_guid'],
                note="这是更新后的备注"
            )

    def run_all_tests(self):
        """运行所有地址簿管理测试"""
        self.test_address_book_management()
