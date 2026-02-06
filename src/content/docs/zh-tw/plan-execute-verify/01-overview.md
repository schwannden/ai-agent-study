---
title: '計劃-執行-驗證：概覽'
description: '了解計劃-執行-驗證模式，用於建構具有內建品質保證和錯誤恢復的生產級 AI 代理'
---

## 什麼是計劃-執行-驗證？

**計劃-執行-驗證（Plan-Execute-Verify, PEV）**是一種生產級的 AI 代理架構，將關注點分離為三個專門的階段：

1. **計劃（Plan）**：建立結構化計劃並設定驗收標準
2. **執行（Execute）**：獨立執行每個步驟
3. **驗證（Verify）**：在繼續之前檢查品質

這種分離使得能夠實現強健的錯誤處理、品質保證和自動恢復。

## 核心概念

```mermaid
graph TB
    Start[使用者請求] --> Plan[計劃階段]
    Plan --> E1[執行步驟 1]
    E1 --> V1{驗證步驟 1}
    V1 -->|通過| E2[執行步驟 2]
    V1 -->|失敗| R1[重試]
    R1 --> E1
    E2 --> V2{驗證步驟 2}
    V2 -->|通過| E3[執行步驟 3]
    V2 -->|失敗| R2[重試]
    R2 --> E2
    E3 --> V3{驗證步驟 3}
    V3 -->|通過| Done[完成]
    V3 -->|失敗| R3[重試]
    R3 --> E3
```

## 控制流程

與 ReAct 的簡單迴圈不同，PEV 具有不同的階段和品質閘門：

```mermaid
sequenceDiagram
    participant User as 使用者
    participant Planner as 規劃器
    participant Executor as 執行器
    participant Verifier as 驗證器
    participant Tools as 工具

    User->>Planner: 請求任務
    Planner->>Planner: 分析需求
    Planner->>Planner: 建立結構化計劃
    Planner->>User: 呈現計劃

    loop 計劃中的每個步驟
        Planner->>Executor: 執行步驟 N
        Executor->>Tools: 使用工具
        Tools-->>Executor: 結果
        Executor->>Verifier: 驗證輸出

        alt 驗證通過
            Verifier-->>Planner: 繼續
        else 驗證失敗
            Verifier-->>Planner: 需要重試
            Planner->>Planner: 如需要則重新規劃
        end
    end

    Planner->>User: 最終輸出
```

## 架構圖

```mermaid
graph TB
    subgraph Control["控制層"]
        Controller[代理控制器]
    end

    subgraph Components["代理元件"]
        Planner[規劃器 LLM]
        Executor[執行器 LLM]
        Verifier[驗證器 LLM]
    end

    subgraph State["狀態管理"]
        Plan[計劃儲存]
        Progress[進度追蹤器]
        Results[結果快取]
    end

    subgraph Tools["工具"]
        T1[讀取檔案]
        T2[寫入檔案]
        T3[執行程式碼]
        T4[搜尋]
    end

    Controller --> Planner
    Planner --> Plan
    Controller --> Plan
    Controller --> Executor
    Executor --> T1
    Executor --> T2
    Executor --> T3
    Executor --> T4
    Executor --> Results
    Controller --> Verifier
    Verifier --> Results
    Verifier --> Progress
    Progress --> Controller
```

## 範例：法律文件審查

以下展示 PEV 如何處理具有品質閘門的法律文件審查任務：

```mermaid
graph LR
    Start[規劃任務] --> S1E[步驟 1<br/>執行]
    S1E --> S1V{步驟 1<br/>驗證}
    S1V -->|通過| S2E[步驟 2<br/>執行]
    S1V -->|失敗| S1E

    S2E --> S2V{步驟 2<br/>驗證}
    S2V -->|通過| S3E[步驟 3<br/>執行]
    S2V -->|失敗| S2E

    S3E --> S3V{步驟 3<br/>驗證}
    S3V -->|通過| Done[完成]
    S3V -->|失敗| S3E
```

## 狀態機視圖

```mermaid
stateDiagram-v2
    [*] --> PLANNING
    PLANNING --> EXECUTING
    EXECUTING --> VERIFYING
    VERIFYING --> EXECUTING
    VERIFYING --> REPLANNING
    REPLANNING --> EXECUTING
    VERIFYING --> COMPLETED
    COMPLETED --> [*]
```

## 主要特性

### OK 優勢

- **強健**：內建錯誤處理和恢復
- **品質保證**：在繼續之前進行驗證
- **透明**：清晰的計劃並設有驗收標準
- **生產就緒**：自動處理邊界情況
- **可確定性**：可以稽核每個決策

### ⚠️ 權衡

- **更複雜**：約 1000-1500 行程式碼，相比 ReAct 的約 400 行
- **較慢**：每個步驟需要多次 LLM 呼叫
- **成本更高**：3 倍 API 呼叫（計劃 + 執行 + 驗證）
- **過度設計**：對於簡單的線性任務

## 何時使用 PEV

| OK 使用 PEV 的情況...     | FAIL 避免使用 PEV 的情況... |
| ------------------------- | --------------------------- |
| 生產系統                  | 快速原型/MVP                |
| 品質至關重要              | 簡單的 3 步驟任務           |
| 複雜的工作流程（5+ 步驟） | 學習代理基礎                |
| 需要稽核追蹤              | 成本是主要考量              |
| 需要錯誤恢復              | 需要快速迭代                |
| 多階段驗證                | 即時回應至關重要            |

## 三代理架構

```mermaid
graph LR
    subgraph Agents["專門代理"]
        A1[規劃器]
        A2[執行器]
        A3[驗證器]
    end

    A1 -->|計劃| A2
    A2 -->|結果| A3
    A3 -->|回饋| A1
```

**為什麼要分離代理？**

- **規劃器**：針對策略思考進行優化（可以使用較慢但更聰明的模型）
- **執行器**：針對快速工具執行進行優化（可以使用更快的模型）
- **驗證器**：針對品質檢查進行優化（可以使用不同的評估標準）

## 訊息流程範例

以下是顯示驗證的詳細互動：

```mermaid
sequenceDiagram
    autonumber
    participant User as 使用者
    participant Planner as 規劃器
    participant Executor as 執行器
    participant Verifier as 驗證器
    participant Tools as 工具

    User->>Planner: 審查 contract.pdf

    Note over Planner: 建立帶有標準的計劃
    Planner->>User: 包含 3 個步驟的計劃

    Planner->>Executor: 步驟 1 列出檔案
    Executor->>Tools: list_files
    Tools-->>Executor: contract.pdf
    Executor->>Verifier: 驗證完整性

    alt 找到檔案
        Verifier-->>Planner: 繼續
        Planner->>Executor: 步驟 2 分析文件
        Executor->>Tools: read_file
        Tools-->>Executor: 內容
        Executor->>Tools: analyze
        Tools-->>Executor: 缺少條款
        Executor->>Verifier: 驗證分析

        alt 分析不完整
            Verifier-->>Planner: 重試
            Planner->>Executor: 步驟 2 重點重試
            Executor->>Tools: analyze_detailed
            Tools-->>Executor: 完整分析
            Executor->>Verifier: 再次驗證
            Verifier-->>Planner: 繼續
        end
    end

    Planner->>Executor: 步驟 3 撰寫報告
    Executor->>Tools: write_file
    Tools-->>Executor: 已寫入
    Executor->>Verifier: 驗證格式
    Verifier-->>Planner: 完成
    Planner->>User: 審查完成
```

## 與 ReAct 的比較

```mermaid
graph TB
    subgraph Simple["ReAct 簡單"]
        direction TB
        R1[推理] --> A1[行動]
        A1 --> O1[觀察]
        O1 --> R1
        O1 -.-> S1[陷入迴圈]
    end

    subgraph Robust["計劃-執行-驗證"]
        direction TB
        P[帶標準的計劃] --> E[執行步驟]
        E --> V{驗證}
        V -->|通過| N[下一步驟]
        V -->|失敗| RE[帶回饋重試]
        RE --> E
        V -.-> RP[重新規劃]
        RP --> P
        N --> E
    end
```

## 成本效益分析

```mermaid
graph LR
    subgraph ReactCosts["ReAct 成本"]
        RC1[開發成本低]
        RC2[API 呼叫成本低]
        RC3[除錯成本高]
        RC4[維護成本高]
    end

    subgraph PEVCosts["PEV 成本"]
        PC1[開發成本高]
        PC2[API 呼叫成本高]
        PC3[除錯成本低]
        PC4[維護成本低]
    end

    subgraph Tradeoff["權衡"]
        T[前期付費或後期付費]
    end

    RC1 --> T
    RC2 --> T
    RC3 --> T
    RC4 --> T
    PC1 --> T
    PC2 --> T
    PC3 --> T
    PC4 --> T
```

**PEV 哲學**：支付更高的前期成本（開發 + API 呼叫）以降低長期成本（除錯 + 維護）。

## 最適合的場景

- **生產系統**：面向客戶的應用程式
- **複雜工作流程**：多步驟、決策密集的任務
- **品質關鍵**：法律、醫療、金融領域
- **可稽核性**：需要解釋每個決策
- **可靠性**：無法承受代理失敗

## 實作選項

繼續閱讀其中一個實作指南：

1. **[Claude SDK 實作](/ai-agent-study/zh-tw/plan-execute-verify/02-claude-implementation/)** - 完整的生產範例
2. **[模型無關設計](/ai-agent-study/zh-tw/plan-execute-verify/03-model-agnostic/)** - 多提供商架構
3. **[LangChain 實作](/ai-agent-study/zh-tw/plan-execute-verify/04-langchain/)** - 基於框架的方法

## 下一步

- **剛接觸 PEV？** → 從 [Claude SDK 實作](/ai-agent-study/zh-tw/plan-execute-verify/02-claude-implementation/) 開始
- **需要靈活性？** → 閱讀 [模型無關設計](/ai-agent-study/zh-tw/plan-execute-verify/03-model-agnostic/)
- **想要快速開發？** → 嘗試 [LangChain 實作](/ai-agent-study/zh-tw/plan-execute-verify/04-langchain/)
- **還在學習？** → 回到 [ReAct 模式](/ai-agent-study/zh-tw/react/01-overview/) 學習基礎
