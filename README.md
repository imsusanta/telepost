<div align="center">

# 🚀 TelePost

**AI-Powered Telegram Automation, Smart Quiz Generation & Channel Management Platform**

[![CI Status](https://github.com/imsusanta/telepost/actions/workflows/ci.yml/badge.svg)](https://github.com/imsusanta/telepost/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Website](https://img.shields.io/badge/Website-telepost.tech-0284c7)](https://telepost.tech)

<!-- ![TelePost Dashboard Screenshot](docs/images/dashboard-preview.png) -->

</div>

---

## ✨ Features

- 🧠 **AI Quiz Generation**: Instant exam-grade MCQs (Bengali, Hindi, English) with Cloudflare Workers AI, OpenRouter, and Gemini.
- 📚 **Question Bank**: 8,500+ pre-classified exam questions with subjects, topics, and real-time filters.
- ⏰ **Automated Scheduling**: Smart cron-driven Telegram channel posting with zero skipped slots and catch-up mechanisms.
- 📢 **Instant Polls & Media Posts**: Dispatch single or batch Telegram polls, quizzes, and multimedia posts.
- 👥 **Student & Teacher Portals**: Manage batches, live classes, online mock tests, notices, and analytics.
- 💳 **Subscription & Monetization**: Automated Razorpay billing, coupon management, and multi-tier access controls.

---

## 🚀 Tech Stack

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, Radix UI, Lucide Icons
- **Backend & Database**: Supabase (PostgreSQL, Row Level Security, pg_cron, Database Functions)
- **Serverless Compute**: Supabase Deno Edge Functions
- **AI Infrastructure**: Cloudflare Workers AI (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`), OpenRouter, Google Gemini

---

## 🛠️ Getting Started

### Prerequisites
- **Node.js**: v18.0 or later (v20 Recommended)
- **npm**: v9.0 or later
- **Git**

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/imsusanta/telepost.git
   cd telepost
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   ```bash
   cp .env.example .env
   ```
   Fill in your Supabase credentials in `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID`

4. **Start Development Server:**
   ```bash
   npm run dev
   ```

5. **Build and Validate:**
   ```bash
   npx tsc -b
   npm run build
   ```

---

## 📖 Documentation

| Document | Purpose | Link |
|:---|:---|:---|
| 🗄️ Database Setup | Complete database schema & migrations | [COMPLETE_DATABASE_SETUP.md](COMPLETE_DATABASE_SETUP.md) |
| 💳 Subscriptions Setup | Razorpay billing & tier configurations | [SUBSCRIPTIONS_SETUP.md](SUBSCRIPTIONS_SETUP.md) |
| 🛡️ Super Admin Guide | Super Admin roles & permissions | [SUPER_ADMIN_SETUP.md](SUPER_ADMIN_SETUP.md) |
| 🔒 Security Policy | Security practices & disclosures | [SECURITY.md](SECURITY.md) |
| 🛠️ Contributing Guide | Setup and contribution guidelines | [CONTRIBUTING.md](CONTRIBUTING.md) |
| 📜 Code of Conduct | Community standards & pledge | [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) |
| ⚖️ License | MIT License details | [LICENSE](LICENSE) |

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) - Copyright © 2025 Susanta Lohar.
