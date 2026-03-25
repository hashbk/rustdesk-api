#!/usr/bin/env python3
"""
地址簿 API 全面测试脚本（主入口）
对 ab.py 中的所有功能进行完整、系统的测试

使用方法:
    python test_ab_api.py --url <API_URL> --token <ACCESS_TOKEN>

示例:
    python test_ab_api.py --url http://localhost:3000 --token eyJhbGci...
"""

import sys
import os
import argparse

# 添加 tests 目录到 Python 路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'tests'))

from tests.test_base import BaseTester
from tests.test_helper_functions import HelperFunctionsTester
from tests.test_address_book import AddressBookTester
from tests.test_peer import PeerTester
from tests.test_tag import TagTester
from tests.test_rule import RuleTester
from tests.test_cleanup import CleanupTester


class AddressBookAPITester(BaseTester):
    """地址簿 API 完整测试器"""

    def __init__(self, url: str, token: str):
        super().__init__(url, token)

        # 创建各个测试模块
        self.helper_tester = HelperFunctionsTester(url, token)
        self.address_book_tester = AddressBookTester(url, token)
        self.peer_tester = PeerTester(url, token)
        self.tag_tester = TagTester(url, token)
        self.rule_tester = RuleTester(url, token)
        self.cleanup_tester = CleanupTester(url, token)

    def run_all_tests(self):
        """运行所有测试模块"""
        try:
            # 1. 辅助函数测试
            self.helper_tester.run_all_tests()
            self.test_results.extend(self.helper_tester.test_results)

            # 2. 地址簿管理测试
            self.address_book_tester.run_all_tests()
            self.test_results.extend(self.address_book_tester.test_results)

            # 共享测试数据给其他测试模块
            self.peer_tester.test_data = self.address_book_tester.test_data
            self.tag_tester.test_data = self.address_book_tester.test_data
            self.rule_tester.test_data = self.address_book_tester.test_data
            self.cleanup_tester.test_data = self.address_book_tester.test_data

            # 3. 设备管理测试
            self.peer_tester.run_all_tests()
            self.test_results.extend(self.peer_tester.test_results)

            # 4. 标签管理测试
            self.tag_tester.run_all_tests()
            self.test_results.extend(self.tag_tester.test_results)

            # 5. 规则管理测试
            self.rule_tester.run_all_tests()
            self.test_results.extend(self.rule_tester.test_results)

            # 6. 清理测试
            self.cleanup_tester.run_all_tests()
            self.test_results.extend(self.cleanup_tester.test_results)

            # 打印测试总结
            self.print_summary()

        except Exception as e:
            print(f"\n[ERROR] 测试过程中发生错误: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)


def main():
    """主函数"""
    parser = argparse.ArgumentParser(
        description='地址簿 API 全面测试脚本',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python test_ab_api.py --url http://localhost:3000 --token <your_token>
  python test_ab_api.py --url http://localhost:3000 --token <your_token> --module peer
        """
    )

    parser.add_argument(
        '--url',
        required=True,
        help='API 服务器 URL'
    )

    parser.add_argument(
        '--token',
        required=True,
        help='访问令牌（Bearer Token）'
    )

    parser.add_argument(
        '--module',
        choices=['helper', 'address_book', 'peer', 'tag', 'rule', 'cleanup', 'all'],
        default='all',
        help='指定要运行的测试模块（默认: all）'
    )

    args = parser.parse_args()

    # 移除 URL 末尾的斜杠
    while args.url.endswith('/'):
        args.url = args.url[:-1]

    # 创建测试器
    tester = AddressBookAPITester(args.url, args.token)

    # 根据参数运行指定的测试模块
    if args.module == 'helper':
        tester.helper_tester.run_all_tests()
        tester.test_results.extend(tester.helper_tester.test_results)
    elif args.module == 'address_book':
        tester.address_book_tester.run_all_tests()
        tester.test_results.extend(tester.address_book_tester.test_results)
    elif args.module == 'peer':
        tester.address_book_tester.run_all_tests()
        tester.test_data = tester.address_book_tester.test_data
        tester.peer_tester.test_data = tester.test_data
        tester.peer_tester.run_all_tests()
        tester.test_results.extend(tester.address_book_tester.test_results)
        tester.test_results.extend(tester.peer_tester.test_results)
    elif args.module == 'tag':
        tester.address_book_tester.run_all_tests()
        tester.test_data = tester.address_book_tester.test_data
        tester.tag_tester.test_data = tester.test_data
        tester.tag_tester.run_all_tests()
        tester.test_results.extend(tester.address_book_tester.test_results)
        tester.test_results.extend(tester.tag_tester.test_results)
    elif args.module == 'rule':
        tester.address_book_tester.run_all_tests()
        tester.test_data = tester.address_book_tester.test_data
        tester.rule_tester.test_data = tester.test_data
        tester.rule_tester.run_all_tests()
        tester.test_results.extend(tester.address_book_tester.test_results)
        tester.test_results.extend(tester.rule_tester.test_results)
    elif args.module == 'cleanup':
        tester.cleanup_tester.run_all_tests()
        tester.test_results.extend(tester.cleanup_tester.test_results)
    else:  # all
        tester.run_all_tests()

    # 打印测试总结
    tester.print_summary()

    # 检查是否有失败的测试
    failed_count = sum(1 for r in tester.test_results if not r.success)
    if failed_count > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
