# Procurement Intelligence Agent

An AI-powered **Procurement automation platform** that helps organizations evaluate suppliers, route purchase approvals, discover procurement bottlenecks, and monitor operational performance.

The system combines **RAG, LLM-powered agents, LangGraph orchestration, deterministic policy routing, REST APIs, a React dashboard, SQLite, ChromaDB, and optional Slack notifications** into a department-focused procurement workflow.

---

## Overview

Procurement teams often spend significant time evaluating suppliers, checking approval policies, following up on purchase requests, and identifying recurring process bottlenecks.

This project automates key parts of that workflow through a multi-agent architecture:

1. **Supplier Scoring Agent** — evaluates suppliers across multiple procurement dimensions using retrieved knowledge-base context.
2. **Approval Routing Agent** — determines the required approval chain from deterministic procurement policy rules.
3. **Process Discovery Agent** — analyzes operational data to identify bottlenecks and improvement opportunities.
4. **Metrics & Reporting Agent** — aggregates procurement metrics and produces operational reports.
5. **Pilot Monitoring** — tracks team-level adoption, routing accuracy, scoring confidence, stakeholder feedback, and prompt versions.

The agents are coordinated using **LangGraph**, while FastAPI exposes the application through REST endpoints and React provides the user-facing dashboard.

---

## Live Demo

The **Procurement Intelligence Agent** is live and publicly accessible. Explore the deployed application to test its AI-powered supplier scoring, approval routing, process discovery, procurement analytics, and pilot management features.

**Live Application:** [https://procurement-intelligence-agent-eight.vercel.app](https://procurement-intelligence-agent-eight.vercel.app?utm_source=chatgpt.com)

---

## What It Does

### 1. Supplier Scoring

The Supplier Scoring Agent evaluates suppliers using retrieved procurement knowledge before generating a score.

It evaluates five dimensions:

- Reliability
- Compliance
- Cost
- Risk
- Fit

Each dimension receives a score from **1–10**.

A weighted composite score is calculated using:

| Dimension | Weight |
|---|---:|
| Reliability | 25% |
| Compliance | 25% |
| Cost | 20% |
| Risk | 20% |
| Fit | 10% |

The final supplier status is classified as:

- **Preferred** — composite ≥ 7.5
- **Conditional** — composite ≥ 6.0
- **Watch-list** — composite ≥ 4.0
- **Disqualified** — composite < 4.0

The result is persisted in SQLite together with the retrieved source references, prompt version, confidence value, and timestamp.

---

### 2. Approval Routing

The Approval Routing Agent determines who must approve a purchase request based on the procurement policy stored in SQLite.

The routing process considers:

- Purchase category
- Purchase value
- Currency
- Supplier
- Requester
- Applicable policy rule

The system returns:

- Approval chain
- SLA in hours
- Policy rule ID
- Whether the request represents a policy gap
- Escalation conditions where applicable

For example, an **$80,000 IT Hardware** request is routed to:

```text
IT MANAGER
      ↓
PROCUREMENT HEAD
```

with a **24-hour SLA**.

A higher-value IT Hardware request can require:

```text
IT MANAGER
      ↓
PROCUREMENT HEAD
      ↓
CEO
```

with dual approval and a longer SLA.

The approval chain is determined by the backend policy rules rather than hardcoded frontend output.

---

### 3. Process Discovery

The Process Discovery Agent analyzes procurement operational data such as:

- Audit events
- Supplier scores
- Approval decisions
- Feedback
- Metrics

It identifies potential process bottlenecks and produces prioritized backlog items.

Each finding contains information such as:

- Workflow
- Bottleneck
- Impact
- Effort
- Priority score
- Recommended action
- Status
- Discovery date

The backlog score is based on impact and inverse effort and is capped at **9**.

---

### 4. Metrics & Reporting

The Metrics & Reporting functionality aggregates operational data and provides:

- Requests processed
- Supplier scores
- Approval decisions
- Average cycle time
- Escalation rate
- Policy gaps
- Process findings
- Average scoring confidence
- Agent invocation information

The system can also generate a weekly procurement report containing prioritized process findings.

---

### 5. Pilot Monitoring

The application includes pilot-team monitoring for:

- Active users
- Purchase requests
- Routing accuracy
- Average scoring confidence
- Stakeholder satisfaction
- Open feedback
- Prompt version

The dashboard currently includes seeded pilot teams such as:

- `pilot-alpha`
- `pilot-beta`

Stakeholder feedback can be submitted directly from the dashboard.

---

# Architecture

```text
                         React Dashboard
                               |
                               v
                         FastAPI REST API
                               |
                               v
                      LangGraph Orchestrator
                               |
             +-----------------+------------------+
             |                 |                  |
             v                 v                  v
      Supplier Scoring   Approval Routing   Process Discovery
             |                 |                  |
             v                 v                  v
          ChromaDB          SQLite          Audit / Metrics
             |                 |
             +--------+--------+
                      |
                      v
                LLM / AI Layer
                      |
                      v
             Groq - GPT-OSS 120B

                      |
                      v
             Metrics & Reporting
                      |
                      v
                React Dashboard
                      |
                      v
              Optional Slack Alerts
```

### LangGraph Workflow

The main procurement request flow is:

```text
INTAKE
  ↓
SUPPLIER SCORING
  ↓
APPROVAL ROUTING
  ↓
COMPLETE
```

Other workflows can trigger:

```text
PROCESS DISCOVERY → COMPLETE

WEEKLY REPORT → COMPLETE
```

Agent transitions are recorded in the audit log.

A backend invariant ensures that an agent performs its scoring/routing/write operation only after the required retrieval step.

---

# Agent Architecture

| Agent | Trigger | Retrieval | Output |
|---|---|---|---|
| Supplier Scoring | New/existing supplier on purchase request | ChromaDB knowledge base | Dimension scores, composite, status |
| Approval Routing | Purchase request | SQLite policy rules | Approval chain, SLA, escalation |
| Process Discovery | Scheduled/on-demand | Audit logs, approvals, feedback, metrics | Prioritized process findings |
| Metrics & Reporting | After actions / weekly | Metrics and process backlog | Dashboard metrics and report |

---

# Technology Stack

### Backend

- Python
- FastAPI
- LangGraph
- SQLAlchemy
- SQLite
- Pydantic
- Uvicorn

### AI / LLM

- Groq API
- `openai/gpt-oss-120b`
- Prompt engineering
- Structured agent outputs

### RAG

- ChromaDB
- Sentence Transformers
- `all-MiniLM-L6-v2`
- Knowledge-base retrieval
- Source chunk tracking

### Frontend

- React
- Vite
- JavaScript
- Responsive dashboard UI

### Integrations

- Slack notifications
- REST APIs

### Development / Deployment

- Git
- GitHub
- Docker
- Docker Compose
- Render configuration

---

# LLM & RAG Pipeline

The application uses a retrieval-first workflow.

For supplier scoring:

```text
Supplier + Category
        ↓
Build Retrieval Query
        ↓
ChromaDB
        ↓
Retrieve Relevant Knowledge Chunks
        ↓
Construct LLM Prompt
        ↓
GPT-OSS 120B
        ↓
Structured Supplier Evaluation
        ↓
Weighted Composite Score
        ↓
Status Classification
        ↓
SQLite Persistence
        ↓
Audit Log
```

The supplier-scoring flow retrieves up to **10 relevant chunks** from the knowledge base.

The stored result includes the source chunks used for the evaluation.

---

# Knowledge Base

The project contains procurement knowledge in:

```text
data/knowledge_base/
├── supplier_performance.md
├── compliance_standards.md
└── pricing_benchmarks.md
```

These documents provide context for supplier evaluation.

The knowledge base can be extended with additional:

- Supplier performance data
- Compliance requirements
- Pricing benchmarks
- Procurement standards
- Category-specific information

---

# Prompt Library

Prompts are versioned and stored as part of the application.

Current prompt versions include:

```text
supplier-score-v1.0
approval-route-v1.0
process-discovery-v1.0
metrics-report-v1.0
```

Prompt versions are persisted with relevant agent outputs so that the system can maintain traceability between an output and the prompt configuration used to generate it.

---

# Database

The application uses **SQLite with SQLAlchemy** for persistent operational data.

The main database is:

```text
procurement.db
```

Important tables include:

```text
migration_log
policy_rules
purchase_requests
approval_decisions
supplier_scores
process_backlog
audit_log
metrics_aggregate
pilot_metrics
stakeholder_feedback
prompt_registry
```

### Supplier Score Persistence

Supplier evaluations store:

- Supplier name
- Request ID
- Reliability score
- Compliance score
- Cost score
- Risk score
- Fit score
- Composite score
- Status
- Source chunks
- Prompt version
- Confidence
- Scoring timestamp

---

# REST API

Base URL during local development:

```text
http://localhost:8000
```

FastAPI documentation:

```text
http://localhost:8000/docs
```

Health check:

```text
GET /health
```

### Procurement

```text
POST /procurement/request
GET  /procurement/request/{id}
```

Submit a purchase request and retrieve its routing/scoring status.

### Supplier Scoring

```text
POST /procurement/supplier/score
```

The supplier scoring endpoint accepts the request and performs scoring in the background.

Example request:

```json
{
  "supplier_name": "TechSupply Corp",
  "category": "IT Hardware",
  "pilot_team": "pilot-alpha"
}
```

### Process Discovery

```text
POST /procurement/process-discovery
```

Runs process discovery and generates prioritized process findings.

### Weekly Reporting

```text
POST /procurement/weekly-report
```

Generates the procurement weekly report.

### Metrics

```text
GET /metrics
GET /metrics/history
```

### Audit

```text
GET /audit-log
```

The audit endpoint can be filtered by agent.

Example:

```text
GET /audit-log?agent=supplier-scoring
```

### Pilot

```text
GET  /pilot
GET  /pilot/{team}/summary
POST /pilot/{team}/feedback
```

---

# Local Setup

## Requirements

Install:

- Python 3.11+
- Node.js 18+
- npm
- Git

A valid Groq API key is required for LLM-powered scoring and generation.

---

## 1. Clone the Repository

```bash
git clone <your-repository-url>
cd procurement-intelligence-agent
```

---

## 2. Install Backend Dependencies

```bash
pip install -r requirements.txt
```

---

## 3. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

---

## 4. Configure Environment Variables

Create the environment file:

```bash
cp .env.example .env
```

Configure:

```env
GROQ_API_KEY=gsk_...
GROQ_MODEL=openai/gpt-oss-120b
```

Optional Slack configuration can also be added if Slack notifications are required.

Do not commit `.env` or API keys to GitHub.

---

# Running the Application

## Start the Backend

From the project root:

```bash
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

Backend:

```text
http://localhost:8000
```

API documentation:

```text
http://localhost:8000/docs
```

---

## Start the Frontend

Open another terminal:

```bash
cd frontend
npm run dev
```

Dashboard:

```text
http://localhost:5173
```

---

# How to Test

The dashboard contains prefilled demonstration values so a tester can run the main workflows quickly while still being able to edit the inputs.

## 1. Supplier Scoring

Open:

```text
Supplier Scoring
```

Use:

```text
Supplier Name: TechSupply Corp
Category: IT Hardware
Pilot Team: pilot-alpha
```

Click:

```text
Score Supplier
```

The completed result should contain:

- Reliability score
- Compliance score
- Cost score
- Risk score
- Fit score
- Composite score
- Supplier status
- Confidence
- Source information

The exact score is generated from the current knowledge-base retrieval and LLM evaluation, so the numeric result should not be treated as a hardcoded expected value.

---

## 2. Approval Routing

Open:

```text
Approval Routing
```

Use:

```text
Requester: Engineering Team
Supplier: TechSupply Corp
Category: IT Hardware
Value: 80000
Currency: USD
Description: Purchase of 50 laptops for the engineering team
Pilot Team: pilot-alpha
```

Click:

```text
Submit & Route
```

For an $80,000 IT Hardware request, the applicable policy routes the request through:

```text
IT MANAGER
      ↓
PROCUREMENT HEAD
```

Expected SLA:

```text
24 hours
```

The request status may remain:

```text
PENDING
```

while waiting for the required approval action. This indicates that the request has been routed and is awaiting approval rather than that routing failed.

---

## 3. Test High-Value Approval Routing

Repeat the same IT Hardware request with:

```text
Value: 120000
```

The policy should require:

```text
IT MANAGER
      ↓
PROCUREMENT HEAD
      ↓
CEO
```

The rule also requires dual approval and a longer SLA.

This test demonstrates that approval routing changes dynamically according to policy and purchase value.

---

## 4. Process Discovery

Run supplier scoring and approval-routing activity first.

Then open:

```text
Process Backlog
```

Click:

```text
Run Discovery
```

The system analyzes the accumulated procurement activity and generates process findings.

Each finding includes:

- Workflow
- Bottleneck
- Score
- Effort
- Impact
- Recommended action
- Status

---

## 5. Weekly Report

From:

```text
Process Backlog
```

click:

```text
Weekly Report
```

The application generates a report based on current procurement metrics and process findings.

---

## 6. Pilot Status

Open:

```text
Pilot Status
```

Select:

```text
pilot-alpha
```

or:

```text
pilot-beta
```

Review:

- Active users
- Requests
- Routing accuracy
- Average scoring confidence
- Stakeholder satisfaction
- Open feedback
- Prompt version

Feedback can be submitted from the same page.

---

# Example End-to-End Workflow

A complete procurement flow can be demonstrated as:

```text
1. Supplier Scoring
        ↓
2. Purchase Request
        ↓
3. Policy-Based Approval Routing
        ↓
4. Audit / Metrics Collection
        ↓
5. Process Discovery
        ↓
6. Process Backlog
        ↓
7. Weekly Reporting
        ↓
8. Pilot Feedback
```

This demonstrates how the system moves from individual procurement actions to operational process improvement.

---

# Slack Notifications

Slack is an optional notification integration.

The application can support notifications for events such as:

- P1 escalations
- Supplier flags
- Process backlog alerts
- Weekly reports
- Pilot milestones

If Slack credentials are not configured, notification behavior can operate through the application's fallback/output mode.

A valid Slack token is required for actual Slack delivery.

---

# UI / UX

The frontend is designed as an enterprise procurement dashboard rather than a consumer-facing AI interface.

Main sections:

```text
Dashboard
Supplier Scoring
Approval Routing
Process Backlog
Pilot Status
```

The interface provides:

- Responsive layouts
- Procurement-oriented terminology
- Editable prefilled demonstration inputs
- Supplier evaluation results
- Prominent approval chains and SLA information
- Process backlog prioritization
- Pilot monitoring
- Operational metrics

The application separates AI-generated evaluation from deterministic procurement-policy decisions.

---

# Async Processing

Supplier scoring is designed as an asynchronous operation.

The API accepts the request and returns an accepted response while the scoring operation executes in the background.

This prevents a long-running LLM operation from unnecessarily blocking the API request.

The resulting evaluation is persisted to the database and can be retrieved by the application.

---

# Observability & Auditability

The system records operational events in the audit log.

Examples include:

```text
orchestrator transitions
supplier scoring
approval routing
agent execution
```

Audit records help track:

- Which agent performed an action
- What operation was performed
- Prompt version
- Result/status
- Execution metadata

This provides traceability for agentic workflows.

---

# Project Structure

```text
procurement-intelligence-agent/
│
├── backend/
│   ├── agents/
│   │   ├── base.py
│   │   ├── supplier_scoring.py
│   │   ├── approval_routing.py
│   │   ├── process_discovery.py
│   │   └── metrics_reporting.py
│   │
│   ├── rag/
│   ├── notifications/
│   ├── routers/
│   ├── migrations/
│   ├── models/
│   ├── schemas/
│   ├── config.py
│   └── main.py
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── SupplierPanel.jsx
│   │   │   ├── ApprovalPanel.jsx
│   │   │   ├── ProcessBacklog.jsx
│   │   │   └── PilotPanel.jsx
│   │   └── ...
│   ├── package.json
│   └── vite.config.*
│
├── data/
│   ├── knowledge_base/
│   │   ├── supplier_performance.md
│   │   ├── compliance_standards.md
│   │   └── pricing_benchmarks.md
│   └── seed/
│
├── benchmark/
│
├── tests/
│
├── .env.example
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
├── render.yaml
└── README.md
```

---

# Docker

The repository includes Docker configuration for containerized deployment.

Build the application:

```bash
docker build -t procurement-intelligence-agent .
```

If using Docker Compose:

```bash
docker compose up --build
```

The exact deployment configuration depends on the environment and the values provided through environment variables.

---

# Deployment

The repository contains deployment configuration for production-oriented hosting.

Before deployment:

1. Configure the production environment variables.
2. Add a valid `GROQ_API_KEY`.
3. Set:

```env
GROQ_MODEL=openai/gpt-oss-120b
```

4. Ensure the database/storage configuration is appropriate for the hosting environment.
5. Configure frontend/backend URLs if they differ from local development.
6. Configure Slack credentials only if Slack notifications are required.
7. Never expose API keys in frontend code or commit them to Git.

---

# Security Notes

- API keys must remain server-side.
- `.env` must not be committed.
- Procurement data should be protected according to the organization's security requirements.
- Authentication and authorization should be added before exposing sensitive procurement operations to untrusted users.
- Production deployments should use a production-grade database and appropriate secret management.
- Slack credentials should be stored as environment secrets.

---

# Key Design Principles

### Retrieval Before Generation

Agents retrieve relevant operational or policy context before producing decisions.

### Deterministic Policy Routing

Approval routing is based on explicit procurement rules rather than relying solely on an LLM to determine authorization.

### Agent Specialization

Each agent has a focused responsibility instead of using one general-purpose agent for every operation.

### Traceability

Agent operations, prompt versions, source chunks, and outputs are persisted for operational visibility.

### Human-in-the-Loop

Approval routing identifies the required human approval chain; the system does not replace the approval authority.

### Business-Oriented Agentic Automation

The project focuses on automating concrete procurement workflows rather than providing a generic chatbot.

---

# Use Case

This system can be used as an internal procurement operations platform for organizations that want to automate repetitive Source-to-Pay activities while retaining deterministic business rules and human approval checkpoints.

Potential extensions include:

- ERP integration
- Purchase-order generation
- Invoice matching
- Contract analysis
- Supplier onboarding
- Supplier risk monitoring
- Email-based approval workflows
- Authentication and role-based access control
- PostgreSQL deployment
- Advanced analytics
- Additional department-specific agents

---

# Summary

**Procurement Intelligence Agent** combines:

```text
Multi-Agent AI
      +
LangGraph
      +
RAG
      +
GPT-OSS 120B
      +
FastAPI
      +
React
      +
SQLite
      +
ChromaDB
      +
Policy Automation
      +
Operational Analytics
```

to create an end-to-end procurement intelligence workflow covering supplier evaluation, purchase approval routing, process discovery, reporting, and pilot monitoring.
