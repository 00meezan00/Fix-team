#!/usr/bin/env bash
# ============================================================
# FIX TEAM — أمر البناء اللي Cloudflare Pages بيشغّله
# 🧸 بيجيب المترجم (TypeScript) وبعدين يشغّله → الموقع كله في dist/
# ============================================================
set -euo pipefail
npm install --no-audit --no-fund
npm run build
