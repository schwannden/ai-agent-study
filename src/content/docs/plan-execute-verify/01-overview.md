---
title: 'Plan-Execute-Verify: Overview'
description: 'Understand the Plan-Execute-Verify pattern for building production-grade AI agents with built-in quality assurance and error recovery'
---

## What is Plan-Execute-Verify?

**Plan-Execute-Verify (PEV)** is a production-grade AI agent architecture that separates concerns into three specialized phases:

1. **Plan**: Create a structured plan with acceptance criteria
2. **Execute**: Run each step independently
3. **Verify**: Check quality before proceeding

This separation enables robust error handling, quality assurance, and automatic recovery.

## Core Concept

```mermaid
graph TB
    Start[User Request] --> Plan[Planning Phase]
    Plan --> E1[Execute Step 1]
    E1 --> V1{Verify Step 1}
    V1 -->|Pass| E2[Execute Step 2]
    V1 -->|Fail| R1[Retry]
    R1 --> E1
    E2 --> V2{Verify Step 2}
    V2 -->|Pass| E3[Execute Step 3]
    V2 -->|Fail| R2[Retry]
    R2 --> E2
    E3 --> V3{Verify Step 3}
    V3 -->|Pass| Done[Complete]
    V3 -->|Fail| R3[Retry]
    R3 --> E3
```

## Control Flow

Unlike ReAct's simple loop, PEV has distinct phases with quality gates:

```mermaid
sequenceDiagram
    participant User
    participant Planner
    participant Executor
    participant Verifier
    participant Tools

    User->>Planner: Request task
    Planner->>Planner: Analyze requirements
    Planner->>Planner: Create structured plan
    Planner->>User: Present plan

    loop For each step in plan
        Planner->>Executor: Execute step N
        Executor->>Tools: Use tools
        Tools-->>Executor: Results
        Executor->>Verifier: Verify output

        alt Verification passes
            Verifier-->>Planner: Continue
        else Verification fails
            Verifier-->>Planner: Retry needed
            Planner->>Planner: Replan if needed
        end
    end

    Planner->>User: Final output
```

## Architecture Diagram

```mermaid
graph TB
    subgraph Control["Control Layer"]
        Controller[Agent Controller]
    end

    subgraph Components["Agent Components"]
        Planner[Planner LLM]
        Executor[Executor LLM]
        Verifier[Verifier LLM]
    end

    subgraph State["State Management"]
        Plan[Plan Store]
        Progress[Progress Tracker]
        Results[Results Cache]
    end

    subgraph Tools["Tools"]
        T1[Read File]
        T2[Write File]
        T3[Execute Code]
        T4[Search]
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

## Example: Legal Document Review

Here's how PEV handles the same legal document review task with quality gates:

```mermaid
graph LR
    Start[Plan Task] --> S1E[Step 1<br/>Execute]
    S1E --> S1V{Step 1<br/>Verify}
    S1V -->|Pass| S2E[Step 2<br/>Execute]
    S1V -->|Fail| S1E

    S2E --> S2V{Step 2<br/>Verify}
    S2V -->|Pass| S3E[Step 3<br/>Execute]
    S2V -->|Fail| S2E

    S3E --> S3V{Step 3<br/>Verify}
    S3V -->|Pass| Done[Complete]
    S3V -->|Fail| S3E
```

## State Machine View

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

## Key Characteristics

### OK Strengths

- **Robust**: Built-in error handling and recovery
- **Quality Assured**: Verification before proceeding
- **Transparent**: Clear plan with acceptance criteria
- **Production Ready**: Handles edge cases automatically
- **Deterministic**: Can audit every decision

### ⚠️ Trade-offs

- **More Complex**: ~1000-1500 lines vs ~400 for ReAct
- **Slower**: Multiple LLM calls per step
- **Higher Cost**: 3x API calls (Plan + Execute + Verify)
- **Overkill**: For simple linear tasks

## When to Use PEV

| OK Use PEV When...           | FAIL Avoid PEV When...      |
| ---------------------------- | --------------------------- |
| Production systems           | Quick prototypes/MVPs       |
| Quality is critical          | Simple 3-step tasks         |
| Complex workflows (5+ steps) | Learning agent basics       |
| Need audit trails            | Cost is primary concern     |
| Error recovery required      | Fast iteration needed       |
| Multi-stage verification     | Real-time response critical |

## Three-Agent Architecture

```mermaid
graph LR
    subgraph Agents["Specialized Agents"]
        A1[Planner]
        A2[Executor]
        A3[Verifier]
    end

    A1 -->|Plan| A2
    A2 -->|Result| A3
    A3 -->|Feedback| A1
```

**Why separate agents?**

- **Planner**: Optimized for strategic thinking (can use slower, smarter models)
- **Executor**: Optimized for fast tool execution (can use faster models)
- **Verifier**: Optimized for quality checks (can use different evaluation criteria)

## Message Flow Example

Here's a detailed interaction showing verification:

```mermaid
sequenceDiagram
    autonumber
    participant User
    participant Planner
    participant Executor
    participant Verifier
    participant Tools

    User->>Planner: Review contract.pdf

    Note over Planner: Create plan with criteria
    Planner->>User: Plan with 3 steps

    Planner->>Executor: Step 1 List files
    Executor->>Tools: list_files
    Tools-->>Executor: contract.pdf
    Executor->>Verifier: Verify completeness

    alt Files found
        Verifier-->>Planner: Continue
        Planner->>Executor: Step 2 Analyze doc
        Executor->>Tools: read_file
        Tools-->>Executor: Content
        Executor->>Tools: analyze
        Tools-->>Executor: Missing clause
        Executor->>Verifier: Verify analysis

        alt Analysis incomplete
            Verifier-->>Planner: Retry
            Planner->>Executor: Step 2 Retry with focus
            Executor->>Tools: analyze_detailed
            Tools-->>Executor: Complete analysis
            Executor->>Verifier: Verify again
            Verifier-->>Planner: Continue
        end
    end

    Planner->>Executor: Step 3 Write report
    Executor->>Tools: write_file
    Tools-->>Executor: Written
    Executor->>Verifier: Verify format
    Verifier-->>Planner: Complete
    Planner->>User: Review done
```

## Comparison with ReAct

```mermaid
graph TB
    subgraph Simple["ReAct Simple"]
        direction TB
        R1[Reason] --> A1[Act]
        A1 --> O1[Observe]
        O1 --> R1
        O1 -.-> S1[Stuck in loop]
    end

    subgraph Robust["Plan-Execute-Verify"]
        direction TB
        P[Plan with criteria] --> E[Execute step]
        E --> V{Verify}
        V -->|Pass| N[Next step]
        V -->|Fail| RE[Retry with feedback]
        RE --> E
        V -.-> RP[Replan]
        RP --> P
        N --> E
    end
```

## Cost-Benefit Analysis

```mermaid
graph LR
    subgraph ReactCosts["ReAct Costs"]
        RC1[Development Low]
        RC2[API Calls Low]
        RC3[Debugging High]
        RC4[Maintenance High]
    end

    subgraph PEVCosts["PEV Costs"]
        PC1[Development High]
        PC2[API Calls High]
        PC3[Debugging Low]
        PC4[Maintenance Low]
    end

    subgraph Tradeoff["Trade-off"]
        T[Pay upfront or pay later]
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

**PEV Philosophy**: Pay higher cost upfront (development + API calls) to reduce long-term costs (debugging + maintenance).

## Best For

- **Production Systems**: Customer-facing applications
- **Complex Workflows**: Multi-step, decision-heavy tasks
- **Quality Critical**: Legal, medical, financial domains
- **Auditability**: Need to explain every decision
- **Reliability**: Cannot afford agent failures

## Implementation Options

Continue to one of the implementation guides:

1. **[Claude SDK Implementation](/ai-agent-study/plan-execute-verify/02-claude-implementation/)** - Full production example
2. **[Model Agnostic Design](/ai-agent-study/plan-execute-verify/03-model-agnostic/)** - Multi-provider architecture
3. **[LangChain Implementation](/ai-agent-study/plan-execute-verify/04-langchain/)** - Framework-based approach

## Next Steps

- **New to PEV?** → Start with [Claude SDK Implementation](/ai-agent-study/plan-execute-verify/02-claude-implementation/)
- **Need flexibility?** → Read [Model Agnostic Design](/ai-agent-study/plan-execute-verify/03-model-agnostic/)
- **Want rapid development?** → Try [LangChain Implementation](/ai-agent-study/plan-execute-verify/04-langchain/)
- **Still learning?** → Go back to [ReAct Pattern](/ai-agent-study/react/01-overview/) for basics
