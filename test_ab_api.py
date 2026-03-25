#!/usr/bin/env python3
"""
地址簿 API 全面测试脚本
对 ab.py 中的所有功能进行完整、系统的测试
"""

import sys
import json
import time
import random
import string
from typing import Any, Dict, List, Optional

# 导入 ab.py 中的所有函数
from ab import (
    get_personal_ab,
    view_shared_abs,
    get_ab_by_name,
    view_ab_peers,
    view_ab_tags,
    add_peer,
    delete_peer,
    update_peer,
    add_tag,
    update_tag,
    delete_tags,
    add_shared_ab,
    update_shared_ab,
    delete_shared_abs,
    view_ab_rules,
    add_ab_rule,
    update_ab_rule,
    delete_ab_rules,
    send_heartbeat,
    permission_to_string,
    string_to_permission,
    str2color,
)


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


class AddressBookAPITester:
    """地址簿 API 测试器"""

    def __init__(self, url: str, token: str):
        self.url = url
        self.token = token
        self.test_results: List[TestResult] = []

        # 测试数据存储
        self.test_data = {
            'personal_ab_guid': None,
            'shared_ab_guid': None,
            'shared_ab_name': None,
            'peer_ids': [],  # 存储多个设备ID
            'tag_names': [],  # 存储多个标签名称
            'rule_guids': [],  # 存储多个规则GUID
        }

    def _generate_random_peer_id(self) -> str:
        """生成随机9位数字作为设备ID"""
        return ''.join([str(random.randint(0, 9)) for _ in range(9)])

    def _generate_random_tag_name(self) -> str:
        """生成随机标签名称"""
        return 'test_tag_' + ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))

    def _generate_random_ab_name(self) -> str:
        """生成随机地址簿名称"""
        return 'test_shared_ab_' + ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))

    def run_test(self, test_name: str, test_func, *args, **kwargs) -> TestResult:
        """运行单个测试"""
        result = TestResult(test_name)
        start_time = time.time()

        try:
            response = test_func(*args, **kwargs)
            duration = time.time() - start_time
            result.set_success(response, duration)
        except Exception as e:
            duration = time.time() - start_time
            result.set_error(str(e), duration)

        self.test_results.append(result)
        print(result)
        return result

    def print_section(self, title: str):
        """打印测试章节标题"""
        print(f"\n{'='*60}")
        print(f"  {title}")
        print(f"{'='*60}")

    # ============ 第一部分：辅助函数测试 ============

    def test_helper_functions(self):
        """测试辅助函数"""
        self.print_section("第一部分：辅助函数测试")

        # 1. 测试 permission_to_string
        result = self.run_test(
            "permission_to_string(1) -> 'ro'",
            permission_to_string,
            1
        )
        assert result.success and result.response == 'ro', "permission_to_string(1) 应该返回 'ro'"

        result = self.run_test(
            "permission_to_string(2) -> 'rw'",
            permission_to_string,
            2
        )
        assert result.success and result.response == 'rw', "permission_to_string(2) 应该返回 'rw'"

        result = self.run_test(
            "permission_to_string(3) -> 'full'",
            permission_to_string,
            3
        )
        assert result.success and result.response == 'full', "permission_to_string(3) 应该返回 'full'"

        # 2. 测试 string_to_permission
        result = self.run_test(
            "string_to_permission('ro') -> 1",
            string_to_permission,
            'ro'
        )
        assert result.success and result.response == 1, "string_to_permission('ro') 应该返回 1"

        result = self.run_test(
            "string_to_permission('rw') -> 2",
            string_to_permission,
            'rw'
        )
        assert result.success and result.response == 2, "string_to_permission('rw') 应该返回 2"

        result = self.run_test(
            "string_to_permission('full') -> 3",
            string_to_permission,
            'full'
        )
        assert result.success and result.response == 3, "string_to_permission('full') 应该返回 3"

        # 3. 测试 str2color
        result = self.run_test(
            "str2color('red') -> 0xFFFF0000",
            str2color,
            'red'
        )
        assert result.success and result.response == 0xFFFF0000, "str2color('red') 应该返回 0xFFFF0000"

        result = self.run_test(
            "str2color('blue') -> 0xFF0000FF",
            str2color,
            'blue'
        )
        assert result.success and result.response == 0xFF0000FF, "str2color('blue') 应该返回 0xFF0000FF"

        result = self.run_test(
            "str2color('green') -> 0xFF008000",
            str2color,
            'green'
        )
        assert result.success and result.response == 0xFF008000, "str2color('green') 应该返回 0xFF008000"

    # ============ 第二部分：地址簿管理测试 ============

    def test_address_book_management(self):
        """测试地址簿管理功能"""
        self.print_section("第二部分：地址簿管理测试")

        # 1. 获取个人地址簿
        result = self.run_test(
            "获取个人地址簿 GUID",
            get_personal_ab,
            self.url, self.token
        )
        if result.success and isinstance(result.response, dict):
            self.test_data['personal_ab_guid'] = result.response.get('guid')
            print(f"   [OK] 个人地址簿 GUID: {self.test_data['personal_ab_guid']}")

        # 2. 查看共享地址簿列表
        self.run_test(
            "查看共享地址簿列表",
            view_shared_abs,
            self.url, self.token
        )

        # 3. 添加共享地址簿
        ab_name = self._generate_random_ab_name()
        result = self.run_test(
            f"添加共享地址簿 '{ab_name}'",
            add_shared_ab,
            self.url, self.token, ab_name, '测试备注', 'test_password'
        )
        if result.success and isinstance(result.response, dict):
            self.test_data['shared_ab_guid'] = result.response.get('guid')
            self.test_data['shared_ab_name'] = ab_name
            print(f"   [OK] 共享地址簿 GUID: {self.test_data['shared_ab_guid']}")

        # 4. 通过名称获取地址簿
        if self.test_data['shared_ab_name']:
            result = self.run_test(
                f"通过名称获取地址簿 '{self.test_data['shared_ab_name']}'",
                get_ab_by_name,
                self.url, self.token, self.test_data['shared_ab_name']
            )
            assert result.success and result.response is not None, "应该能通过名称获取到地址簿"

        # 5. 更新共享地址簿
        if self.test_data['shared_ab_guid']:
            ab_name_updated = self.test_data['shared_ab_name'] + '_updated'
            result = self.run_test(
                "更新共享地址簿（名称和备注）",
                update_shared_ab,
                self.url, self.token, self.test_data['shared_ab_guid'],
                name=ab_name_updated,
                note='更新后的备注'
            )
            self.test_data['shared_ab_name'] = ab_name_updated

        # 6. 再次查看共享地址簿列表（验证更新）
        self.run_test(
            "再次查看共享地址簿列表（验证更新）",
            view_shared_abs,
            self.url, self.token
        )

    # ============ 第三部分：设备管理测试 ============

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

        # 3. 添加第一个设备（带所有参数）
        peer_id = self.test_data['peer_ids'][0]
        tag_name = self.test_data['tag_names'][0] if self.test_data['tag_names'] else None
        result = self.run_test(
            f"添加设备 '{peer_id}'（带别名、备注、标签、密码）",
            add_peer,
            self.url, self.token, ab_guid,
            peer_id,
            alias='测试设备1',
            note='这是测试设备1的备注',
            tags=[tag_name] if tag_name else None,
            password='peer_password1'
        )

        # 4. 添加第二个设备（仅必需参数）
        peer_id = self.test_data['peer_ids'][1]
        self.run_test(
            f"添加设备 '{peer_id}'（仅必需参数）",
            add_peer,
            self.url, self.token, ab_guid,
            peer_id,
            note='这是测试设备2的备注'
        )

        # 5. 添加第三个设备（带多个标签）
        peer_id = self.test_data['peer_ids'][2]
        tags = self.test_data['tag_names'][:2] if len(self.test_data['tag_names']) >= 2 else None
        self.run_test(
            f"添加设备 '{peer_id}'（带多个标签）",
            add_peer,
            self.url, self.token, ab_guid,
            peer_id,
            alias='测试设备3',
            tags=tags
        )

        # 6. 查看设备列表（验证添加）
        self.run_test(
            "查看设备列表（验证添加）",
            view_ab_peers,
            self.url, self.token, ab_guid
        )

        # 7. 按ID查询设备
        peer_id = self.test_data['peer_ids'][0]
        self.run_test(
            f"按ID查询设备 '{peer_id}'",
            view_ab_peers,
            self.url, self.token, ab_guid, peer_id=peer_id
        )

        # 8. 按别名查询设备
        self.run_test(
            "按别名查询设备 '测试设备1'",
            view_ab_peers,
            self.url, self.token, ab_guid, alias='测试设备1'
        )

        # 9. 更新第一个设备（更新所有字段）
        peer_id = self.test_data['peer_ids'][0]
        new_tag_name = self._generate_random_tag_name()
        self.run_test(
            f"更新设备 '{peer_id}'（所有字段）",
            update_peer,
            self.url, self.token, ab_guid,
            peer_id,
            alias='更新后的设备1',
            note='更新后的备注',
            tags=[new_tag_name],
            password='new_password'
        )

        # 10. 更新第二个设备（仅更新备注）
        peer_id = self.test_data['peer_ids'][1]
        self.run_test(
            f"更新设备 '{peer_id}'（仅备注）",
            update_peer,
            self.url, self.token, ab_guid,
            peer_id,
            note='仅更新备注'
        )

        # 11. 更新第三个设备（清空标签）
        peer_id = self.test_data['peer_ids'][2]
        self.run_test(
            f"更新设备 '{peer_id}'（清空标签）",
            update_peer,
            self.url, self.token, ab_guid,
            peer_id,
            tags=[]
        )

        # 12. 查看设备列表（验证更新）
        self.run_test(
            "查看设备列表（验证更新）",
            view_ab_peers,
            self.url, self.token, ab_guid
        )

        # 13. 删除单个设备
        peer_id = self.test_data['peer_ids'][2]
        self.run_test(
            f"删除设备 '{peer_id}'",
            delete_peer,
            self.url, self.token, ab_guid,
            peer_id
        )
        self.test_data['peer_ids'].remove(peer_id)

        # 14. 批量删除设备
        remaining_peers = self.test_data['peer_ids'][:2]
        self.run_test(
            f"批量删除设备 {remaining_peers}",
            delete_peer,
            self.url, self.token, ab_guid,
            remaining_peers
        )
        self.test_data['peer_ids'] = []

        # 15. 查看设备列表（验证删除）
        self.run_test(
            "查看设备列表（验证删除）",
            view_ab_peers,
            self.url, self.token, ab_guid
        )

    # ============ 第四部分：标签管理测试 ============

    def test_tag_management(self):
        """测试标签管理功能"""
        self.print_section("第四部分：标签管理测试")

        ab_guid = self.test_data['shared_ab_guid'] or self.test_data['personal_ab_guid']
        if not ab_guid:
            print("   [WARN] 跳过标签测试：没有可用的地址簿")
            return

        # 1. 查看标签列表
        self.run_test(
            "查看地址簿标签列表",
            view_ab_tags,
            self.url, self.token, ab_guid
        )

        # 2. 添加多个标签
        for i in range(4):
            tag_name = self._generate_random_tag_name()
            self.test_data['tag_names'].append(tag_name)

            if i == 0:
                # 第一个标签：指定颜色
                result = self.run_test(
                    f"添加标签 '{tag_name}'（指定颜色）",
                    add_tag,
                    self.url, self.token, ab_guid,
                    tag_name,
                    color=0xFFFF0000
                )
            elif i == 1:
                # 第二个标签：自动生成颜色
                result = self.run_test(
                    f"添加标签 '{tag_name}'（自动生成颜色）",
                    add_tag,
                    self.url, self.token, ab_guid,
                    tag_name
                )
            elif i == 2:
                # 第三个标签：使用预定义颜色名称
                result = self.run_test(
                    f"添加标签 'blue'（预定义颜色）",
                    add_tag,
                    self.url, self.token, ab_guid,
                    'blue'
                )
                self.test_data['tag_names'].append('blue')
            else:
                # 第四个标签：另一个预定义颜色
                result = self.run_test(
                    f"添加标签 'green'（预定义颜色）",
                    add_tag,
                    self.url, self.token, ab_guid,
                    'green'
                )
                self.test_data['tag_names'].append('green')

        # 3. 查看标签列表（验证添加）
        self.run_test(
            "查看标签列表（验证添加）",
            view_ab_tags,
            self.url, self.token, ab_guid
        )

        # 4. 更新标签颜色
        tag_name = self.test_data['tag_names'][0]
        self.run_test(
            f"更新标签 '{tag_name}' 颜色",
            update_tag,
            self.url, self.token, ab_guid,
            tag_name,
            color=0xFF00FF00
        )

        # 5. 查看标签列表（验证更新）
        self.run_test(
            "查看标签列表（验证更新）",
            view_ab_tags,
            self.url, self.token, ab_guid
        )

        # 6. 删除单个标签
        tag_name = self.test_data['tag_names'][0]
        self.run_test(
            f"删除标签 '{tag_name}'",
            delete_tags,
            self.url, self.token, ab_guid,
            tag_name
        )
        self.test_data['tag_names'].remove(tag_name)

        # 7. 批量删除标签
        tags_to_delete = self.test_data['tag_names'][:2]
        self.run_test(
            f"批量删除标签 {tags_to_delete}",
            delete_tags,
            self.url, self.token, ab_guid,
            tags_to_delete
        )
        self.test_data['tag_names'] = self.test_data['tag_names'][2:]

        # 8. 查看标签列表（验证删除）
        self.run_test(
            "查看标签列表（验证删除）",
            view_ab_tags,
            self.url, self.token, ab_guid
        )

    # ============ 第五部分：规则管理测试 ============

    def test_rule_management(self):
        """测试规则管理功能"""
        self.print_section("第五部分：规则管理测试")

        ab_guid = self.test_data['shared_ab_guid'] or self.test_data['personal_ab_guid']
        if not ab_guid:
            print("   [WARN] 跳过规则测试：没有可用的地址簿")
            return

        # 1. 查看规则列表
        rules = self.run_test(
            "查看地址簿规则列表",
            view_ab_rules,
            self.url, self.token, ab_guid
        )

        # 清理自动创建的规则（如果有）
        if rules.success and isinstance(rules.response, list) and len(rules.response) > 0:
            existing_rule_guids = [r['guid'] for r in rules.response]
            if existing_rule_guids:
                self.run_test(
                    f"清理自动创建的规则 {existing_rule_guids}",
                    delete_ab_rules,
                    self.url, self.token,
                    existing_rule_guids
                )

        # 2. 添加everyone规则（只读权限）
        result = self.run_test(
            "添加 everyone 规则（只读权限）",
            add_ab_rule,
            self.url, self.token, ab_guid,
            'everyone',
            rule=1
        )
        if result.success and isinstance(result.response, dict):
            self.test_data['rule_guids'].append(result.response.get('guid'))
            print(f"   [OK] 规则 GUID: {self.test_data['rule_guids'][-1]}")

        # 3. 添加用户规则（admin用户，读写权限）
        result = self.run_test(
            "添加用户规则 'admin'（读写权限）",
            add_ab_rule,
            self.url, self.token, ab_guid,
            'user',
            user='admin',
            rule=2
        )
        if result.success and isinstance(result.response, dict):
            self.test_data['rule_guids'].append(result.response.get('guid'))
            print(f"   [OK] 规则 GUID: {self.test_data['rule_guids'][-1]}")

        # 4. 查看规则列表（验证添加）
        self.run_test(
            "查看规则列表（验证添加）",
            view_ab_rules,
            self.url, self.token, ab_guid
        )

        # 5. 更新规则权限
        if len(self.test_data['rule_guids']) >= 2:
            rule_guid = self.test_data['rule_guids'][0]
            self.run_test(
                f"更新规则权限（只读 -> 读写）",
                update_ab_rule,
                self.url, self.token,
                rule_guid,
                rule=2
            )

            rule_guid = self.test_data['rule_guids'][1]
            self.run_test(
                f"更新规则权限（读写 -> 完全控制）",
                update_ab_rule,
                self.url, self.token,
                rule_guid,
                rule=3
            )

        # 6. 查看规则列表（验证更新）
        self.run_test(
            "查看规则列表（验证更新）",
            view_ab_rules,
            self.url, self.token, ab_guid
        )

        # 7. 删除单个规则
        if len(self.test_data['rule_guids']) >= 1:
            rule_guid = self.test_data['rule_guids'][0]
            self.run_test(
                "删除单个规则",
                delete_ab_rules,
                self.url, self.token,
                rule_guid
            )
            self.test_data['rule_guids'].remove(rule_guid)

        # 8. 批量删除规则
        if len(self.test_data['rule_guids']) >= 1:
            rules_to_delete = self.test_data['rule_guids'][:1]
            self.run_test(
                f"批量删除规则 {rules_to_delete}",
                delete_ab_rules,
                self.url, self.token,
                rules_to_delete
            )
            self.test_data['rule_guids'] = self.test_data['rule_guids'][1:]

        # 9. 查看规则列表（验证删除）
        self.run_test(
            "查看规则列表（验证删除）",
            view_ab_rules,
            self.url, self.token, ab_guid
        )

    # ============ 第六部分：清理测试数据 ============

    def test_cleanup(self):
        """清理测试数据"""
        self.print_section("第六部分：清理测试数据")

        # 删除共享地址簿
        if self.test_data['shared_ab_guid']:
            self.run_test(
                "删除测试共享地址簿",
                delete_shared_abs,
                self.url, self.token,
                self.test_data['shared_ab_guid']
            )

        # 最终查看共享地址簿列表
        self.run_test(
            "最终查看共享地址簿列表",
            view_shared_abs,
            self.url, self.token
        )

    def run_all_tests(self):
        """运行所有测试"""
        print("\n" + "="*60)
        print("  地址簿 API 全面测试")
        print("="*60)
        print(f"API URL: {self.url}")
        print(f"Token: {self.token[:20]}..." if len(self.token) > 20 else f"Token: {self.token}")

        try:
            # 执行所有测试
            self.test_helper_functions()
            self.test_address_book_management()
            self.test_tag_management()
            self.test_peer_management()
            self.test_rule_management()
            self.test_cleanup()

        except KeyboardInterrupt:
            print("\n\n[WARN] 测试被用户中断")
        except Exception as e:
            print(f"\n\n[ERROR] 测试过程中发生错误: {e}")
            import traceback
            traceback.print_exc()

        # 打印测试总结
        self.print_summary()

    def print_summary(self):
        """打印测试总结"""
        print("\n" + "="*60)
        print("  测试总结")
        print("="*60)

        total = len(self.test_results)
        passed = sum(1 for r in self.test_results if r.success)
        failed = total - passed

        print(f"\n总测试数: {total}")
        print(f"[PASS] 通过: {passed}")
        print(f"[FAIL] 失败: {failed}")
        print(f"通过率: {(passed/total*100):.1f}%" if total > 0 else "通过率: 0%")

        if failed > 0:
            print("\n失败的测试:")
            for result in self.test_results:
                if not result.success:
                    print(f"  - {result.test_name}")
                    if result.error:
                        print(f"    错误: {result.error}")

        print("\n" + "="*60)


def main():
    """主函数"""
    import argparse

    parser = argparse.ArgumentParser(description="地址簿 API 全面测试")
    parser.add_argument("--url", required=True, help="API URL")
    parser.add_argument("--token", required=True, help="认证 Token")

    args = parser.parse_args()

    # 创建测试器并运行测试
    tester = AddressBookAPITester(args.url, args.token)
    tester.run_all_tests()


if __name__ == "__main__":
    main()
