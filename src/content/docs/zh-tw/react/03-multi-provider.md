---
title: 'ReAct 模式：多提供者實作'
description: '使用 LangChain 框架或手動抽象模式，建構可跨 Claude、GPT、Gemini 或本地模型無縫工作的 ReAct 代理。'
---

## 概覽

本指南展示如何建構可在多個 LLM 提供者（Claude、GPT、Gemini、本地模型）之間無縫工作的 ReAct 代理，而無需重寫代理邏輯。

**兩種方法：**

1. **LangChain（推薦）** - 具有內建抽象的生產就緒框架
2. **手動抽象（教學）** - 自己建構以理解內部運作

## 為什麼提供者抽象很重要

**沒有抽象：**

```python
# 鎖定到 Claude
import anthropic
client = anthropic.Anthropic()
response = client.messages.create(model="claude-sonnet-4-5", ...)

# 想切換到 GPT？重寫所有東西！
import openai
client = openai.OpenAI()
response = client.chat.completions.create(model="gpt-4", ...)
```

**有抽象：**

```python
# 一行切換提供者
# llm = ChatAnthropic(model="claude-sonnet-4-5")
llm = ChatOpenAI(model="gpt-4-turbo")  # 只改這行！

# 代理程式碼保持不變
response = llm.invoke("Your prompt")
```

**好處：**

- **供應商獨立** - 不鎖定到單一提供者
- **成本優化** - 簡單任務使用更便宜的模型
- **可靠性** - 如果一個提供者失敗自動備援
- **A/B 測試** - 輕鬆比較模型效能

## 方法 1：LangChain（推薦）

> **最新**: LangChain 1.2.8 (2026) 搭配 [LangGraph](https://langchain-ai.github.io/langgraph/) 用於生產代理

### 安裝

```bash
pip install langchain==1.2.8 langchain-anthropic langchain-openai langchain-google-genai langchain-community
```

### 步驟 1：理解 LangChain 的統一介面

LangChain 為所有提供者提供標準介面：

```python
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_community.llms import Ollama

# 全部都有相同的介面
llm_claude = ChatAnthropic(model="claude-sonnet-4-5", temperature=0)
llm_gpt = ChatOpenAI(model="gpt-4-turbo", temperature=0)
llm_gemini = ChatGoogleGenerativeAI(model="gemini-1.5-pro", temperature=0)
llm_local = Ollama(model="mistral")

# 相同的方法適用於所有提供者
response_claude = llm_claude.invoke("Hello!")
response_gpt = llm_gpt.invoke("Hello!")
response_gemini = llm_gemini.invoke("Hello!")
```

**關鍵見解**：寫一次，到處執行。

### 步驟 2：一次定義工具

使用 LangChain 的 `@tool` 裝飾器定義適用於所有提供者的工具：

```python
from langchain_core.tools import tool
import os

@tool
def read_file(path: str) -> str:
    """從磁碟讀取檔案。

    Args:
        path: 要讀取的檔案路徑
    """
    try:
        with open(path, 'r') as f:
            content = f.read()
            return f"Success: {content[:1000]}..."
    except Exception as e:
        return f"Error: {str(e)}"

@tool
def write_file(path: str, content: str) -> str:
    """將內容寫入檔案。

    Args:
        path: 要寫入的檔案路徑
        content: 要寫入的內容
    """
    try:
        os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
        with open(path, 'w') as f:
            f.write(content)
        return f"Success: Wrote to {path}"
    except Exception as e:
        return f"Error: {str(e)}"

@tool
def list_files(folder: str) -> str:
    """列出目錄中的檔案。

    Args:
        folder: 資料夾路徑
    """
    try:
        files = os.listdir(folder)
        docs = [f for f in files if f.endswith(('.pdf', '.txt', '.md'))]
        return f"Found {len(docs)} documents: {', '.join(docs)}"
    except Exception as e:
        return f"Error: {str(e)}"

# 這些工具適用於任何提供者！
tools = [read_file, write_file, list_files]
```

**工具綁定** - 將工具附加到任何 LLM：

```python
claude_with_tools = llm_claude.bind_tools(tools)
gpt_with_tools = llm_gpt.bind_tools(tools)
gemini_with_tools = llm_gemini.bind_tools(tools)

# 全部以相同方式運作！
```

### 步驟 3：使用 create_react_agent（LangChain 經典）

使用 `AgentExecutor` 的傳統方法：

```python
from langchain.agents import create_react_agent, AgentExecutor
from langchain_core.prompts import PromptTemplate

# 建立 ReAct 提示模板
react_prompt = PromptTemplate.from_template("""
You are a legal review assistant. Answer the following question as best you can.

You have access to the following tools:

{tools}

Use the following format:

Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [{tool_names}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question

Begin!

Question: {input}
Thought: {agent_scratchpad}
""")

# 選擇你的提供者（只改這行！）
llm = ChatAnthropic(model="claude-sonnet-4-5", temperature=0)
# llm = ChatOpenAI(model="gpt-4-turbo", temperature=0)
# llm = ChatGoogleGenerativeAI(model="gemini-1.5-pro", temperature=0)

# 建立代理
agent = create_react_agent(
    llm=llm,
    tools=tools,
    prompt=react_prompt
)

# 建立執行器
agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    verbose=True,
    handle_parsing_errors=True,
    max_iterations=20
)

# 執行！
result = agent_executor.invoke({
    "input": "Review all legal documents in /project/legal_docs and create LEGAL_NOTICES.md"
})

print(result["output"])
```

### 步驟 4：自訂 ReAct 迴圈（更多控制）

為了細粒度控制，建構你自己的迴圈：

```python
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, ToolMessage

class CustomReActAgent:
    """使用 LangChain 元件的自訂 ReAct 代理"""

    def __init__(self, llm, tools: list):
        self.llm = llm
        self.tools = tools
        self.tool_map = {tool.name: tool for tool in tools}
        self.llm_with_tools = llm.bind_tools(tools)

    def run(self, user_request: str, max_iterations: int = 20) -> str:
        """執行 ReAct 迴圈"""

        messages = [
            SystemMessage(content="""You are a legal review assistant.
Work step-by-step:
1. Scan documents in folder
2. Review each document
3. Create LEGAL_NOTICES.md with findings
4. Create REVIEW_SUMMARY.md with summary

When completely done, respond with your final summary (don't call more tools).
"""),
            HumanMessage(content=user_request)
        ]

        for iteration in range(1, max_iterations + 1):
            print(f"\n{'='*60}")
            print(f"Iteration {iteration}/{max_iterations}")
            print(f"{'='*60}")

            # 呼叫 LLM
            response = self.llm_with_tools.invoke(messages)

            # 檢查是否完成（沒有更多工具呼叫）
            if not response.tool_calls:
                print("\n✅ COMPLETED")
                return response.content

            # 將 AI 回應加入歷史
            messages.append(response)

            # 執行工具呼叫
            for tool_call in response.tool_calls:
                tool_name = tool_call["name"]
                tool_args = tool_call["args"]

                print(f"\n⚡ Action: {tool_name}")
                print(f"   Args: {tool_args}")

                # 執行
                if tool_name in self.tool_map:
                    result = self.tool_map[tool_name].invoke(tool_args)
                else:
                    result = f"Error: Unknown tool {tool_name}"

                print(f"👀 Observation: {result[:200]}...")

                # 加入工具結果
                messages.append(ToolMessage(
                    content=str(result),
                    tool_call_id=tool_call["id"]
                ))

        return "Failed to complete within iteration limit"

# 使用 - 輕鬆切換提供者！
llm = ChatAnthropic(model="claude-sonnet-4-5", temperature=0)
# llm = ChatOpenAI(model="gpt-4-turbo", temperature=0)
# llm = ChatGoogleGenerativeAI(model="gemini-1.5-pro", temperature=0)

agent = CustomReActAgent(llm, tools)
result = agent.run("Review all legal documents in /project/legal_docs")
```

### 步驟 5：LangGraph（生產推薦）

> **2026 新功能**: [LangGraph](https://langchain-ai.github.io/langgraph/) 現在是生產代理的推薦框架

```python
# 使用 LangGraph 的現代方法
from langgraph.prebuilt import create_react_agent as create_agent_langgraph

# 選擇提供者
llm = ChatAnthropic(model="claude-sonnet-4-5")

# 使用 LangGraph 建立代理（更好的預設值，更強健）
agent = create_agent_langgraph(
    model=llm,
    tools=tools,
    # 內建功能：
    # - 自動重試邏輯
    # - 錯誤處理中介軟體
    # - 狀態管理
    # - 串流支援
)

# 執行代理
result = agent.invoke({
    "messages": [HumanMessage(content="Review legal docs in /project/legal_docs")]
})

print(result["messages"][-1].content)
```

**LangGraph 優勢：**

- ✅ 更強健的錯誤處理
- ✅ 更好的指數退避重試邏輯
- ✅ 原生串流支援
- ✅ 模組化代理設計
- ✅ 相容於 [MCP（模型上下文協定）](https://modelcontextprotocol.io/)

## 方法 2：手動抽象（教學）

從頭開始理解如何建構抽象，有助於你理解 LangChain 內部做了什麼。

### 步驟 1：標準資料模型

定義與提供者無關的資料結構：

```python
from dataclasses import dataclass
from typing import List, Dict, Any, Optional, Literal
from enum import Enum

class MessageRole(Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"

@dataclass
class Message:
    """標準化訊息格式"""
    role: MessageRole
    content: str

@dataclass
class Tool:
    """標準化工具定義"""
    name: str
    description: str
    parameters: Dict[str, Any]  # JSON Schema

@dataclass
class ToolCall:
    """標準化工具呼叫"""
    id: str
    name: str
    arguments: Dict[str, Any]

@dataclass
class LLMResponse:
    """標準化 LLM 回應"""
    content: str
    tool_calls: List[ToolCall]
    finish_reason: Literal["stop", "tool_calls", "length"]
    metadata: Dict[str, Any]  # 使用統計
```

### 步驟 2：抽象提供者介面

```python
from abc import ABC, abstractmethod

class LLMProvider(ABC):
    """所有提供者的抽象基礎"""

    @abstractmethod
    def complete(self, messages: List[Message], tools: List[Tool]) -> LLMResponse:
        """傳送請求並取得標準化回應"""
        pass

    @abstractmethod
    def supports_native_tools(self) -> bool:
        """此提供者是否支援原生工具呼叫？"""
        pass
```

詳細的手動實作（包含 Claude、OpenAI、Gemini 和本地模型的適配器）請參見完整文件或從上述逐步範例改編。

## 提供者比較矩陣

| 提供者                | 原生工具    | 速度   | 成本 | 最適合           |
| --------------------- | ----------- | ------ | ---- | ---------------- |
| **Claude Sonnet 4.5** | ✅ 是       | 快     | $$   | 通用，高品質     |
| **Claude Opus 4.6**   | ✅ 是       | 慢     | $$$$ | 複雜推理，規劃   |
| **Claude Haiku 4.5**  | ✅ 是       | 非常快 | $    | 簡單任務，驗證   |
| **GPT-4 Turbo**       | ✅ 是       | 快     | $$$  | 通用             |
| **GPT-3.5 Turbo**     | ✅ 是       | 非常快 | $    | 簡單任務         |
| **Gemini 1.5 Pro**    | ✅ 是       | 快     | $$   | 多模態，長上下文 |
| **Gemini 1.5 Flash**  | ✅ 是       | 非常快 | $    | 快速推理         |
| **Mistral（本地）**   | ⚠️ 透過 XML | 取決於 | 免費 | 隱私，離線       |
| **Llama 3（本地）**   | ⚠️ 透過 XML | 取決於 | 免費 | 隱私，離線       |

## 生產建議

### 何時使用什麼

**使用 LangChain/LangGraph 當：**

- ✅ 建構生產應用程式
- ✅ 需要強健的錯誤處理
- ✅ 想輕鬆切換提供者
- ✅ 從生態系統受益（工具、記憶體、鏈）
- ✅ 需要快速開發

**建構手動抽象當：**

- 🎓 學習代理如何在內部運作
- 🔧 需要非常具體的控制
- ⚡ 效能至關重要（最小開銷）
- 🔒 安全性需要避免依賴

### 跨提供者測試

```python
import pytest

def test_agent_all_providers():
    """驗證代理適用於所有提供者"""

    providers = {
        "claude": ChatAnthropic(model="claude-sonnet-4-5"),
        "gpt": ChatOpenAI(model="gpt-4-turbo"),
        "gemini": ChatGoogleGenerativeAI(model="gemini-1.5-pro"),
    }

    for name, llm in providers.items():
        print(f"\nTesting with {name}...")

        agent = CustomReActAgent(llm, tools)
        result = agent.run("List files in /test")

        assert result is not None, f"{name} failed"
        print(f"✅ {name} passed")
```

### 成本優化策略

```python
def get_llm_for_task(complexity: str):
    """根據任務複雜度選擇模型"""

    if complexity == "low":
        # 使用最便宜的選項
        return ChatAnthropic(model="claude-haiku-4-5")
        # or ChatOpenAI(model="gpt-3.5-turbo")

    elif complexity == "medium":
        # 平衡成本和品質
        return ChatAnthropic(model="claude-sonnet-4-5")
        # or ChatOpenAI(model="gpt-4-turbo")

    else:  # high
        # 使用最有能力的
        return ChatAnthropic(model="claude-opus-4-6")
        # or ChatOpenAI(model="gpt-4")

# 使用
llm = get_llm_for_task("medium")
agent = CustomReActAgent(llm, tools)
```

## 關鍵要點

1. **LangChain 免費提供抽象** - 除非你有特定原因，否則使用它
2. **提供者切換很簡單** - 改變一行程式碼
3. **使用多個提供者測試** - 行為可能有細微差異
4. **本地模型需要 XML 備援** - 大多數不支援原生工具呼叫
5. **LangGraph 是未來** - 用於新的生產代理

## 相關資源

- [LangChain 文件](https://docs.langchain.com/oss/python/langchain/agents)
- [LangGraph 指南](https://langchain-ai.github.io/langgraph/)
- [LangChain v1.1.0 發布說明](https://blog.langchain.com/langchain-langgraph-1dot0/)
- [模型上下文協定（MCP）](https://modelcontextprotocol.io/)

## 下一步

- **從簡單開始**：使用 LangChain 的 `create_react_agent` 進行快速原型開發
- **進入生產**：遷移到 LangGraph 的 `create_agent` 以獲得強健的應用程式
- **學習內部原理**：建構手動抽象以理解 LangChain 的作用
- **進階模式**：探索[計劃-執行-驗證](/ai-agent-study/zh-tw/plan-execute-verify/01-overview/)以獲得生產系統
