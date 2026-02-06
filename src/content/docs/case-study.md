---
title: 'Case Study: Legal Document Review System'
description: 'Real-world example of building an AI agent for legal document review. Compare ReAct vs Plan-Execute-Verify patterns.'
---

## Overview

This case study demonstrates how to build an AI agent that can autonomously review legal documents, identify issues, and generate comprehensive reports. This serves as a practical example for understanding AI agent architectures and control loops.

## Use Case: Automated Legal Review

### Business Problem

Legal teams need to review multiple documents for:

- Missing or unclear clauses
- Compliance issues (GDPR, CCPA, etc.)
- Risk assessment
- Consistency and clarity

Manual review is time-consuming, expensive, and prone to human oversight.

### Solution: AI Agent Workflow

An AI agent that can:

1. **Scan** a folder of legal documents
2. **Review** each document for legal issues
3. **Categorize** findings by severity (critical/warning/info)
4. **Generate** a detailed LEGAL_NOTICES.md document
5. **Summarize** findings in an executive REVIEW_SUMMARY.md
6. **Track** progress and show users which step is executing

### Example Input/Output

**Input:**

```
/project/legal_docs/
├── contract_v1.pdf
├── terms_of_service.docx
└── privacy_policy.txt
```

**Output:**

```
/project/legal_docs/
├── contract_v1.pdf
├── terms_of_service.docx
├── privacy_policy.txt
├── LEGAL_NOTICES.md          # Detailed findings per document
└── REVIEW_SUMMARY.md          # Executive summary with status
```

**LEGAL_NOTICES.md excerpt:**

```markdown
## contract_v1.pdf

### ⚠️ CRITICAL Issues

**Missing Termination Clause**

- **Location:** Section 5 (Contract Duration)
- **Description:** No clear termination conditions or notice period specified
- **Impact:** Legal risk if either party wants to exit contract
- **Recommendation:** Add termination clause with 30-day notice period

### ⚡ Warnings

**Vague Payment Terms**

- **Location:** Section 3 (Payment)
- **Description:** Payment schedule states 'reasonable timeframe' without specific days
- **Recommendation:** Specify exact payment terms (e.g., Net 30)
```

**REVIEW_SUMMARY.md excerpt:**

```markdown
# Legal Review Summary

**Status: ⚠️ REQUIRES ATTENTION**

**Metrics:**

- Documents Reviewed: 3
- Critical Issues: 3
- Warnings: 4
- Info: 2

**Top Recommendations:**

1. Add termination clause to contract_v1.pdf immediately
2. Update terms_of_service.docx for GDPR compliance
3. Add DPO contact to privacy_policy.txt

**Overall Assessment:**
Documents require legal attention before execution. Critical issues must be addressed.
```

## Key Requirements

### Functional Requirements

1. **Document Processing**
   - Support multiple formats: PDF, DOCX, TXT, MD
   - Handle folders with mixed file types
   - Extract text content reliably

2. **Legal Analysis**
   - Check for missing critical clauses (termination, liability, payment)
   - Verify compliance with standards (GDPR, CCPA)
   - Identify vague or ambiguous language
   - Assess risk levels

3. **Output Generation**
   - Structured markdown reports
   - Clear severity categorization
   - Specific location references
   - Actionable recommendations

4. **User Experience**
   - Show progress (which step is running)
   - Display completed steps
   - Provide time estimates if possible
   - Allow interruption/cancellation

### Non-Functional Requirements

1. **Reliability**
   - Handle errors gracefully
   - Retry failed operations
   - Validate outputs

2. **Performance**
   - Process documents efficiently
   - Minimize API calls
   - Use appropriate model sizes

3. **Cost Efficiency**
   - Use smaller models where possible
   - Cache results
   - Avoid redundant processing

4. **Observability**
   - Log all actions
   - Track success/failure rates
   - Monitor costs

## Implementation Approaches

This case study can be implemented using two different patterns:

### 1. Simple ReAct Pattern

**Best for:** Quick prototypes, simple workflows, learning

- Single model makes all decisions
- One action at a time
- Immediate feedback loop
- Minimal architecture

**See:** [react-pattern.md](./react-pattern.md) for full implementation

**Pros:**

- Simple to implement
- Easy to debug
- Transparent execution

**Cons:**

- No quality checks
- Can get stuck in loops
- No recovery from errors
- Inefficient retries

### 2. Planner + Executor + Verifier Pattern

**Best for:** Production systems, complex workflows, reliability

- Separate models for planning, execution, verification
- Structured plans with acceptance criteria
- Multi-stage quality checks
- Intelligent retry and replanning

**See:** [plan-execute-verify.md](./plan-execute-verify.md) for full implementation

**Pros:**

- Robust error handling
- Quality assurance built-in
- Clear separation of concerns
- Production-ready

**Cons:**

- More complex architecture
- Higher initial development cost
- Requires more infrastructure

## Choosing the Right Pattern

| Criterion            | Use ReAct                | Use Plan-Execute-Verify         |
| -------------------- | ------------------------ | ------------------------------- |
| **Complexity**       | Simple, 3-5 steps        | Complex, 5+ steps               |
| **Quality Needs**    | Best effort OK           | Must be reliable                |
| **Error Handling**   | Manual intervention OK   | Must auto-recover               |
| **Cost Sensitivity** | Development cost matters | Operational reliability matters |
| **Timeline**         | MVP, prototype           | Production system               |
| **Team Experience**  | Learning AI agents       | Experienced team                |

## Success Metrics

### Functional Metrics

- **Coverage:** % of documents successfully reviewed
- **Accuracy:** % of issues correctly identified (vs human review)
- **Completeness:** % of known issue types detected
- **Precision:** % of flagged issues that are real (not false positives)

### Operational Metrics

- **Execution Time:** Time to review N documents
- **Success Rate:** % of runs that complete without errors
- **Retry Rate:** % of steps requiring retry
- **API Costs:** Cost per document reviewed

### User Experience Metrics

- **Time Saved:** Hours saved vs manual review
- **User Satisfaction:** Feedback on report quality
- **Trust:** % of findings accepted without verification

## Common Pitfalls

1. **Over-Engineering**
   - Don't use Plan-Execute-Verify for simple tasks
   - Start simple, add complexity only when needed

2. **Under-Specified Acceptance Criteria**
   - Vague criteria lead to verification failures
   - Make criteria measurable and specific

3. **Ignoring Error Cases**
   - Not all documents are well-formatted
   - Handle OCR errors, corrupt files, wrong formats

4. **Poor Progress Tracking**
   - Users get anxious without feedback
   - Show progress at every step

5. **Insufficient Verification**
   - Trust but verify - even AI makes mistakes
   - Use deterministic checks where possible

## Extension Ideas

1. **Comparative Analysis**
   - Compare multiple versions of same document
   - Track changes over time

2. **Template Compliance**
   - Check against company standard templates
   - Ensure required sections present

3. **Risk Scoring**
   - Quantitative risk assessment
   - Priority ranking for remediation

4. **Integration**
   - Connect to document management systems
   - Slack/email notifications
   - Jira ticket creation for issues

5. **Learning from Feedback**
   - Save user corrections
   - Fine-tune models on feedback
   - Build company-specific knowledge base

## Related Resources

- [ReAct Pattern Implementation](./react-pattern.md) - Simple agent pattern
- [Plan-Execute-Verify Pattern](./plan-execute-verify.md) - Production-grade pattern
- [Anthropic API Documentation](https://docs.anthropic.com/)
- [Claude Tool Use Guide](https://docs.anthropic.com/en/docs/build-with-claude/tool-use)

## Conclusion

This legal document review case study demonstrates core AI agent concepts:

- **Autonomy:** Agent operates without constant guidance
- **Tool Use:** Agent reads files, writes reports
- **Planning:** Agent breaks complex task into steps
- **Verification:** Agent validates its own work
- **Recovery:** Agent handles failures gracefully

These patterns apply to many domains beyond legal review: code review, content moderation, data analysis, report generation, and more.

Start with the [ReAct pattern](./react-pattern.md) to learn fundamentals, then graduate to [Plan-Execute-Verify](./plan-execute-verify.md) for production systems.
