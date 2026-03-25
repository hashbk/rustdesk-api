"""
清理测试
测试结束后清理所有测试数据
"""

import sys
import os

# 添加父目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tests.test_base import BaseTester
from ab import view_shared_abs, delete_shared_abs


class CleanupTester(BaseTester):
    """清理测试器"""

    def test_cleanup(self):
        """清理测试数据"""
        self.print_section("第六部分：清理测试数据")

        # 获取所有共享地址簿
        shared_abs = self.run_test(
            "查看共享地址簿列表",
            view_shared_abs,
            self.url, self.token
        )

        # 删除测试创建的共享地址簿
        if isinstance(shared_abs, list):
            test_abs = [
                ab for ab in shared_abs
                if ab.get('name', '').startswith('Test_AB_')
            ]

            if test_abs:
                ab_guids = [ab['guid'] for ab in test_abs]
                self.run_test(
                    f"删除测试共享地址簿",
                    delete_shared_abs,
                    self.url, self.token,
                    ab_guids
                )

        # 最终验证
        self.run_test(
            "最终查看共享地址簿列表",
            view_shared_abs,
            self.url, self.token
        )

    def run_all_tests(self):
        """运行清理测试"""
        self.test_cleanup()
