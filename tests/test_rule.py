"""
规则管理测试
测试规则的添加、查看、更新、删除功能
"""

import sys
import os

# 添加父目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tests.test_base import BaseTester
from ab import (
    view_ab_rules,
    add_ab_rule,
    update_ab_rule,
    delete_ab_rules,
)


class RuleTester(BaseTester):
    """规则管理测试器"""

    def test_rule_management(self):
        """测试规则管理功能"""
        self.print_section("第五部分：规则管理测试")

        ab_guid = self.test_data['shared_ab_guid'] or self.test_data['personal_ab_guid']
        if not ab_guid:
            print("   [WARN] 跳过规则测试：没有可用的地址簿")
            return

        # 1. 查看规则列表（初始状态）
        rules = self.run_test(
            "查看规则列表（初始状态）",
            view_ab_rules,
            self.url, self.token, ab_guid
        )

        # 清理默认规则（如果存在）
        if isinstance(rules, list) and len(rules) > 0:
            existing_rule_guids = [rule['guid'] for rule in rules]
            self.run_test(
                f"清理默认规则",
                delete_ab_rules,
                self.url, self.token,
                existing_rule_guids
            )

        # 2. 添加用户规则（只读权限）
        result = self.run_test(
            "添加用户规则（只读权限）",
            add_ab_rule,
            self.url, self.token, ab_guid,
            "user",
            user="admin",
            rule=1
        )

        if isinstance(result, dict) and 'guid' in result:
            self.test_data['rule_guids'].append(result['guid'])

        # 3. 添加Everyone规则（只读权限）
        result = self.run_test(
            "添加Everyone规则（只读权限）",
            add_ab_rule,
            self.url, self.token, ab_guid,
            "everyone",
            rule=1
        )

        if isinstance(result, dict) and 'guid' in result:
            self.test_data['rule_guids'].append(result['guid'])

        # 4. 查看规则列表（验证添加）
        self.run_test(
            "查看规则列表（验证添加）",
            view_ab_rules,
            self.url, self.token, ab_guid
        )

        # 6. 更新第一个规则（只读 -> 读写）
        if len(self.test_data['rule_guids']) > 0:
            rule_guid = self.test_data['rule_guids'][0]
            self.run_test(
                f"更新规则权限（只读 -> 读写）",
                update_ab_rule,
                self.url, self.token, rule_guid,
                2
            )

        # 7. 更新第二个规则（读写 -> 完全控制）
        if len(self.test_data['rule_guids']) > 1:
            rule_guid = self.test_data['rule_guids'][1]
            self.run_test(
                f"更新规则权限（读写 -> 完全控制）",
                update_ab_rule,
                self.url, self.token, rule_guid,
                3
            )

        # 8. 查看规则列表（验证更新）
        self.run_test(
            "查看规则列表（验证更新）",
            view_ab_rules,
            self.url, self.token, ab_guid
        )

        # 9. 删除单个规则
        if len(self.test_data['rule_guids']) > 0:
            rule_guid = self.test_data['rule_guids'][0]
            self.run_test(
                f"删除单个规则",
                delete_ab_rules,
                self.url, self.token,
                rule_guid
            )
            self.test_data['rule_guids'].remove(rule_guid)

        # 10. 批量删除规则
        if len(self.test_data['rule_guids']) > 0:
            remaining_rules = self.test_data['rule_guids'][:1]
            self.run_test(
                f"批量删除规则 {remaining_rules}",
                delete_ab_rules,
                self.url, self.token,
                remaining_rules
            )
            self.test_data['rule_guids'] = []

        # 11. 查看规则列表（验证删除）
        self.run_test(
            "查看规则列表（验证删除）",
            view_ab_rules,
            self.url, self.token, ab_guid
        )

    def run_all_tests(self):
        """运行所有规则管理测试"""
        self.test_rule_management()
