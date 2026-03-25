"""
基础测试类和工具函数
提供测试框架的基础设施
"""

import sys
import json
import time
import random
import string
from typing import Any, Dict, List, Optional
from abc import ABC, abstractmethod


class TestResult:
    """测试结果类"""
    def __init__(self, test_name: str):
        self.test_name = test_name
        self.success = False
        self.response = None
        self.error = None
        self.duration = 0

    def set_success(self, response: Any, duration: float):
        self.success = True
        self.response = response
        self.duration = duration

    def set_error(self, error: str, duration: float):
        self.error = error
        self.duration = duration

    def __str__(self):
        status = "[PASS]" if self.success else "[FAIL]"
        result = f"\n{status} - {self.test_name} ({self.duration:.2f}s)"
        if self.response is not None:
            result += f"\n   响应: {self._format_response(self.response)}"
        if self.error:
            result += f"\n   错误: {self.error}"
        return result

    def _format_response(self, response: Any) -> str:
        """格式化响应内容"""
        if isinstance(response, str):
            return response
        try:
            formatted = json.dumps(response, indent=2, ensure_ascii=False)
            return formatted
        except:
            return str(response)


class BaseTester(ABC):
    """基础测试器类"""

    def __init__(self, url: str, token: str):
        self.url = url
        self.token = token
        self.test_results: List[TestResult] = []

        # 测试数据存储
        self.test_data = {
            'personal_ab_guid': None,
            'shared_ab_guid': None,
            'shared_ab_name': None,
            'peer_ids': [],
            'tag_names': [],
            'rule_guids': [],
            'temp_tags': [],  # 临时标签
        }

    def _generate_random_peer_id(self) -> str:
        """生成随机9位数字作为设备ID"""
        return ''.join([str(random.randint(0, 9)) for _ in range(9)])

    def _generate_random_tag_name(self) -> str:
        """生成随机标签名称"""
        return 'test_tag_' + ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))

    def _generate_random_ab_name(self) -> str:
        """生成随机地址簿名称"""
        return 'Test_AB_' + str(int(time.time()))

    def print_section(self, title: str):
        """打印测试部分标题"""
        print(f"\n{'=' * 60}")
        print(f"  {title}")
        print(f"{'=' * 60}")

    def print_summary(self):
        """打印测试总结"""
        total = len(self.test_results)
        passed = sum(1 for r in self.test_results if r.success)
        failed = total - passed
        pass_rate = (passed / total * 100) if total > 0 else 0

        print(f"\n{'=' * 60}")
        print(f"  测试总结")
        print(f"{'=' * 60}")
        print(f"\n总测试数: {total}")
        print(f"[PASS] 通过: {passed}")
        print(f"[FAIL] 失败: {failed}")
        print(f"通过率: {pass_rate:.1f}%")
        print(f"\n{'=' * 60}")

    def run_test(self, test_name: str, func, *args, **kwargs):
        """运行单个测试"""
        try:
            start_time = time.time()
            response = func(*args, **kwargs)
            duration = time.time() - start_time

            result = TestResult(test_name)
            result.set_success(response, duration)
            self.test_results.append(result)

            print(result)
            return response

        except Exception as e:
            duration = time.time() - start_time
            result = TestResult(test_name)
            result.set_error(str(e), duration)
            self.test_results.append(result)

            print(result)
            raise

    @abstractmethod
    def run_all_tests(self):
        """运行所有测试（子类必须实现）"""
        pass
