"""
辅助函数测试
测试 ab.py 中的辅助函数
"""

import sys
import os

# 添加父目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tests.test_base import BaseTester
from ab import str2color, permission_to_string, string_to_permission


class HelperFunctionsTester(BaseTester):
    """辅助函数测试器"""

    def test_helper_functions(self):
        """测试辅助函数"""
        self.print_section("第一部分：辅助函数测试")

        # 1. 测试 str2color 函数
        self.run_test(
            "str2color('red') -> 0xFFFF0000",
            str2color,
            'red'
        )

        self.run_test(
            "str2color('green') -> 0xFF008000",
            str2color,
            'green'
        )

        self.run_test(
            "str2color('blue') -> 0xFF0000FF",
            str2color,
            'blue'
        )

        self.run_test(
            "str2color('yellow') -> 0xFFFFFF00",
            str2color,
            'yellow'
        )

        # 2. 测试 permission_to_string 函数
        self.run_test(
            "permission_to_string(1) -> 'ro'",
            permission_to_string,
            1
        )

        self.run_test(
            "permission_to_string(2) -> 'rw'",
            permission_to_string,
            2
        )

        self.run_test(
            "permission_to_string(3) -> 'full'",
            permission_to_string,
            3
        )

        # 3. 测试 string_to_permission 函数
        self.run_test(
            "string_to_permission('ro') -> 1",
            string_to_permission,
            'ro'
        )

        self.run_test(
            "string_to_permission('rw') -> 2",
            string_to_permission,
            'rw'
        )

        self.run_test(
            "string_to_permission('full') -> 3",
            string_to_permission,
            'full'
        )

    def run_all_tests(self):
        """运行所有辅助函数测试"""
        self.test_helper_functions()
