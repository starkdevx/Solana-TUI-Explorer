# ⬡ Solana TUI Explorer (`sol-tui`)

[![npm version](https://img.shields.io/npm/v/solana-tui-explorer?color=00FF88&style=flat-square)](https://www.npmjs.com/package/solana-tui-explorer)
[![License: ISC](https://img.shields.io/badge/License-ISC-00FFFF.svg)](https://opensource.org/licenses/ISC)
[![Solana](https://img.shields.io/badge/Solana-Mainnet%20%7C%20Devnet%20%7C%20Localnet-purple)](https://solana.com)

> **The Ultimate Information Layer for the Solana Ecosystem inside a Beautifully Designed Terminal.**  
> *Never break context or switch tabs to Solscan, DexScreener, or RugCheck again while developing or debugging Anchor programs.*

---

## ⚡ Quick Start (Run Instantly via NPM)

No installation required! Run directly from your command line with `npx`:

```bash
# Launch using shortcut command alias:
npx sol-tui

# Or full name:
npx solana-tui-explorer
```

### Global Installation (Recommended for Daily Dev Use)

```bash
npm install -g solana-tui-explorer

# Now run anywhere in your workspace:
sol-tui
```

---

## 🛠️ Core Features & Key Map

The explorer is organized into six dedicated panels accessible via function keys **F1 through F6**:

* **F1 Network Gossip & Validator Map**: Live ASCII world radar mapping active validator node locations across the globe via gossip IP geolocation.
* **F2 Account & Wallet Insights**: Type auto-detection, token balance breakdown with real-time USD values, FairScale reputation scoring, and recent transaction history.
* **F3 Token Analytics & RugCheck**: Real-time spot prices, interactive candlestick charting (`5M`, `1H`, `1D`), RugCheck security audit (LP locking, warning flags, mintable/freezable checks), and DEX liquidity pools.
* **F4 Ask AI Debugger**: Powered by Groq Llama-3.3-70b, acting as an expert Solana systems developer and Anchor error code translator.
* **F5 Transaction Inspector**: Decodes instruction call hierarchies (including inner CPI invocations), balance delta auditor, compute unit profiler, and dry-run pre-flight simulator.
* **F6 LiteSVM Local Testing**: Intercepts and formats transactions executed during `cargo test` runs using our LiteSVM Rust wrapper.

---

## ⌨️ Global Keyboard Shortcuts

| Key | Action |
| --- | --- |
| `F1` – `F6` | Switch between panels (Network, Account, Token, Ask AI, Explorer, LiteSVM) |
| `I` | Open input modal (enter wallet address, token symbol/mint, signature, or AI prompt) |
| `R` | Force refresh active panel data |
| `T` | Toggle token candlestick chart timeframe (`5M`, `1H`, `1D`) |
| `↑` / `↓` or `J` / `K` | Scroll lists and detailed view panels |
| `TAB` / `←` / `→` | Switch pane focus inside split views |
| `ESC` / `Q` | Close active modal or exit application |

---

## 📄 License

Distributed under the **ISC License**.
