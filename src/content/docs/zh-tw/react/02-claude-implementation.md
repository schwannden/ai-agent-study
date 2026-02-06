---
title: 'ReAct 模式：Claude SDK 實作'
description: '使用 Claude 的 Python SDK 建構 ReAct 代理。包含約 400 行生產就緒程式碼的完整教學。'
---

## 概覽

ReAct（推理 + 行動）模式是最簡單的 AI 代理架構。代理在推理下一步該做什麼、採取行動和觀察結果之間交替進行。

**最適合：**

- 學習 AI 代理基礎
- 簡單工作流程（3-5 步）
- 原型和 MVP
- 有限工具集的任務

**不適合：**

- 需要可靠性的生產系統
- 複雜的多步驟工作流程
- 需要品質保證的任務
- 容易出錯的操作

請參閱 [計劃-執行-驗證](/ai-agent-study/zh-tw/plan-execute-verify/01-overview/) 以了解更強健的生產模式。

## 架構

```
┌─────────────────────────────────────────────────┐
│  應用控制迴圈                                      │
│                                                  │
│  while not done:                                 │
│    1. 傳送對話到 LLM                              │
│    2. 解析回應（推理 + 行動）                       │
│    3. 執行行動（工具呼叫）                          │
│    4. 觀察結果                                     │
│    5. 將觀察傳回 LLM                               │
│    6. 更新 UI                                     │
│    7. 重複                                        │
└─────────────────────────────────────────────────┘
         │                            │
         ▼                            ▼
   ┌──────────┐              ┌────────────────┐
   │ LLM      │              │ 工具           │
   │ (Claude) │              │ - read_file    │
   │          │              │ - write_file   │
   └──────────┘              │ - list_files   │
                             └────────────────┘
```

## 逐步建構代理

讓我們逐步建構 ReAct 代理，在進入下一個元件之前先理解每個元件。

### 步驟 1：基本設定

首先，匯入相依套件並初始化 Anthropic 客戶端：

```python
import anthropic
import json
import os
from typing import List, Dict, Any

# 初始化 Claude 客戶端
client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
```

### 步驟 2：設計系統提示

系統提示至關重要 - 它定義了代理能做什麼以及應該如何回應：

```python
system_prompt = """You are a legal review assistant. You work step-by-step to complete tasks.

AVAILABLE TOOLS:
- read_file(path): Read a document from disk
- list_files(folder): List all files in a folder
- write_file(path, content): Write content to a file
- mark_step_complete(step_name): Mark a step as done (for UI progress)

WORKFLOW STEPS:
1. Scan documents in folder
2. Review each legal document
3. Write LEGAL_NOTICES.md with findings
4. Write REVIEW_SUMMARY.md with evaluation

RESPONSE FORMAT:
You must respond in this exact format:

<reasoning>
Your thinking about what to do next and why
</reasoning>

<action>tool_name</action>
<parameters>{"param1": "value1", "param2": "value2"}</parameters>

OR when completely done:

<final_answer>
Your completion message and summary
</final_answer>

RULES:
- Take ONE action at a time
- Wait for observation before next action
- Think step-by-step
- Be thorough in reviews
- Provide specific, actionable recommendations
"""
```

**關鍵設計決策：**

- **明確的格式** - XML 標籤使解析更可靠
- **每回合一個行動** - 防止代理超前
- **清晰的工作流程** - 給代理一個遵循的心智模型
- **結構化輸出** - 易於程式碼解析

### 步驟 3：解析 LLM 回應

我們需要一個輔助函式來從 XML 標籤提取內容：

```python
import re

def extract_between_tags(text: str, tag: str) -> str:
    """提取 XML 樣式標籤之間的內容"""
    pattern = f"<{tag}>(.*?)</{tag}>"
    match = re.search(pattern, text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return ""

# 使用範例：
# reasoning = extract_between_tags(response, "reasoning")
# action = extract_between_tags(response, "action")
```

### 步驟 4：實作工具執行

每個工具執行特定操作並回傳觀察：

```python
def execute_tool(action: str, parameters: dict) -> str:
    """執行工具並回傳觀察"""
    try:
        if action == "list_files":
            folder = parameters["folder"]
            files = os.listdir(folder)
            # 僅過濾文件類型
            doc_files = [f for f in files if f.endswith(('.pdf', '.docx', '.txt', '.md'))]
            return json.dumps(doc_files)

        elif action == "read_file":
            path = parameters["path"]
            if not os.path.exists(path):
                return f"Error: File {path} not found"

            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()

            # 如果太長則截斷以節省 token
            if len(content) > 10000:
                content = content[:10000] + "\n\n[... truncated for length ...]"

            return f"File content ({len(content)} chars):\n{content}"

        elif action == "write_file":
            path = parameters["path"]
            content = parameters["content"]

            # 確保目錄存在
            os.makedirs(os.path.dirname(path) or ".", exist_ok=True)

            with open(path, 'w', encoding='utf-8') as f:
                f.write(content)

            return f"Successfully wrote {len(content)} characters to {path}"

        elif action == "mark_step_complete":
            step_name = parameters["step_name"]
            # 在實際應用中，這會更新 UI 進度
            print(f"   ✓ Step completed: {step_name}")
            return f"Marked '{step_name}' as complete"

        else:
            return f"Error: Unknown action '{action}'"

    except Exception as e:
        return f"Error executing {action}: {str(e)}"
```

**工具設計技巧：**

- 回傳描述性的觀察（不只是「成功」）
- 優雅地處理錯誤
- 保持工具簡單且專注
- 截斷大型輸出以節省 token

### 步驟 5：ReAct 迴圈

現在我們用主控制迴圈把一切串起來：

```python
def react_agent_loop(user_request: str, folder_path: str, max_turns: int = 20):
    """主要 ReAct 控制迴圈"""

    # 初始化對話
    conversation_history = []
    conversation_history.append({
        "role": "user",
        "content": f"Please review all legal documents in: {folder_path}"
    })

    print(f"🚀 Starting legal review of {folder_path}\n")

    # 主迴圈：推理 → 行動 → 觀察
    for turn in range(1, max_turns + 1):
        print(f"{'='*60}")
        print(f"Turn {turn}/{max_turns}")
        print(f"{'='*60}\n")

        # 推理：詢問 Claude 下一步該做什麼
        response = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=4000,
            system=system_prompt,
            messages=conversation_history
        )

        assistant_message = response.content[0].text

        # 檢查代理是否完成
        if "<final_answer>" in assistant_message:
            final_answer = extract_between_tags(assistant_message, "final_answer")
            print("✅ COMPLETED\n")
            print(final_answer)
            return final_answer

        # 解析回應
        try:
            reasoning = extract_between_tags(assistant_message, "reasoning")
            action = extract_between_tags(assistant_message, "action")
            parameters = json.loads(extract_between_tags(assistant_message, "parameters"))
        except Exception as e:
            print(f"❌ Failed to parse LLM response: {e}")
            return None

        # 向使用者顯示推理
        print("🤔 REASONING:")
        print(f"   {reasoning}\n")

        # 行動：執行工具
        print(f"⚡ ACTION: {action}")
        print(f"   Parameters: {json.dumps(parameters, indent=2)}\n")

        observation = execute_tool(action, parameters)

        # 觀察：顯示結果
        print("👀 OBSERVATION:")
        print(f"   {observation}\n")

        # 為下一回合加入對話歷史
        conversation_history.append({
            "role": "assistant",
            "content": assistant_message
        })
        conversation_history.append({
            "role": "user",
            "content": f"<observation>{observation}</observation>"
        })

    print("⚠️  Reached maximum turns without completion")
    return None
```

**迴圈機制：**

1. **傳送訊息** - Claude 看到完整的對話歷史
2. **解析回應** - 提取推理、行動和參數
3. **執行行動** - 呼叫適當的工具
4. **回傳觀察** - 將結果傳回給 Claude
5. **重複** - 繼續直到任務完成

### 執行追蹤範例

以下是我們[法律審查案例研究](/ai-agent-study/zh-tw/blog/ai-agent-case-study/)的完整執行範例：

```
🚀 Starting legal review of /project/legal_docs

============================================================
Turn 1/20
============================================================

🤔 REASONING:
   I need to start by seeing what documents are in the folder.
   This will help me understand the scope of the review.

⚡ ACTION: list_files
   Parameters: {
     "folder": "/project/legal_docs"
   }

👀 OBSERVATION:
   ["contract_v1.pdf", "terms_of_service.docx", "privacy_policy.txt"]

============================================================
Turn 2/20
============================================================

🤔 REASONING:
   Found 3 documents. I'll start reviewing them one by one.
   Let me read the first document - contract_v1.pdf.

⚡ ACTION: read_file
   Parameters: {
     "path": "/project/legal_docs/contract_v1.pdf"
   }

👀 OBSERVATION:
   File content (2453 chars):
   CONTRACT AGREEMENT

   This Agreement is entered into on [Date]...

   Section 5: Contract Duration
   This contract shall remain in effect until...
   [Note: No termination clause specified]

   Section 3: Payment
   Payment shall be made within a reasonable timeframe...

============================================================
Turn 3/20
============================================================

🤔 REASONING:
   I've reviewed contract_v1.pdf and found several issues:
   - Missing termination clause (CRITICAL)
   - Vague payment terms (WARNING)

   Let me continue with the next document.

⚡ ACTION: read_file
   Parameters: {
     "path": "/project/legal_docs/terms_of_service.docx"
   }

👀 OBSERVATION:
   File content (5122 chars):
   TERMS OF SERVICE
   ...

============================================================
Turn 4/20
============================================================

🤔 REASONING:
   Reviewed terms_of_service.docx, found:
   - GDPR non-compliance (CRITICAL)
   - Unclear refund policy (WARNING)

   One more document to review.

⚡ ACTION: read_file
   Parameters: {
     "path": "/project/legal_docs/privacy_policy.txt"
   }

👀 OBSERVATION:
   File content (3891 chars):
   PRIVACY POLICY
   ...

============================================================
Turn 5/20
============================================================

🤔 REASONING:
   All documents reviewed. privacy_policy.txt has:
   - Missing DPO contact (WARNING)

   Now I'll compile findings into LEGAL_NOTICES.md

⚡ ACTION: write_file
   Parameters: {
     "path": "/project/legal_docs/LEGAL_NOTICES.md",
     "content": "# Legal Review Notices\n\n## contract_v1.pdf\n\n### ⚠️ CRITICAL..."
   }

👀 OBSERVATION:
   Successfully wrote 2451 characters to /project/legal_docs/LEGAL_NOTICES.md

============================================================
Turn 6/20
============================================================

🤔 REASONING:
   LEGAL_NOTICES.md created successfully. Now I'll create the
   executive summary with overall evaluation status.

⚡ ACTION: write_file
   Parameters: {
     "path": "/project/legal_docs/REVIEW_SUMMARY.md",
     "content": "# Legal Review Summary\n\n**Status: ⚠️ REQUIRES ATTENTION**..."
   }

👀 OBSERVATION:
   Successfully wrote 1122 characters to /project/legal_docs/REVIEW_SUMMARY.md

============================================================
Turn 7/20
============================================================

🤔 REASONING:
   Both documents created successfully. Let me mark the final step as complete.

⚡ ACTION: mark_step_complete
   Parameters: {
     "step_name": "Write summary with evaluation"
   }

   ✓ Step completed: Write summary with evaluation

👀 OBSERVATION:
   Marked 'Write summary with evaluation' as complete

============================================================
Turn 8/20
============================================================

✅ COMPLETED

Legal review completed successfully!

📊 SUMMARY:
- Reviewed 3 documents
- Found 3 CRITICAL issues
- Found 3 WARNINGS
- Created LEGAL_NOTICES.md (detailed findings)
- Created REVIEW_SUMMARY.md (executive summary)

⚠️ STATUS: REQUIRES ATTENTION

Top recommendations:
1. Add termination clause to contract_v1.pdf immediately
2. Update terms_of_service.docx for GDPR compliance
3. Specify exact payment terms in contract_v1.pdf

All findings documented in /project/legal_docs/LEGAL_NOTICES.md
```

## 進度追蹤

### 基本 UI 進度狀態

```python
class ProgressTracker:
    """追蹤和顯示代理進度"""

    def __init__(self):
        self.steps = [
            {"name": "Scan documents", "status": "pending"},
            {"name": "Review documents", "status": "pending"},
            {"name": "Write legal notices", "status": "pending"},
            {"name": "Write summary", "status": "pending"}
        ]
        self.current_action = None

    def update_from_action(self, action: str, parameters: dict):
        """根據當前行動更新進度"""
        self.current_action = f"{action}: {parameters}"

        # 將行動對應到步驟
        if action == "list_files":
            self.set_step_status("Scan documents", "in_progress")
        elif action == "read_file":
            self.set_step_status("Review documents", "in_progress")
        elif "LEGAL_NOTICES" in parameters.get("path", ""):
            self.set_step_status("Write legal notices", "in_progress")
        elif "REVIEW_SUMMARY" in parameters.get("path", ""):
            self.set_step_status("Write summary", "in_progress")

        self.render()

    def mark_step_complete(self, step_name: str):
        """標記步驟為完成"""
        self.set_step_status(step_name, "complete")
        self.render()

    def set_step_status(self, step_name: str, status: str):
        for step in self.steps:
            if step["name"] == step_name:
                step["status"] = status
                break

    def render(self):
        """向使用者顯示進度"""
        print("\n📋 PROGRESS:")
        for step in self.steps:
            status = step["status"]
            if status == "complete":
                icon = "✅"
            elif status == "in_progress":
                icon = "🔄"
            else:
                icon = "⏳"
            print(f"   {icon} {step['name']}")

        if self.current_action:
            print(f"\n   Current: {self.current_action}")
        print()


# 整合到控制迴圈
tracker = ProgressTracker()

# 執行行動前
tracker.update_from_action(action, parameters)

# 當步驟標記為完成時
if action == "mark_step_complete":
    tracker.mark_step_complete(parameters["step_name"])
```

## 錯誤處理

```python
def react_agent_loop_with_error_handling(user_request: str, folder_path: str):
    """帶有基本錯誤處理的 ReAct 迴圈"""

    max_consecutive_errors = 3
    consecutive_errors = 0

    for turn in range(1, 21):
        try:
            # ... (正常 ReAct 迴圈)

            # 成功時重設錯誤計數器
            consecutive_errors = 0

        except Exception as e:
            consecutive_errors += 1
            print(f"❌ Error on turn {turn}: {e}")

            if consecutive_errors >= max_consecutive_errors:
                print("Too many consecutive errors, aborting")
                return None

            # 將錯誤加入對話讓 LLM 處理
            conversation_history.append({
                "role": "user",
                "content": f"<error>Previous action failed: {str(e)}</error>"
            })

            continue
```

## 優勢

✅ **易於實作**

- 程式碼最少（約 200 行）
- 易於理解
- 快速原型開發

✅ **透明**

- 看到每個決策
- 清晰的推理鏈
- 易於除錯

✅ **靈活**

- 適用於許多任務
- 易於新增工具
- 自然的對話流程

## 限制

❌ **無品質檢查**

- 代理不驗證自己的工作
- 錯誤會傳播到下一步
- 無輸出驗證

❌ **錯誤恢復能力差**

- 如果工具失敗會卡住
- 失敗時不重新計劃
- 通常需要手動介入

❌ **效率低**

- 無並行執行
- 冗餘推理
- 可能不必要地迴圈

❌ **無結構化計劃**

- 即興決策
- 難以估計完成時間
- 難以追蹤整體進度

## 何時使用 ReAct

✅ **適合：**

- 學習 AI 代理
- 簡單的線性工作流程
- 原型開發想法
- 有人類監督的內部工具
- 少於 5 步的任務

❌ **不適合：**

- 生產系統
- 複雜的多分支工作流程
- 需要可靠性的任務
- 品質關鍵應用
- 昂貴的操作（部署、刪除）

## 完整實作

以下是結合上述所有概念的完整可執行程式碼：

```python
import anthropic
import json
import os
import re
from typing import List, Dict, Any


def extract_between_tags(text: str, tag: str) -> str:
    """提取 XML 樣式標籤之間的內容"""
    pattern = f"<{tag}>(.*?)</{tag}>"
    match = re.search(pattern, text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return ""


def execute_tool(action: str, parameters: dict) -> str:
    """
    執行工具並回傳觀察

    這是你實作實際工具邏輯的地方
    """
    try:
        if action == "list_files":
            folder = parameters["folder"]
            files = os.listdir(folder)
            # 過濾文件類型
            doc_files = [f for f in files if f.endswith(('.pdf', '.docx', '.txt', '.md'))]
            return json.dumps(doc_files)

        elif action == "read_file":
            path = parameters["path"]
            if not os.path.exists(path):
                return f"Error: File {path} not found"

            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()

            # 如果太長則截斷以節省 token
            if len(content) > 10000:
                content = content[:10000] + "\n\n[... truncated for length ...]"

            return f"File content ({len(content)} chars):\n{content}"

        elif action == "write_file":
            path = parameters["path"]
            content = parameters["content"]

            # 確保目錄存在
            os.makedirs(os.path.dirname(path) or ".", exist_ok=True)

            with open(path, 'w', encoding='utf-8') as f:
                f.write(content)

            return f"Successfully wrote {len(content)} characters to {path}"

        elif action == "mark_step_complete":
            step_name = parameters["step_name"]
            # 在實際應用中，這會更新 UI 進度
            print(f"   ✓ Step completed: {step_name}")
            return f"Marked '{step_name}' as complete"

        else:
            return f"Error: Unknown action '{action}'"

    except Exception as e:
        return f"Error executing {action}: {str(e)}"


def react_agent_loop(user_request: str, folder_path: str, max_turns: int = 20):
    """
    主要 ReAct 控制迴圈

    Args:
        user_request: 使用者的高層次請求
        folder_path: 代理的工作目錄
        max_turns: 最大推理-行動循環次數

    Returns:
        最終結果或錯誤
    """
    client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
    conversation_history = []

    # 系統提示定義代理能力和格式
    system_prompt = """You are a legal review assistant. You work step-by-step to complete tasks.

AVAILABLE TOOLS:
- read_file(path): Read a document from disk
- list_files(folder): List all files in a folder
- write_file(path, content): Write content to a file
- mark_step_complete(step_name): Mark a step as done (for UI progress)

WORKFLOW STEPS:
1. Scan documents in folder
2. Review each legal document
3. Write LEGAL_NOTICES.md with findings
4. Write REVIEW_SUMMARY.md with evaluation

RESPONSE FORMAT:
You must respond in this exact format:

<reasoning>
Your thinking about what to do next and why
</reasoning>

<action>tool_name</action>
<parameters>{"param1": "value1", "param2": "value2"}</parameters>

OR when completely done:

<final_answer>
Your completion message and summary
</final_answer>

RULES:
- Take ONE action at a time
- Wait for observation before next action
- Think step-by-step
- Be thorough in reviews
- Provide specific, actionable recommendations
"""

    # 初始使用者訊息
    conversation_history.append({
        "role": "user",
        "content": f"Please review all legal documents in: {folder_path}"
    })

    print(f"🚀 Starting legal review of {folder_path}\n")

    # 主要 ReAct 迴圈
    for turn in range(1, max_turns + 1):
        print(f"{'='*60}")
        print(f"Turn {turn}/{max_turns}")
        print(f"{'='*60}\n")

        # 推理：詢問 LLM 下一步該做什麼
        response = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=4000,
            system=system_prompt,
            messages=conversation_history
        )

        assistant_message = response.content[0].text

        # 檢查代理是否完成
        if "<final_answer>" in assistant_message:
            final_answer = extract_between_tags(assistant_message, "final_answer")
            print("✅ COMPLETED\n")
            print(final_answer)
            return final_answer

        # 解析回應
        try:
            reasoning = extract_between_tags(assistant_message, "reasoning")
            action = extract_between_tags(assistant_message, "action")
            parameters = json.loads(extract_between_tags(assistant_message, "parameters"))
        except Exception as e:
            print(f"❌ Failed to parse LLM response: {e}")
            print(f"Response was: {assistant_message}")
            return None

        # 向使用者顯示推理
        print("🤔 REASONING:")
        print(f"   {reasoning}\n")

        # 行動：執行工具
        print(f"⚡ ACTION: {action}")
        print(f"   Parameters: {json.dumps(parameters, indent=2)}\n")

        observation = execute_tool(action, parameters)

        # 觀察：顯示結果
        print("👀 OBSERVATION:")
        print(f"   {observation}\n")

        # 加入對話歷史
        conversation_history.append({
            "role": "assistant",
            "content": assistant_message
        })
        conversation_history.append({
            "role": "user",
            "content": f"<observation>{observation}</observation>"
        })

    print("⚠️  Reached maximum turns without completion")
    return None


# 使用範例
if __name__ == "__main__":
    result = react_agent_loop(
        user_request="Review all legal documents and create summary",
        folder_path="/project/legal_docs"
    )
```

**你將獲得：**

- 約 200 行生產就緒程式碼
- 清楚的關注點分離（解析、工具、控制迴圈）
- 易於擴充新工具
- 每一步都有透明的推理

## 優化

### 1. 新增計劃階段

```python
# 在主迴圈前，要求代理計劃
planning_prompt = """Before starting, create a step-by-step plan.

Format:
<plan>
1. [Step 1]
2. [Step 2]
...
</plan>
"""

conversation_history.append({
    "role": "user",
    "content": user_request + "\n\n" + planning_prompt
})

# 獲取計劃
plan_response = call_llm(...)
plan = extract_between_tags(plan_response, "plan")

print(f"📋 Plan:\n{plan}\n")
input("Press Enter to execute...")

# 繼續正常 ReAct 迴圈
```

### 2. 新增簡單驗證

```python
def validate_output(action: str, parameters: dict, observation: str) -> bool:
    """工具結果的基本驗證"""

    if action == "write_file":
        path = parameters["path"]

        # 檢查檔案是否實際建立
        if not os.path.exists(path):
            print(f"⚠️  Validation failed: {path} not created")
            return False

        # 檢查最小內容長度
        if "LEGAL_NOTICES" in path:
            size = os.path.getsize(path)
            if size < 500:
                print(f"⚠️  Validation failed: {path} too small ({size} bytes)")
                return False

    return True

# 在主迴圈中，觀察後
if not validate_output(action, parameters, observation):
    conversation_history.append({
        "role": "user",
        "content": "<validation_failed>Output did not meet requirements. Please retry.</validation_failed>"
    })
    continue
```

### 3. 使用工具呼叫 API

不用解析 XML 標籤，使用 Anthropic 的原生工具呼叫：

```python
tools = [
    {
        "name": "read_file",
        "description": "Read a file from disk",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "File path"}
            },
            "required": ["path"]
        }
    },
    # ... 更多工具
]

response = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=4000,
    tools=tools,
    messages=conversation_history
)

# 處理工具呼叫
for content_block in response.content:
    if content_block.type == "tool_use":
        tool_name = content_block.name
        tool_input = content_block.input

        result = execute_tool(tool_name, tool_input)
        # ...
```

## 下一步

一旦你掌握了 ReAct 模式，可以考慮：

1. **新增驗證** - 檢查輸出是否符合要求
2. **新增重新計劃** - 優雅地處理失敗
3. **新增並行化** - 同時執行獨立步驟
4. **升級到生產模式** - 參閱 [計劃-執行-驗證](/ai-agent-study/zh-tw/plan-execute-verify/01-overview/)

## 相關資源

- [AI 代理案例研究](/ai-agent-study/zh-tw/blog/ai-agent-case-study/) - 法律審查使用案例
- [計劃-執行-驗證模式](/ai-agent-study/zh-tw/plan-execute-verify/01-overview/) - 生產級架構
- [ReAct 論文](https://arxiv.org/abs/2210.03629) - 原始研究
- [Anthropic 工具使用指南](https://docs.anthropic.com/en/docs/build-with-claude/tool-use)

## 結論

ReAct 模式非常適合學習 AI 代理的運作方式。它簡單、透明，並且可以讓你快速建構。然而，對於生產系統，你會需要[計劃-執行-驗證模式](/ai-agent-study/zh-tw/plan-execute-verify/01-overview/)的強健性。

從這裡開始，學習基礎知識，然後隨著需求的增長升級到更複雜的架構。
