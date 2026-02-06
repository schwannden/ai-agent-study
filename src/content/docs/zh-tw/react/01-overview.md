---
title: 'ReAct 模式：概覽'
description: '了解 ReAct（推理 + 行動）模式來建構 AI 代理 - 一種簡單、透明的代理控制流程方法'
---

## 什麼是 ReAct？

**ReAct**（推理 + 行動）是最簡單的 AI 代理架構。代理在**推理**下一步該做什麼、**採取行動**和**觀察**結果之間交替進行。

「ReAct」這個名稱結合了：

- **Re**asoning（推理）：模型思考該做什麼
- **Act**ing（行動）：模型執行工具或完成任務

## 核心概念

```mermaid
graph LR
    A[使用者請求] --> B[推理]
    B --> C{決策}
    C -->|使用工具| D[行動]
    C -->|任務完成| E[最終答案]
    D --> F[觀察]
    F --> B
```

## 控制流程

ReAct 模式遵循一個簡單的迴圈：

```mermaid
sequenceDiagram
    participant 使用者
    participant 代理
    participant 工具

    使用者->>代理: 初始請求

    loop 直到任務完成
        代理->>代理: 推理下一個行動

        alt 使用工具
            代理->>工具: 執行工具
            工具-->>代理: 工具結果
            代理->>代理: 觀察結果
        else 任務完成
            代理->>使用者: 最終答案
        end
    end
```

## 架構圖

```mermaid
graph TB
    subgraph AppLayer["應用層"]
        App[控制迴圈]
    end

    subgraph AgentLayer["代理層"]
        LLM[LLM]
        Memory[對話歷史]
    end

    subgraph ToolLayer["工具層"]
        T1[讀取檔案]
        T2[寫入檔案]
        T3[執行程式碼]
        T4[搜尋]
    end

    App --> LLM
    LLM --> App
    App --> T1
    App --> T2
    App --> T3
    App --> T4
    T1 --> Memory
    T2 --> Memory
    T3 --> Memory
    T4 --> Memory
    Memory --> LLM
```

## 範例：法律文件審查

以下是 ReAct 如何處理法律文件審查任務：

```mermaid
graph LR
    Start[開始任務] --> Reasoning[推理]
    Reasoning --> Action[行動]
    Action --> Observe[觀察]
    Observe --> Decision{任務<br/>完成?}
    Decision -->|否| Reasoning
    Decision -->|是| End[完成]
```

## 關鍵特性

### ✅ 優勢

- **簡單**：易於理解和實作（約 200-400 行程式碼）
- **透明**：每個步驟的推理都很清楚
- **可除錯**：可以準確追蹤代理做了什麼以及為什麼
- **靈活**：適用於任何支援工具呼叫的 LLM

### ⚠️ 限制

- **無品質檢查**：代理不驗證自己的工作
- **可能迴圈**：可能陷入重複行動
- **無計劃**：一次決定一個步驟
- **容易出錯**：無恢復機制

## 何時使用 ReAct

| ✅ 使用 ReAct 的時機...   | ❌ 避免使用 ReAct 的時機... |
| ------------------------- | --------------------------- |
| 建構原型或 MVP            | 生產系統需要可靠性          |
| 學習代理基礎              | 複雜的多步驟工作流程        |
| 簡單的線性任務（3-5 步）  | 需要品質保證                |
| 小型工具集（< 10 個工具） | 錯誤恢復至關重要            |
| 需要快速迭代              | 需要合規/稽核軌跡           |

## 訊息流程範例

以下是對話的樣子：

```mermaid
sequenceDiagram
    autonumber
    participant 使用者
    participant 代理
    participant 工具

    使用者->>代理: 審查 contract.pdf
    Note over 代理: 需要先讀取檔案
    代理->>工具: read_file
    工具-->>代理: 合約內容
    Note over 代理: 發現缺少條款
    代理->>工具: write_file FINDINGS
    工具-->>代理: 檔案已寫入
    Note over 代理: 任務完成
    代理->>使用者: 審查完成
```

## 與計劃-執行-驗證的比較

```mermaid
graph TB
    subgraph Simple["ReAct 簡單"]
        R1[推理] --> A1[行動]
        A1 --> O1[觀察]
        O1 --> R1
    end

    subgraph Robust["計劃-執行-驗證"]
        P[計劃] --> E[執行]
        E --> V[驗證]
        V -->|通過| Next[下一步]
        V -->|失敗| Retry[重試]
        Retry --> E
        Next --> E
    end
```

**主要差異**：ReAct 是單一迴圈，而計劃-執行-驗證將計劃、執行和驗證分成不同的階段。

## 最適合

- **學習**：非常適合理解代理概念
- **原型開發**：快速建構和迭代
- **簡單任務**：3-5 個步驟，明確的需求
- **展示**：易於解釋和視覺化

## 實作選項

繼續閱讀其中一個實作指南：

1. **[Claude SDK 實作](/ai-agent-study/zh-tw/react/02-claude-implementation/)** - 直接 API 整合（最高控制度）
2. **[模型無關設計](/ai-agent-study/zh-tw/react/03-model-agnostic/)** - 支援多個 LLM 供應商
3. **[LangChain 實作](/ai-agent-study/zh-tw/react/04-langchain/)** - 使用 LangChain 框架（最快開發速度）

## 下一步

- **代理新手？** → 從 [Claude SDK 實作](/ai-agent-study/zh-tw/react/02-claude-implementation/) 開始
- **需要靈活性？** → 閱讀 [模型無關設計](/ai-agent-study/zh-tw/react/03-model-agnostic/)
- **想要速度？** → 嘗試 [LangChain 實作](/ai-agent-study/zh-tw/react/04-langchain/)
- **準備投入生產？** → 探索 [計劃-執行-驗證模式](/ai-agent-study/zh-tw/plan-execute-verify/01-overview/)
