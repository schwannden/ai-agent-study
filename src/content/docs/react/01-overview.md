---
title: 'ReAct Pattern: Overview'
description: 'Understand the ReAct (Reasoning + Acting) pattern for building AI agents - a simple, transparent approach to agent control flow'
---

## What is ReAct?

**ReAct** (Reasoning + Acting) is the simplest AI agent architecture. The agent alternates between **reasoning** about what to do next, **taking an action**, and **observing** the result.

The name "ReAct" combines:

- **Re**asoning: The model thinks about what to do
- **Act**ing: The model executes a tool or completes the task

## Core Concept

```mermaid
graph LR
    A[User Request] --> B[Reasoning]
    B --> C{Decision}
    C -->|Use Tool| D[Action]
    C -->|Task Complete| E[Final Answer]
    D --> F[Observation]
    F --> B
```

## Control Flow

The ReAct pattern follows a simple loop:

```mermaid
sequenceDiagram
    participant User
    participant Agent
    participant Tools

    User->>Agent: Initial request

    loop Until task complete
        Agent->>Agent: Reason about next action

        alt Use a tool
            Agent->>Tools: Execute tool
            Tools-->>Agent: Tool result
            Agent->>Agent: Observe result
        else Task complete
            Agent->>User: Final answer
        end
    end
```

## Architecture Diagram

```mermaid
graph TB
    subgraph AppLayer["Application Layer"]
        App[Control Loop]
    end

    subgraph AgentLayer["Agent Layer"]
        LLM[LLM]
        Memory[Conversation History]
    end

    subgraph ToolLayer["Tool Layer"]
        T1[Read File]
        T2[Write File]
        T3[Execute Code]
        T4[Search]
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

## Example: Legal Document Review

Here's how ReAct handles a legal document review task:

```mermaid
graph LR
    Start[Start Task] --> Reasoning[Reasoning]
    Reasoning --> Action[Action]
    Action --> Observe[Observe]
    Observe --> Decision{Task<br/>Complete?}
    Decision -->|No| Reasoning
    Decision -->|Yes| End[Complete]
```

## Key Characteristics

### ✅ Strengths

- **Simple**: Easy to understand and implement (~200-400 lines)
- **Transparent**: Clear reasoning at each step
- **Debuggable**: Can trace exactly what the agent did and why
- **Flexible**: Works with any LLM that supports tool calling

### ⚠️ Limitations

- **No Quality Checks**: Agent doesn't verify its own work
- **Can Loop**: May get stuck repeating actions
- **No Planning**: Decides one step at a time
- **Error Prone**: No recovery mechanism

## When to Use ReAct

| ✅ Use ReAct When...             | ❌ Avoid ReAct When...              |
| -------------------------------- | ----------------------------------- |
| Building prototypes or MVPs      | Production systems need reliability |
| Learning agent fundamentals      | Complex multi-step workflows        |
| Simple, linear tasks (3-5 steps) | Quality assurance required          |
| Small tool sets (< 10 tools)     | Error recovery is critical          |
| Fast iteration needed            | Compliance/audit trails needed      |

## Message Flow Example

Here's what the conversation looks like:

```mermaid
sequenceDiagram
    autonumber
    participant User
    participant Agent
    participant Tools

    User->>Agent: Review contract.pdf
    Note over Agent: Need to read file first
    Agent->>Tools: read_file
    Tools-->>Agent: Contract contents
    Note over Agent: Found missing clause
    Agent->>Tools: write_file FINDINGS
    Tools-->>Agent: File written
    Note over Agent: Task complete
    Agent->>User: Review complete
```

## Comparison with Plan-Execute-Verify

```mermaid
graph TB
    subgraph Simple["ReAct Simple"]
        R1[Reason] --> A1[Act]
        A1 --> O1[Observe]
        O1 --> R1
    end

    subgraph Robust["Plan-Execute-Verify"]
        P[Plan] --> E[Execute]
        E --> V[Verify]
        V -->|Pass| Next[Next Step]
        V -->|Fail| Retry[Retry]
        Retry --> E
        Next --> E
    end
```

**Key Difference**: ReAct is a single loop, while Plan-Execute-Verify separates planning, execution, and verification into distinct phases.

## Best For

- **Learning**: Perfect for understanding agent concepts
- **Prototyping**: Quick to build and iterate
- **Simple Tasks**: 3-5 steps, clear requirements
- **Demos**: Easy to explain and visualize

## Implementation Options

Continue to one of the implementation guides:

1. **[Claude SDK Implementation](/ai-agent-study/react/02-claude-implementation/)** - Direct API integration (most control)
2. **[Model Agnostic Design](/ai-agent-study/react/03-model-agnostic/)** - Support multiple LLM providers
3. **[LangChain Implementation](/ai-agent-study/react/04-langchain/)** - Using LangChain framework (fastest development)

## Next Steps

- **New to agents?** → Start with [Claude SDK Implementation](/ai-agent-study/react/02-claude-implementation/)
- **Need flexibility?** → Read [Model Agnostic Design](/ai-agent-study/react/03-model-agnostic/)
- **Want speed?** → Try [LangChain Implementation](/ai-agent-study/react/04-langchain/)
- **Ready for production?** → Explore [Plan-Execute-Verify Pattern](/ai-agent-study/plan-execute-verify/01-overview/)
