<div align="center">
  <img src="public/assets/landing_page.png" alt="Novaris" width="600" style="border-radius: 16px; margin-bottom: 24px;" />

  # Novaris
  
  **Agentic Intelligence for GitHub Repositories**

  <p align="center">
    <a href="https://github.com/singhankit001/novaris/stargazers"><img src="https://img.shields.io/github/stars/singhankit001/novaris?style=for-the-badge&color=eab308" alt="GitHub stars" /></a>
    <a href="https://github.com/singhankit001/novaris/network/members"><img src="https://img.shields.io/github/forks/singhankit001/novaris?style=for-the-badge&color=3b82f6" alt="GitHub forks" /></a>
    <a href="https://github.com/singhankit001/novaris/issues"><img src="https://img.shields.io/github/issues/singhankit001/novaris?style=for-the-badge&color=ef4444" alt="GitHub issues" /></a>
    <a href="https://github.com/singhankit001/novaris/blob/main/LICENSE"><img src="https://img.shields.io/github/license/singhankit001/novaris?style=for-the-badge&color=10b981" alt="License" /></a>
    <a href="https://github.com/singhankit001/novaris/pulls"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge" alt="PRs Welcome" /></a>
  </p>

  <p align="center">
    <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
    <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
    <img src="https://img.shields.io/badge/LangGraph-FF4F00?style=for-the-badge&logo=langchain&logoColor=white" alt="LangGraph" />
    <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  </p>

  **[Documentation](#) • [Live Demo](#) • [Report a Bug](#) • [Request Feature](#)**
</div>

---

## 👁️ Product Vision

### Why Repository Understanding is Broken
Modern software development moves at breakneck speed. Yet, when engineering leaders, technical recruiters, or investors need to evaluate a codebase or an engineer's public contributions, they are forced to manually sift through PRs, commit histories, and fragmented architecture documents. 

### The Problem with RAG
Traditional **Retrieval-Augmented Generation (RAG)** models fail at deep codebase comprehension. They treat code like text, embedding it into vector databases and retrieving fragmented snippets. They lack the context of how different microservices communicate, how architectural decisions evolve, and how developers actually collaborate.

### Enter Agentic Context-Augmented Generation (CAG)
**Novaris** revolutionizes repository analysis by using autonomous AI agents equipped with **Context-Augmented Generation (CAG)**. Instead of blindly retrieving code chunks, Novaris maps the repository logically, traces execution paths, identifies technical debt, and synthesizes deep engineering intelligence. 

Whether you are evaluating a technical co-founder, assessing a team's production readiness, or analyzing open-source impact, Novaris provides unparalleled, investor-grade insights instantly.

---

## 💻 Demo Showcase

<details>
<summary><b>Interactive Dashboard Demo</b></summary>
<br/>
<div align="center">
  <img src="public/assets/novaris_capabilities.png" alt="Novaris Dashboard" width="800" style="border-radius: 8px;" />
</div>
</details>

<details>
<summary><b>Repository Architecture Analysis</b></summary>
<br/>
<div align="center">
  <img src="public/assets/architecture_example.png" alt="Repository Analysis" width="800" style="border-radius: 8px;" />
</div>
</details>

<details>
<summary><b>Developer & Technical Depth Scoring</b></summary>
<br/>
<div align="center">
  <img src="public/assets/repo_profile.png" alt="Developer Analysis" width="800" style="border-radius: 8px;" />
</div>
</details>

---

## ✨ Key Features

| Feature | Description |
| :---: | :--- |
| 🧠 **Repository Intelligence** | Deep, context-aware comprehension of entire codebases, abstracting away noise to focus on core architecture. |
| 🧑‍💻 **Developer Intelligence** | Evaluates individual contributor impact, coding habits, PR quality, and long-term learning velocity. |
| 📊 **AI-Powered Insights** | Generates human-readable, executive-level summaries from tens of thousands of lines of code. |
| ⚙️ **Technical Scoring Engine** | Quantifies repository health, complexity, and readiness using 10+ proprietary engineering metrics. |
| 👑 **Engineering Leadership** | Detects code ownership, mentorship patterns, and architectural decision-making via commit history. |
| 🏗️ **Architecture Analysis** | Automatically visualizes and assesses system design, dependency trees, and microservice topologies. |
| 🌍 **Open Source Impact** | Evaluates the repository's reach, community engagement, and issue resolution lifecycle. |
| 🚀 **Founder Potential** | Assesses a developer's ability to ship end-to-end products, handle technical debt, and architect scalable systems. |
| 📈 **Learning Velocity** | Tracks how quickly a developer adopts new frameworks, languages, and modern engineering paradigms. |
| 🤖 **AI Readiness Assessment** | Determines how easily a codebase can be integrated with LLMs, Copilots, and modern AI tooling. |

---

## ⚙️ How Novaris Works

Novaris employs a state-of-the-art data pipeline to ingest, map, and analyze repositories before serving insights via our Interactive Dashboard.

```mermaid
graph TD
    A[Input Layer<br/>GitHub URL] -->|Repository Data| B(Repository Collection)
    A -->|User Profile| B
    B --> C{Context Engine}
    C -->|AST & Dependencies| D[Agent System]
    C -->|Git History| D
    D -->|Contextual Data| E(Scoring Engine)
    D -->|Architecture Map| F(Insight Generation)
    E --> G[Interactive Dashboard]
    F --> G
    
    style A fill:#000,stroke:#fff,stroke-width:2px,color:#fff
    style G fill:#22c55e,stroke:#fff,stroke-width:2px,color:#fff
    style D fill:#a855f7,stroke:#fff,stroke-width:2px,color:#fff
```

---

## 🔬 Agentic CAG Architecture

### Traditional RAG vs. Novaris Agentic CAG

| Metric | Traditional RAG | Novaris Agentic CAG |
| :--- | :--- | :--- |
| **Context Window** | Limited by chunk size (k-retrievals) | **Holistic**. Agents hold semantic maps of the entire repo. |
| **Understanding** | Lexical & basic semantic similarity | **Architectural**. Understands data flow and dependencies. |
| **Logic Tracing** | Poor. Fails across file boundaries | **Excellent**. Autonomous agents traverse imports natively. |
| **Temporal Analysis** | Non-existent | **Deep**. Analyzes git history, PR momentum, and velocity. |
| **Hallucination Rate**| High on complex architecture queries | **Near-Zero**. Anchored by deterministic AST parsing. |

---

## 📊 Technical Scoring System

Novaris utilizes a proprietary scoring matrix to evaluate repositories and engineers.

| Score / Metric | What it Measures | Target Audience |
| :--- | :--- | :--- |
| **Bus Factor** | Risk of project failure if key contributors leave. | Engineering Managers, Investors |
| **Complexity** | Cyclomatic complexity and dependency tangling. | Architects, DevOps |
| **Architecture Maturity**| Usage of design patterns, modularity, and SOLID principles. | Tech Leads, CTOs |
| **Production Readiness** | CI/CD pipelines, test coverage, error handling, and docs. | VCs, Hiring Managers |
| **Technical Depth** | Complexity of algorithms and domain-specific engineering. | Technical Recruiters |
| **Engineering Leadership**| PR reviews, issue triage, and architectural stewardship. | Founders, Recruiters |

---

## 🛠 Technology Stack

Novaris is built on a modern, highly scalable architecture tailored for AI workloads.

### Frontend
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

### Backend
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![LangGraph](https://img.shields.io/badge/LangGraph-FF4F00?style=for-the-badge&logo=langchain&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)

### Data & AI
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Neo4j](https://img.shields.io/badge/Neo4j-4581C3?style=for-the-badge&logo=neo4j&logoColor=white)
![Agentic AI](https://img.shields.io/badge/Agentic_AI-8A2BE2?style=for-the-badge)

---

## 🚀 Installation Guide

### Prerequisites
- Node.js (v18+)
- Python (3.10+)
- PostgreSQL Database
- Redis instance (optional, for caching)

### Environment Variables
Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_APP_URL="http://localhost:3000"
GITHUB_TOKEN="your_github_personal_access_token"
GEMINI_API_KEY="your_gemini_or_openai_api_key"
DATABASE_URL="postgresql://user:password@localhost:5432/novaris"
AUTH_SECRET="your_nextauth_secret"
```

### Local Setup
```bash
# Clone the repository
git clone https://github.com/singhankit001/novaris.git
cd novaris

# Install dependencies
npm install

# Push database schema
npx prisma db push

# Start the development server
npm run dev
```

### Docker Setup
```bash
# Build and run the containers
docker-compose up -d --build
```

---

## 📡 API Overview

Novaris provides a RESTful API for integrating repository intelligence into your own CI/CD pipelines or applicant tracking systems.

### Analyze Repository
**Endpoint:** `POST /api/v1/analyze/repo`

**Request Body:**
```json
{
  "repoUrl": "https://github.com/singhankit001/novaris",
  "depth": "comprehensive"
}
```

**Response:**
```json
{
  "status": "completed",
  "metrics": {
    "busFactor": 1.2,
    "productionReadiness": 92,
    "architectureMaturity": "Advanced"
  },
  "summary": "Highly modular codebase utilizing Next.js App Router and advanced Agentic AI paradigms..."
}
```

---

## 🗺️ Roadmap

- [x] **Agentic CAG Architecture Integration**
- [x] **Developer Technical Depth Scoring**
- [ ] **Multi-Repository Analysis** (Compare repos side-by-side)
- [ ] **Team Intelligence & Organization Analytics**
- [ ] **Investor-Grade PDF Reports**
- [ ] **Code Quality & Technical Debt Forecasting**
- [ ] **Engineering Risk Prediction Engine**

---

## 📸 Screenshots Section

> *Visualizing intelligence across the stack.*

| Architecture Visualization | Developer Insights |
|:---:|:---:|
| <img src="public/assets/architecture_example.png" width="400" /> | <img src="public/assets/repo_profile.png" width="400" /> |

| Security Reports | AI Chat Interface |
|:---:|:---:|
| <img src="public/assets/security_report.png" width="400" /> | <img src="public/assets/novaris_capabilities.png" width="400" /> |

---

## 🤝 Contributing

We welcome contributions from the community! To ensure a smooth process:
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes following Conventional Commits (`git commit -m 'feat(ai): add new scoring metric'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

Please read our [CONTRIBUTING.md](./CONTRIBUTING.md) for details on our code of conduct and development process.

---

## 🛡️ Security

We take security seriously. If you discover any security-related issues or vulnerabilities in Novaris, please do not open a public issue. Instead, email **singhankit91624@gmail.com** directly. All security vulnerabilities will be promptly addressed.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <br />
  <h3>Built for the next generation of engineering intelligence.</h3>
  <br />
  
  [![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](#)
  [![Documentation](https://img.shields.io/badge/Documentation-0052CC?style=for-the-badge&logo=confluence&logoColor=white)](#)
  [![Discord](https://img.shields.io/badge/Discord-7289DA?style=for-the-badge&logo=discord&logoColor=white)](#)
  
  <p align="center">
    <i>Novaris © 2026. All rights reserved.</i>
  </p>
</div>
