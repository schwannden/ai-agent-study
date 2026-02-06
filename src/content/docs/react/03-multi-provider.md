---
title: 'ReAct Pattern: Multi-Provider Implementation'
description: "Build ReAct agents that work across Claude, GPT, Gemini, or local models using LangChain's framework or manual abstraction patterns."
---

## Overview

This guide shows how to build ReAct agents that work seamlessly across multiple LLM providers (Claude, GPT, Gemini, local models) without rewriting your agent logic.

**Two Approaches:**

1. **LangChain (Recommended)** - Production-ready framework with built-in abstractions
2. **Manual Abstraction (Educational)** - Build your own to understand the internals

## Why Provider Abstraction Matters

**Without Abstraction:**

```python
# Locked to Claude
import anthropic
client = anthropic.Anthropic()
response = client.messages.create(model="claude-sonnet-4-5", ...)

# Want to switch to GPT? Rewrite everything!
import openai
client = openai.OpenAI()
response = client.chat.completions.create(model="gpt-4", ...)
```

**With Abstraction:**

```python
# Switch providers with one line
# llm = ChatAnthropic(model="claude-sonnet-4-5")
llm = ChatOpenAI(model="gpt-4-turbo")  # Just change this!

# Agent code stays the same
response = llm.invoke("Your prompt")
```

**Benefits:**

- **Vendor Independence** - Not locked to one provider
- **Cost Optimization** - Use cheaper models for simple tasks
- **Reliability** - Automatic fallback if one provider fails
- **A/B Testing** - Compare model performance easily

## Approach 1: LangChain (Recommended)

> **Latest**: LangChain 1.2.8 (2026) with [LangGraph](https://langchain-ai.github.io/langgraph/) for production agents

### Installation

```bash
pip install langchain==1.2.8 langchain-anthropic langchain-openai langchain-google-genai langchain-community
```

### Step 1: Understanding LangChain's Unified Interface

LangChain provides a standard interface across all providers:

```python
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_community.llms import Ollama

# All have the SAME interface
llm_claude = ChatAnthropic(model="claude-sonnet-4-5", temperature=0)
llm_gpt = ChatOpenAI(model="gpt-4-turbo", temperature=0)
llm_gemini = ChatGoogleGenerativeAI(model="gemini-1.5-pro", temperature=0)
llm_local = Ollama(model="mistral")

# Same method works for all
response_claude = llm_claude.invoke("Hello!")
response_gpt = llm_gpt.invoke("Hello!")
response_gemini = llm_gemini.invoke("Hello!")
```

**Key Insight**: Write once, run anywhere.

### Step 2: Define Tools Once

Use LangChain's `@tool` decorator to define tools that work with all providers:

```python
from langchain_core.tools import tool
import os

@tool
def read_file(path: str) -> str:
    """Read a file from disk.

    Args:
        path: The file path to read
    """
    try:
        with open(path, 'r') as f:
            content = f.read()
            return f"Success: {content[:1000]}..."
    except Exception as e:
        return f"Error: {str(e)}"

@tool
def write_file(path: str, content: str) -> str:
    """Write content to a file.

    Args:
        path: The file path to write
        content: The content to write
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
    """List files in a directory.

    Args:
        folder: The folder path
    """
    try:
        files = os.listdir(folder)
        docs = [f for f in files if f.endswith(('.pdf', '.txt', '.md'))]
        return f"Found {len(docs)} documents: {', '.join(docs)}"
    except Exception as e:
        return f"Error: {str(e)}"

# These tools work with ANY provider!
tools = [read_file, write_file, list_files]
```

**Tool Binding** - Attach tools to any LLM:

```python
claude_with_tools = llm_claude.bind_tools(tools)
gpt_with_tools = llm_gpt.bind_tools(tools)
gemini_with_tools = llm_gemini.bind_tools(tools)

# All work the same way!
```

### Step 3: Using create_react_agent (LangChain Classic)

The traditional approach using `AgentExecutor`:

```python
from langchain.agents import create_react_agent, AgentExecutor
from langchain_core.prompts import PromptTemplate

# Create ReAct prompt template
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

# Choose your provider (just change this line!)
llm = ChatAnthropic(model="claude-sonnet-4-5", temperature=0)
# llm = ChatOpenAI(model="gpt-4-turbo", temperature=0)
# llm = ChatGoogleGenerativeAI(model="gemini-1.5-pro", temperature=0)

# Create agent
agent = create_react_agent(
    llm=llm,
    tools=tools,
    prompt=react_prompt
)

# Create executor
agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    verbose=True,
    handle_parsing_errors=True,
    max_iterations=20
)

# Run!
result = agent_executor.invoke({
    "input": "Review all legal documents in /project/legal_docs and create LEGAL_NOTICES.md"
})

print(result["output"])
```

### Step 4: Custom ReAct Loop (More Control)

For fine-grained control, build your own loop:

```python
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, ToolMessage

class CustomReActAgent:
    """Custom ReAct agent with LangChain components"""

    def __init__(self, llm, tools: list):
        self.llm = llm
        self.tools = tools
        self.tool_map = {tool.name: tool for tool in tools}
        self.llm_with_tools = llm.bind_tools(tools)

    def run(self, user_request: str, max_iterations: int = 20) -> str:
        """Run the ReAct loop"""

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

            # Call LLM
            response = self.llm_with_tools.invoke(messages)

            # Check if done (no more tool calls)
            if not response.tool_calls:
                print("\n✅ COMPLETED")
                return response.content

            # Add AI response to history
            messages.append(response)

            # Execute tool calls
            for tool_call in response.tool_calls:
                tool_name = tool_call["name"]
                tool_args = tool_call["args"]

                print(f"\n⚡ Action: {tool_name}")
                print(f"   Args: {tool_args}")

                # Execute
                if tool_name in self.tool_map:
                    result = self.tool_map[tool_name].invoke(tool_args)
                else:
                    result = f"Error: Unknown tool {tool_name}"

                print(f"👀 Observation: {result[:200]}...")

                # Add tool result
                messages.append(ToolMessage(
                    content=str(result),
                    tool_call_id=tool_call["id"]
                ))

        return "Failed to complete within iteration limit"

# Usage - easily switch providers!
llm = ChatAnthropic(model="claude-sonnet-4-5", temperature=0)
# llm = ChatOpenAI(model="gpt-4-turbo", temperature=0)
# llm = ChatGoogleGenerativeAI(model="gemini-1.5-pro", temperature=0)

agent = CustomReActAgent(llm, tools)
result = agent.run("Review all legal documents in /project/legal_docs")
```

### Step 5: LangGraph (Production Recommended)

> **New in 2026**: [LangGraph](https://langchain-ai.github.io/langgraph/) is now the recommended framework for production agents

```python
# Modern approach with LangGraph
from langgraph.prebuilt import create_react_agent as create_agent_langgraph

# Choose provider
llm = ChatAnthropic(model="claude-sonnet-4-5")

# Create agent with LangGraph (better defaults, more robust)
agent = create_agent_langgraph(
    model=llm,
    tools=tools,
    # Built-in features:
    # - Automatic retry logic
    # - Error handling middleware
    # - State management
    # - Streaming support
)

# Run agent
result = agent.invoke({
    "messages": [HumanMessage(content="Review legal docs in /project/legal_docs")]
})

print(result["messages"][-1].content)
```

**LangGraph Benefits:**

- ✅ More robust error handling
- ✅ Better retry logic with exponential backoff
- ✅ Native streaming support
- ✅ Modular agent design
- ✅ Compatible with [MCP (Model Context Protocol)](https://modelcontextprotocol.io/)

## Approach 2: Manual Abstraction (Educational)

Understanding how to build abstraction from scratch helps you understand what LangChain does internally.

### Step 1: Standard Data Models

Define provider-agnostic data structures:

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
    """Standardized message format"""
    role: MessageRole
    content: str

@dataclass
class Tool:
    """Standardized tool definition"""
    name: str
    description: str
    parameters: Dict[str, Any]  # JSON Schema

@dataclass
class ToolCall:
    """Standardized tool call"""
    id: str
    name: str
    arguments: Dict[str, Any]

@dataclass
class LLMResponse:
    """Standardized LLM response"""
    content: str
    tool_calls: List[ToolCall]
    finish_reason: Literal["stop", "tool_calls", "length"]
    metadata: Dict[str, Any]  # Usage stats
```

### Step 2: Abstract Provider Interface

```python
from abc import ABC, abstractmethod

class LLMProvider(ABC):
    """Abstract base for all providers"""

    @abstractmethod
    def complete(self, messages: List[Message], tools: List[Tool]) -> LLMResponse:
        """Send request and get standardized response"""
        pass

    @abstractmethod
    def supports_native_tools(self) -> bool:
        """Does this provider support native tool calling?"""
        pass
```

### Step 3: Claude Adapter (Example)

```python
import anthropic

class ClaudeProvider(LLMProvider):
    """Adapter for Anthropic's Claude"""

    def __init__(self, api_key: str):
        self.client = anthropic.Anthropic(api_key=api_key)

    def complete(self, messages: List[Message], tools: List[Tool]) -> LLMResponse:
        """Convert to Claude format and back"""

        # Convert messages
        claude_messages = [
            {"role": m.role.value, "content": m.content}
            for m in messages if m.role != MessageRole.SYSTEM
        ]

        # Extract system
        system = "\n\n".join([
            m.content for m in messages if m.role == MessageRole.SYSTEM
        ]) or None

        # Convert tools
        claude_tools = [
            {
                "name": t.name,
                "description": t.description,
                "input_schema": t.parameters
            }
            for t in tools
        ] if tools else None

        # Call API
        response = self.client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=4000,
            system=system,
            messages=claude_messages,
            tools=claude_tools
        )

        # Convert response back to standard format
        content = ""
        tool_calls = []

        for block in response.content:
            if hasattr(block, 'text'):
                content += block.text
            elif block.type == "tool_use":
                tool_calls.append(ToolCall(
                    id=block.id,
                    name=block.name,
                    arguments=block.input
                ))

        return LLMResponse(
            content=content,
            tool_calls=tool_calls,
            finish_reason="tool_calls" if tool_calls else "stop",
            metadata={"usage": {
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens
            }}
        )

    def supports_native_tools(self) -> bool:
        return True
```

Similar adapters can be built for OpenAI, Gemini, and local models (see complete implementation below).

### Step 4: Provider-Agnostic Agent

```python
class AgnosticReActAgent:
    """ReAct agent that works with any provider"""

    def __init__(self, provider: LLMProvider):
        self.provider = provider

    def run(self, user_request: str) -> Optional[str]:
        """Run agent with any provider"""

        messages = [
            Message(MessageRole.SYSTEM, "You are a legal review assistant..."),
            Message(MessageRole.USER, user_request)
        ]

        tools = self._define_tools()

        for turn in range(20):
            # Call provider (abstracted!)
            response = self.provider.complete(messages, tools)

            if "<final_answer>" in response.content:
                return self._extract_final(response.content)

            # Execute tool calls
            for tool_call in response.tool_calls:
                result = self._execute_tool(tool_call.name, tool_call.arguments)
                messages.append(Message(MessageRole.USER, f"<observation>{result}</observation>"))

        return None
```

**Usage:**

```python
# Switch providers easily
# provider = ClaudeProvider(os.getenv("ANTHROPIC_API_KEY"))
# provider = OpenAIProvider(os.getenv("OPENAI_API_KEY"))
provider = GeminiProvider(os.getenv("GOOGLE_API_KEY"))

agent = AgnosticReActAgent(provider)
result = agent.run("Review legal docs")
```

## Provider Comparison Matrix

| Provider              | Native Tools | Speed     | Cost | Best For                      |
| --------------------- | ------------ | --------- | ---- | ----------------------------- |
| **Claude Sonnet 4.5** | ✅ Yes       | Fast      | $$   | General purpose, high quality |
| **Claude Opus 4.6**   | ✅ Yes       | Slow      | $$$$ | Complex reasoning, planning   |
| **Claude Haiku 4.5**  | ✅ Yes       | Very Fast | $    | Simple tasks, verification    |
| **GPT-4 Turbo**       | ✅ Yes       | Fast      | $$$  | General purpose               |
| **GPT-3.5 Turbo**     | ✅ Yes       | Very Fast | $    | Simple tasks                  |
| **Gemini 1.5 Pro**    | ✅ Yes       | Fast      | $$   | Multimodal, long context      |
| **Gemini 1.5 Flash**  | ✅ Yes       | Very Fast | $    | Fast inference                |
| **Mistral (Local)**   | ⚠️ Via XML   | Depends   | Free | Privacy, offline              |
| **Llama 3 (Local)**   | ⚠️ Via XML   | Depends   | Free | Privacy, offline              |

## Complete Implementations

### LangChain Implementation (Recommended)

See full working code in sources: [LangChain Agents Documentation](https://docs.langchain.com/oss/python/langchain/agents), [create_react_agent API Reference](https://python.langchain.com/api_reference/langchain/agents/langchain.agents.react.agent.create_react_agent.html)

### Manual Implementation

<details>
<summary>Click to expand complete manual abstraction code (~500 lines)</summary>

Full implementation includes:

- All adapter classes (Claude, OpenAI, Gemini, Local)
- Provider-agnostic agent
- Tool execution logic
- Error handling

See the model-agnostic archive for complete code or adapt the step-by-step examples above.

</details>

## Production Recommendations

### When to Use What

**Use LangChain/LangGraph when:**

- ✅ Building production applications
- ✅ Need robust error handling
- ✅ Want to switch providers easily
- ✅ Benefit from ecosystem (tools, memory, chains)
- ✅ Need rapid development

**Build Manual Abstraction when:**

- 🎓 Learning how agents work internally
- 🔧 Need very specific control
- ⚡ Performance is critical (minimal overhead)
- 🔒 Security requires avoiding dependencies

### Testing Across Providers

```python
import pytest

def test_agent_all_providers():
    """Verify agent works with all providers"""

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

### Cost Optimization Strategy

```python
def get_llm_for_task(complexity: str):
    """Choose model based on task complexity"""

    if complexity == "low":
        # Use cheapest option
        return ChatAnthropic(model="claude-haiku-4-5")
        # or ChatOpenAI(model="gpt-3.5-turbo")

    elif complexity == "medium":
        # Balance cost and quality
        return ChatAnthropic(model="claude-sonnet-4-5")
        # or ChatOpenAI(model="gpt-4-turbo")

    else:  # high
        # Use most capable
        return ChatAnthropic(model="claude-opus-4-6")
        # or ChatOpenAI(model="gpt-4")

# Usage
llm = get_llm_for_task("medium")
agent = CustomReActAgent(llm, tools)
```

## Key Takeaways

1. **LangChain provides abstraction for free** - Use it unless you have specific reasons not to
2. **Provider switching is trivial** - Change one line of code
3. **Test with multiple providers** - Behavior can differ subtly
4. **Local models need XML fallbacks** - Most don't support native tool calling
5. **LangGraph is the future** - Use it for new production agents

## Related Resources

- [LangChain Documentation](https://docs.langchain.com/oss/python/langchain/agents)
- [LangGraph Guide](https://langchain-ai.github.io/langgraph/)
- [LangChain v1.1.0 Release Notes](https://blog.langchain.com/langchain-langgraph-1dot0/)
- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)

## Next Steps

- **Start Simple**: Use LangChain's `create_react_agent` for quick prototypes
- **Go Production**: Migrate to LangGraph's `create_agent` for robust applications
- **Learn Internals**: Build manual abstraction to understand what LangChain does
- **Advanced Patterns**: Explore [Plan-Execute-Verify](/ai-agent-study/plan-execute-verify/01-overview/) for production systems
