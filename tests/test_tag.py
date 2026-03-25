"""
标签管理测试
测试标签的添加、查看、更新、删除功能
"""

import sys
import os

# 添加父目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tests.test_base import BaseTester
from ab import (
    view_ab_tags,
    add_tag,
    update_tag,
    delete_tags,
)


class TagTester(BaseTester):
    """标签管理测试器"""

    def test_tag_management(self):
        """测试标签管理功能"""
        self.print_section("第四部分：标签管理测试")

        ab_guid = self.test_data['shared_ab_guid'] or self.test_data['personal_ab_guid']
        if not ab_guid:
            print("   [WARN] 跳过标签测试：没有可用的地址簿")
            return

        # 1. 查看标签列表（初始状态）
        self.run_test(
            "查看标签列表（初始状态）",
            view_ab_tags,
            self.url, self.token, ab_guid
        )

        # 2. 添加第一个标签（指定颜色）
        tag_name = self._generate_random_tag_name()
        self.test_data['tag_names'].append(tag_name)
        self.run_test(
            f"添加标签 '{tag_name}'（指定颜色）",
            add_tag,
            self.url, self.token, ab_guid,
            tag_name,
            color=0xFFFF0000
        )

        # 3. 添加第二个标签（自动生成颜色）
        tag_name = self._generate_random_tag_name()
        self.test_data['tag_names'].append(tag_name)
        self.run_test(
            f"添加标签 '{tag_name}'（自动生成颜色）",
            add_tag,
            self.url, self.token, ab_guid,
            tag_name
        )

        # 4. 添加第三个标签（使用预定义颜色名称）
        tag_name = 'blue'
        self.test_data['tag_names'].append(tag_name)
        self.run_test(
            f"添加标签 'blue'（预定义颜色）",
            add_tag,
            self.url, self.token, ab_guid,
            tag_name
        )

        # 5. 添加第四个标签（另一个预定义颜色）
        tag_name = 'green'
        self.test_data['tag_names'].append(tag_name)
        self.run_test(
            f"添加标签 'green'（预定义颜色）",
            add_tag,
            self.url, self.token, ab_guid,
            tag_name
        )

        # 6. 查看标签列表（验证添加）
        self.run_test(
            "查看标签列表（验证添加）",
            view_ab_tags,
            self.url, self.token, ab_guid
        )

        # 7. 更新标签（修改颜色）
        tag_name = self.test_data['tag_names'][0]
        self.run_test(
            f"更新标签 '{tag_name}' 颜色",
            update_tag,
            self.url, self.token, ab_guid,
            tag_name,
            color=0xFF00FF00
        )

        # 8. 查看标签列表（验证更新）
        self.run_test(
            "查看标签列表（验证更新）",
            view_ab_tags,
            self.url, self.token, ab_guid
        )

        # 9. 删除单个标签
        tag_name = self.test_data['tag_names'][0]
        self.run_test(
            f"删除标签 '{tag_name}'",
            delete_tags,
            self.url, self.token, ab_guid,
            tag_name
        )
        self.test_data['tag_names'].remove(tag_name)

        # 10. 批量删除标签
        tags_to_delete = self.test_data['tag_names'][:2]
        self.run_test(
            f"批量删除标签 {tags_to_delete}",
            delete_tags,
            self.url, self.token, ab_guid,
            tags_to_delete
        )
        self.test_data['tag_names'] = self.test_data['tag_names'][2:]

        # 11. 查看标签列表（验证删除）
        self.run_test(
            "查看标签列表（验证删除）",
            view_ab_tags,
            self.url, self.token, ab_guid
        )

    def run_all_tests(self):
        """运行所有标签管理测试"""
        self.test_tag_management()
