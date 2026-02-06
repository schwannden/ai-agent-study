---
title: 'ReAct Pattern: Claude SDK Implementation'
description: "Build a ReAct agent using Claude's Python SDK. Complete tutorial with ~400 lines of production-ready code."
---

## Overview

The ReAct (Reasoning + Acting) pattern is the simplest AI agent architecture. The agent alternates between reasoning about what to do next, taking an action, and observing the result.

**Best for:**

- Learning AI agent fundamentals
- Simple workflows (3-5 steps)
- Prototypes and MVPs
- Tasks with limited tool sets

**Not ideal for:**

- Production systems requiring reliability
- Complex multi-step workflows
- Tasks requiring quality assurance
- Error-prone operations

See [plan-execute-verify.md](/ai-agent-study/plan-execute-verify/01-overview/) for a more robust production pattern.

## ⚠️ Important: Learning vs Production

**This tutorial teaches ReAct fundamentals by building from scratch using the base Anthropic SDK.** This is excellent for:

- Understanding how AI agents work internally
- Learning the ReAct pattern mechanics
- Educational purposes and experimentation

**For production applications, use the [Claude Agent SDK](https://platform.claude.com/docs/en/agent-sdk/overview) instead:**

- ✅ Built-in tools (Read, Write, Edit, Bash, Glob, Grep, WebSearch, etc.)
- ✅ Automatic tool execution and session management
- ✅ Permission controls and sandboxing
- ✅ Hooks for validation and error handling
- ✅ Subagents for parallel execution
- ✅ Structured outputs and file checkpointing
- ✅ MCP (Model Context Protocol) server support

**When to use each:**

- **Manual ReAct (this guide)**: Learning, prototyping, custom research
- **Claude Agent SDK**: Production systems, robust applications, standard agent workflows

Continue reading to understand the fundamentals, then explore the Agent SDK for production use.

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Application Control Loop                       │
│                                                  │
│  while not done:                                 │
│    1. Send conversation to LLM                   │
│    2. Parse response (reasoning + action)        │
│    3. Execute action (tool call)                 │
│    4. Observe result                             │
│    5. Send observation back to LLM               │
│    6. Update UI                                  │
│    7. Repeat                                     │
└─────────────────────────────────────────────────┘
         │                            │
         ▼                            ▼
   ┌──────────┐              ┌────────────────┐
   │ LLM      │              │ Tools          │
   │ (Claude) │              │ - read_file    │
   │          │              │ - write_file   │
   └──────────┘              │ - list_files   │
                             └────────────────┘
```

## Building the Agent Step-by-Step

Let's build a ReAct agent incrementally, understanding each component before moving to the next.

### Step 1: Basic Setup

First, import dependencies and initialize the Anthropic client:

```python
import anthropic
import json
import os
from typing import List, Dict, Any

# Initialize the Claude client
client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
```

### Step 2: Design the System Prompt

The system prompt is critical - it defines what the agent can do and how it should respond:

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

**Key Design Decisions:**

- **Explicit format** - XML tags make parsing reliable
- **One action per turn** - Prevents agent from getting ahead of itself
- **Clear workflow** - Gives agent a mental model to follow
- **Structured output** - Easy for code to parse

### Step 3: Parse LLM Responses

We need a helper function to extract content from XML tags:

```python
import re

def extract_between_tags(text: str, tag: str) -> str:
    """Extract content between XML-style tags"""
    pattern = f"<{tag}>(.*?)</{tag}>"
    match = re.search(pattern, text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return ""

# Usage example:
# reasoning = extract_between_tags(response, "reasoning")
# action = extract_between_tags(response, "action")
```

### Step 4: Implement Tool Execution

> **Note**: The Claude Agent SDK provides these tools built-in (`Read`, `Write`, `Bash`, `Glob`, `Grep`, etc.) with proper sandboxing, permissions, and error handling. This manual implementation is for educational purposes to understand the internals.

Each tool performs a specific operation and returns an observation:

```python
def execute_tool(action: str, parameters: dict) -> str:
    """Execute a tool and return observation"""
    try:
        if action == "list_files":
            folder = parameters["folder"]
            files = os.listdir(folder)
            # Filter for document types only
            doc_files = [f for f in files if f.endswith(('.pdf', '.docx', '.txt', '.md'))]
            return json.dumps(doc_files)

        elif action == "read_file":
            path = parameters["path"]
            if not os.path.exists(path):
                return f"Error: File {path} not found"

            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()

            # Truncate if too long to save tokens
            if len(content) > 10000:
                content = content[:10000] + "\n\n[... truncated for length ...]"

            return f"File content ({len(content)} chars):\n{content}"

        elif action == "write_file":
            path = parameters["path"]
            content = parameters["content"]

            # Ensure directory exists
            os.makedirs(os.path.dirname(path) or ".", exist_ok=True)

            with open(path, 'w', encoding='utf-8') as f:
                f.write(content)

            return f"Successfully wrote {len(content)} characters to {path}"

        elif action == "mark_step_complete":
            step_name = parameters["step_name"]
            # In real app, this would update UI progress
            print(f"   ✓ Step completed: {step_name}")
            return f"Marked '{step_name}' as complete"

        else:
            return f"Error: Unknown action '{action}'"

    except Exception as e:
        return f"Error executing {action}: {str(e)}"
```

**Tool Design Tips:**

- Return descriptive observations (not just "success")
- Handle errors gracefully
- Keep tools simple and focused
- Truncate large outputs to save tokens

### Step 5: The ReAct Loop

Now we tie it all together with the main control loop:

```python
def react_agent_loop(user_request: str, folder_path: str, max_turns: int = 20):
    """Main ReAct control loop"""

    # Initialize conversation
    conversation_history = []
    conversation_history.append({
        "role": "user",
        "content": f"Please review all legal documents in: {folder_path}"
    })

    print(f"🚀 Starting legal review of {folder_path}\n")

    # Main loop: Reason → Act → Observe
    for turn in range(1, max_turns + 1):
        print(f"{'='*60}")
        print(f"Turn {turn}/{max_turns}")
        print(f"{'='*60}\n")

        # REASON: Ask Claude what to do next
        response = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=4000,
            system=system_prompt,
            messages=conversation_history
        )

        assistant_message = response.content[0].text

        # Check if agent is done
        if "<final_answer>" in assistant_message:
            final_answer = extract_between_tags(assistant_message, "final_answer")
            print("✅ COMPLETED\n")
            print(final_answer)
            return final_answer

        # Parse the response
        try:
            reasoning = extract_between_tags(assistant_message, "reasoning")
            action = extract_between_tags(assistant_message, "action")
            parameters = json.loads(extract_between_tags(assistant_message, "parameters"))
        except Exception as e:
            print(f"❌ Failed to parse LLM response: {e}")
            return None

        # Display reasoning to user
        print("🤔 REASONING:")
        print(f"   {reasoning}\n")

        # ACT: Execute the tool
        print(f"⚡ ACTION: {action}")
        print(f"   Parameters: {json.dumps(parameters, indent=2)}\n")

        observation = execute_tool(action, parameters)

        # OBSERVE: Show result
        print("👀 OBSERVATION:")
        print(f"   {observation}\n")

        # Add to conversation history for next turn
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

**Loop Mechanics:**

1. **Send messages** - Claude sees full conversation history
2. **Parse response** - Extract reasoning, action, and parameters
3. **Execute action** - Call the appropriate tool
4. **Return observation** - Send result back to Claude
5. **Repeat** - Continue until task is complete

### Example Execution Trace

Here's what a complete run looks like for our [legal review case study](/ai-agent-study/blog/ai-agent-case-study/):

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

## Progress Tracking

### Basic UI Progress State

```python
class ProgressTracker:
    """Track and display agent progress"""

    def __init__(self):
        self.steps = [
            {"name": "Scan documents", "status": "pending"},
            {"name": "Review documents", "status": "pending"},
            {"name": "Write legal notices", "status": "pending"},
            {"name": "Write summary", "status": "pending"}
        ]
        self.current_action = None

    def update_from_action(self, action: str, parameters: dict):
        """Update progress based on current action"""
        self.current_action = f"{action}: {parameters}"

        # Map actions to steps
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
        """Mark a step as complete"""
        self.set_step_status(step_name, "complete")
        self.render()

    def set_step_status(self, step_name: str, status: str):
        for step in self.steps:
            if step["name"] == step_name:
                step["status"] = status
                break

    def render(self):
        """Display progress to user"""
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


# Integrate into control loop
tracker = ProgressTracker()

# Before executing action
tracker.update_from_action(action, parameters)

# When step marked complete
if action == "mark_step_complete":
    tracker.mark_step_complete(parameters["step_name"])
```

## Error Handling

```python
def react_agent_loop_with_error_handling(user_request: str, folder_path: str):
    """ReAct loop with basic error handling"""

    max_consecutive_errors = 3
    consecutive_errors = 0

    for turn in range(1, 21):
        try:
            # ... (normal ReAct loop)

            # Reset error counter on success
            consecutive_errors = 0

        except Exception as e:
            consecutive_errors += 1
            print(f"❌ Error on turn {turn}: {e}")

            if consecutive_errors >= max_consecutive_errors:
                print("Too many consecutive errors, aborting")
                return None

            # Add error to conversation for LLM to handle
            conversation_history.append({
                "role": "user",
                "content": f"<error>Previous action failed: {str(e)}</error>"
            })

            continue
```

## Advantages

✅ **Simple to Implement**

- Minimal code (~200 lines)
- Easy to understand
- Quick to prototype

✅ **Transparent**

- See every decision
- Clear reasoning chain
- Easy to debug

✅ **Flexible**

- Works for many tasks
- Easy to add tools
- Natural conversation flow

## Limitations

❌ **No Quality Checks**

- Agent doesn't verify its own work
- Errors propagate to next steps
- No validation of outputs

❌ **Poor Error Recovery**

- Gets stuck if tool fails
- No replanning on failure
- Manual intervention often needed

❌ **Inefficient**

- No parallel execution
- Redundant reasoning
- Can loop unnecessarily

❌ **No Structured Planning**

- Ad-hoc decision making
- Hard to estimate completion time
- Difficult to track overall progress

## When to Use ReAct

✅ **Good Fit:**

- Learning AI agents
- Simple linear workflows
- Prototyping ideas
- Internal tools with human oversight
- Tasks with < 5 steps

❌ **Poor Fit:**

- Production systems
- Complex multi-branch workflows
- Tasks requiring reliability
- Quality-critical applications
- Expensive operations (deploy, delete)

## Complete Implementation

Here's the full working code combining all the concepts above:

```python
import anthropic
import json
import os
import re
from typing import List, Dict, Any


def extract_between_tags(text: str, tag: str) -> str:
    """Extract content between XML-style tags"""
    pattern = f"<{tag}>(.*?)</{tag}>"
    match = re.search(pattern, text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return ""


def execute_tool(action: str, parameters: dict) -> str:
    """
    Execute a tool and return observation

    This is where you implement your actual tool logic
    """
    try:
        if action == "list_files":
            folder = parameters["folder"]
            files = os.listdir(folder)
            # Filter for document types
            doc_files = [f for f in files if f.endswith(('.pdf', '.docx', '.txt', '.md'))]
            return json.dumps(doc_files)

        elif action == "read_file":
            path = parameters["path"]
            if not os.path.exists(path):
                return f"Error: File {path} not found"

            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()

            # Truncate if too long to save tokens
            if len(content) > 10000:
                content = content[:10000] + "\n\n[... truncated for length ...]"

            return f"File content ({len(content)} chars):\n{content}"

        elif action == "write_file":
            path = parameters["path"]
            content = parameters["content"]

            # Ensure directory exists
            os.makedirs(os.path.dirname(path) or ".", exist_ok=True)

            with open(path, 'w', encoding='utf-8') as f:
                f.write(content)

            return f"Successfully wrote {len(content)} characters to {path}"

        elif action == "mark_step_complete":
            step_name = parameters["step_name"]
            # In real app, this would update UI progress
            print(f"   ✓ Step completed: {step_name}")
            return f"Marked '{step_name}' as complete"

        else:
            return f"Error: Unknown action '{action}'"

    except Exception as e:
        return f"Error executing {action}: {str(e)}"


def react_agent_loop(user_request: str, folder_path: str, max_turns: int = 20):
    """
    Main ReAct control loop

    Args:
        user_request: User's high-level request
        folder_path: Working directory for the agent
        max_turns: Maximum reasoning-action cycles

    Returns:
        Final result or error
    """
    client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
    conversation_history = []

    # System prompt defines agent capabilities and format
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

    # Initial user message
    conversation_history.append({
        "role": "user",
        "content": f"Please review all legal documents in: {folder_path}"
    })

    print(f"🚀 Starting legal review of {folder_path}\n")

    # Main ReAct loop
    for turn in range(1, max_turns + 1):
        print(f"{'='*60}")
        print(f"Turn {turn}/{max_turns}")
        print(f"{'='*60}\n")

        # REASON: Ask LLM what to do next
        response = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=4000,
            system=system_prompt,
            messages=conversation_history
        )

        assistant_message = response.content[0].text

        # Check if agent is done
        if "<final_answer>" in assistant_message:
            final_answer = extract_between_tags(assistant_message, "final_answer")
            print("✅ COMPLETED\n")
            print(final_answer)
            return final_answer

        # Parse the response
        try:
            reasoning = extract_between_tags(assistant_message, "reasoning")
            action = extract_between_tags(assistant_message, "action")
            parameters = json.loads(extract_between_tags(assistant_message, "parameters"))
        except Exception as e:
            print(f"❌ Failed to parse LLM response: {e}")
            print(f"Response was: {assistant_message}")
            return None

        # Display reasoning to user
        print("🤔 REASONING:")
        print(f"   {reasoning}\n")

        # ACT: Execute the tool
        print(f"⚡ ACTION: {action}")
        print(f"   Parameters: {json.dumps(parameters, indent=2)}\n")

        observation = execute_tool(action, parameters)

        # OBSERVE: Show result
        print("👀 OBSERVATION:")
        print(f"   {observation}\n")

        # Add to conversation history
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


# Example usage
if __name__ == "__main__":
    result = react_agent_loop(
        user_request="Review all legal documents and create summary",
        folder_path="/project/legal_docs"
    )
```

**What You Get:**

- ~200 lines of production-ready code
- Clear separation of concerns (parsing, tools, control loop)
- Easy to extend with new tools
- Transparent reasoning at each step

## Optimizations

### 1. Add Planning Phase

```python
# Before main loop, ask agent to plan
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

# Get plan
plan_response = call_llm(...)
plan = extract_between_tags(plan_response, "plan")

print(f"📋 Plan:\n{plan}\n")
input("Press Enter to execute...")

# Continue with normal ReAct loop
```

### 2. Add Simple Validation

```python
def validate_output(action: str, parameters: dict, observation: str) -> bool:
    """Basic validation of tool results"""

    if action == "write_file":
        path = parameters["path"]

        # Check file was actually created
        if not os.path.exists(path):
            print(f"⚠️  Validation failed: {path} not created")
            return False

        # Check minimum content length
        if "LEGAL_NOTICES" in path:
            size = os.path.getsize(path)
            if size < 500:
                print(f"⚠️  Validation failed: {path} too small ({size} bytes)")
                return False

    return True

# In main loop, after observation
if not validate_output(action, parameters, observation):
    conversation_history.append({
        "role": "user",
        "content": "<validation_failed>Output did not meet requirements. Please retry.</validation_failed>"
    })
    continue
```

### 3. Upgrade to Claude Agent SDK

For production use, migrate to the Claude Agent SDK which provides all these capabilities built-in:

```python
from claude_agent_sdk import query, ClaudeAgentOptions
from claude_agent_sdk.types import HookMatcher

async def validate_output(input_data, tool_use_id, context):
    """Validation hook for tool outputs"""
    if input_data['tool_name'] == 'Write':
        path = input_data['tool_input'].get('file_path', '')
        if 'LEGAL_NOTICES' in path:
            # Add custom validation logic
            pass
    return {}

async def main():
    async for message in query(
        prompt="Review all legal documents in /project/legal_docs",
        options=ClaudeAgentOptions(
            allowed_tools=["Read", "Write", "Glob", "Grep"],
            permission_mode="acceptEdits",
            hooks={
                "PostToolUse": [HookMatcher(hooks=[validate_output])]
            },
            model="claude-sonnet-4-5"
        )
    ):
        print(message)
```

**Benefits over manual ReAct:**

- No need to implement `execute_tool()` - tools are built-in
- Automatic conversation management and session persistence
- Built-in error handling and retries
- Permission system with hooks for validation
- Sandbox mode for safe command execution
- Subagents for parallel task execution
- Structured outputs with JSON schema validation

See [Agent SDK documentation](https://platform.claude.com/docs/en/agent-sdk/overview) for complete details.

## Manual ReAct vs Claude Agent SDK

| Feature                 | Manual ReAct (This Guide) | Claude Agent SDK                   |
| ----------------------- | ------------------------- | ---------------------------------- |
| **Learning curve**      | Understand internals      | Higher-level abstraction           |
| **Tool implementation** | Manual (~200 lines)       | Built-in (Read, Write, Bash, etc.) |
| **Error handling**      | Manual try/catch          | Automatic with retries             |
| **Permissions**         | Manual validation         | Built-in with hooks                |
| **Session management**  | Manual history tracking   | Automatic with resumption          |
| **Progress tracking**   | Custom UI code            | Built-in with streaming            |
| **Validation**          | Manual checks             | Hooks (PreToolUse, PostToolUse)    |
| **Parallel execution**  | Not supported             | Subagents                          |
| **Sandboxing**          | Not available             | Built-in command sandbox           |
| **Production ready**    | No                        | Yes                                |
| **Setup time**          | ~400 lines of code        | ~20 lines of code                  |

**Recommendation**: Use manual ReAct for learning, Claude Agent SDK for production.

## Next Steps

**For Learning:**

1. Experiment with this manual implementation
2. Add custom tools for your use case
3. Try different prompt engineering approaches
4. Understand the ReAct loop mechanics thoroughly

**For Production:**

1. **Migrate to Claude Agent SDK** - Start with the [quickstart guide](https://platform.claude.com/docs/en/agent-sdk/quickstart)
2. **Use built-in hooks** - Add validation with `PreToolUse` and `PostToolUse` hooks
3. **Enable permissions** - Configure `permission_mode` for safety
4. **Add subagents** - Use specialized agents for complex tasks
5. **Consider Plan-Execute-Verify** - See our [production pattern guide](/ai-agent-study/plan-execute-verify/01-overview/)

## Related Resources

- [Claude Agent SDK Overview](https://platform.claude.com/docs/en/agent-sdk/overview) - Official production-ready agent framework
- [Claude Agent SDK Quickstart](https://platform.claude.com/docs/en/agent-sdk/quickstart) - Get started in minutes
- [AI Agent Case Study](/ai-agent-study/case-study/) - Legal review use case
- [Plan-Execute-Verify Pattern](/ai-agent-study/plan-execute-verify/01-overview/) - Production-grade architecture
- [ReAct Paper](https://arxiv.org/abs/2210.03629) - Original research
- [Anthropic Tool Use Guide](https://docs.anthropic.com/en/docs/build-with-claude/tool-use)

## Conclusion

The ReAct pattern is perfect for learning how AI agents work. It's simple, transparent, and gets you building quickly.

**This guide taught you the fundamentals by building from scratch.** Now you understand:

- How agents reason and act in loops
- How to parse LLM responses and execute tools
- How to manage conversation history
- The limitations of simple agent architectures

**For production systems**, use the [Claude Agent SDK](https://platform.claude.com/docs/en/agent-sdk/overview) which provides all these capabilities out-of-the-box with production-grade reliability, or consider the [Plan-Execute-Verify pattern](/ai-agent-study/plan-execute-verify/01-overview/) for complex workflows.

Start here, learn the fundamentals, then leverage the Agent SDK or graduate to more sophisticated architectures as your needs grow.
