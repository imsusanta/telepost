# Contributing to TelePost

Thank you for your interest in contributing to **TelePost**! We welcome contributions, bug reports, and feature suggestions from everyone.

---

## 🛠️ Local Development Setup

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

## 📋 Guidelines

- Create focused feature branches (`git checkout -b feature/my-feature`).
- Follow established code styles and avoid adding unused dependencies.
- Ensure `npx tsc -b` and `npm run build` pass cleanly before submitting PRs.
