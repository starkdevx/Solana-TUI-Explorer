# Solana TUI Explorer: Detailed Product Design & System Architecture
## Detailed Design Document & Build Process Guide

This document provides a comprehensive design overview covering the architecture, internal components, build process, and operation flows of the **Solana TUI Explorer** proof-of-concept.

---

## 1. System Architecture & Components

Solana TUI Explorer is structured as a client-first, terminal-native application built in Node.js. It interfaces with Solana RPC networks, watches local file systems for in-memory test execution dumps, and queries a cloud-based caching layer for optimizations.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Solana TUI Explorer                           │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                    Blessed Grid Layout Engine                  │   │
│   │       (Manages F1-F6 Views, Input modals, and Focus States)    │   │
│   └───────────────┬────────────────────────────────┬───────────────┘   │
└───────────────────┼────────────────────────────────┼───────────────────┘
                    │ WebSocket & RPC Calls          │ File System Watcher
                    ▼                                ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│       Network Communication Layer    │  │ Local Testbed Monitor Daemon │
│  (HTTP RPC / WSS connection streams) │  │  (LiteSVM / Local Validator) │
└─────────┬──────────────────┬─────────┘  └──────────────┬───────────────┘
          │                  │                           │
          ▼                  ▼                           ▼
┌──────────────────┐┌──────────────────┐  ┌──────────────────────────────┐
│ Solana Clusters  ││   Cloud Cache    │  │      Local Workspace         │
│ (Mainnet/Devnet) ││ (AWS EC2 + Redis)│  │ (litesvm-session.json / WSS) │
└──────────────────┘└──────────────────┘  └──────────────────────────────┘
```

The system is comprised of four modular layers:

### A. Terminal Presentation Layer (Blessed Layout Engine)
* **Framework**: Built on Node.js using the `blessed` and `blessed-contrib` libraries. 
* **State Management**: A central screen state controller manages the active tab (F1: Network, F2: Accounts, F3: Tokens, F5: Explorer, F6: LiteSVM).
* **Keyboard/Mouse Event Handlers**: Keyboard keypress listeners drive fast focus switching. For example, the `Tab` and `Arrow` keys move terminal focus between adjacent visual panels (e.g., from slot telemetry lists to live throughput charts), updating border highlights dynamically to maintain flow.
* **Component Widgets**: Renders dynamic layout grids, scrollable text areas (for transaction log inspects), table lists (for validator info), and line graphs (for throughput and latency).

### B. Network & Streaming Layer (Web3.js Integration)
* **Standard Queries**: Connects to Solana RPC clusters using HTTP queries (`@solana/web3.js`) to pull transactional records, parse account layouts, and verify block metadata.
* **Real-time Subscriptions**: Establishes full-duplex WebSocket connections (`WSS`) to subscribe to slot updates, block rate notifications, and real-time logs for indexed program addresses.
* **Latency Management**: Runs periodic ping-pong polls against RPC endpoints to update and display real-time cluster status and latency charts.

### C. Local Testbed Monitor Daemon
* **solana-test-validator Integration**: Establishes a local client listening to localhost port `8899`. It captures local slot progressions and parses local transactions.
* **LiteSVM Log Watcher**: In-memory Solana testing with LiteSVM doesn't persist data to an RPC node. To capture this state, the TUI implements a custom log watcher:
  1. A file system watcher (`fs.watch`) targets a local workspace file (default: `./litesvm-session.json`).
  2. As tests run, the custom LiteSVM logging harness writes transaction signatures, instruction logs, and balance mutations to this JSON file.
  3. The TUI watcher captures the write events, deserializes the JSON diff stream, and pushes the transaction records onto the F6 LiteSVM panel list.

### D. Cloud Caching Layer (AWS EC2 & Redis)
* **Purpose**: Running multiple raw on-chain queries (such as looking up SPL token metadata registries or fetching verified Anchor IDLs) can quickly rate-limit standard developer RPC connections.
* **Infrastructure**: An active proxy service hosted on an AWS EC2 instance.
* **Caching Database**: Uses a Redis cache to store hot, immutable account configurations, token statistics, and processed Anchor IDL schemas.
* **Workflow**: When a user queries an account, the TUI first checks the EC2 proxy server. If the requested program IDL or SPL token metadata is cached in Redis, it is returned instantly; otherwise, the proxy server fetches it from the chain, caches it in Redis for future requests, and returns it.

---

## 2. Product Design & How it Operates

The TUI Explorer runs as a low-latency command center. It operates through simple, predictable workflows:

### Workflow 1: Initializing the Session
1. The developer launches the TUI (typically via `npx solana-tui-explorer`).
2. The UI reads environment variables from `.env` to determine default network connection endpoints (Mainnet, Devnet, or Localhost).
3. The dashboard connects via WebSockets to stream slots and block latency, displaying them immediately on the F1 Network tab.

### Workflow 2: Inspecting an Account or Program ID
1. The developer presses `I` to open the search modal.
2. They paste a Public Key (e.g., `8dJC...ehi`).
3. The TUI detects the public key, requests the account data, and calls the EC2 proxy server to check for an associated Anchor IDL.
4. **Anchor IDL Visualizer & State Decoder**:
   * If an IDL is cached or fetched from the verified registry, the TUI parses the schema.
   * It maps the instructions, arguments, and account types.
   * It deserializes raw byte arrays in the account information pane into named JSON structures, mapping key-value fields (e.g. `tvl: 1000 USDC`, `owner: 9xQe...`) on F2.

### Workflow 3: LiteSVM In-Memory Test Tracking
1. The developer starts their Rust unit tests using a command like `cargo test`.
2. The test runner initiates an instance of `ExplorerLiteSVM`.
3. As transactions are executed, `ExplorerLiteSVM` serializes transaction logs and mutations to `litesvm-session.json`.
4. The TUI's file watcher intercepts the write, updates the left panel of the F6 tab with the transaction status, and formats the transaction's instruction logs on the right panel.
5. Even when the test runner finishes and the in-memory LiteSVM instance is deleted, the data remains populated on the TUI dashboard for inspection.

---

## 3. Detailed Build & Integration Process

To build and run the Solana TUI Explorer locally or integrate it into developer workflows, follow these structured steps:

### Phase 1: Setup and Directory Structure
The repository is split into three core folders:
1. `/cli`: The main TUI presentation package. Contains terminal layout configs, panel scripts (dashboard panels under `panels/`), and CLI packaging configs.
2. `/server`: The cloud caching proxy layer. Written in Node.js, it handles AWS EC2 deployment, handles routing, and communicates with Redis.
3. `/litesvm-integration`: The logging wrappers and helper files used by Rust integrations.

### Phase 2: Installing TUI Packages & Running Globally
```bash
# Clone the repository
git clone https://github.com/starkdevx/Solana-TUI-Explorer.git
cd Solana-TUI-Explorer

# Build and run the TUI
cd cli
npm install
node bin/st.js
```
To build and publish this as an executable CLI tool, pack the npm package with a standard binary mapping (`bin/st.js` configured with a shebang `#!/usr/bin/env node`), distributing it on npmjs registry so it can be invoked instantly globally via `npx solana-tui-explorer`.

### Phase 3: Building and Deploying the Caching Proxy
1. **Provision EC2**: Setup an Ubuntu Server instance on AWS EC2.
2. **Install Redis**: Install and bind Redis to localhost.
3. **Deploy Proxy Code**: Copy the `/server` directory to the EC2 instance, install dependencies (`express`, `redis`, `@solana/web3.js`), and run the server using a process manager like PM2:
   ```bash
   pm2 start server.js --name "tui-cache-proxy"
   ```
4. **Configure Client**: Point the TUI CLI client's configuration (`config.js`) to the public IP of the EC2 instance.

### Phase 4: Integrating with LiteSVM Rust Tests
To connect the in-memory test runner with the TUI, implement this logging pipeline:
1. Import `serde` and `serde_json` into your Solana project's `Cargo.toml`.
2. Add [litesvm_explorer.rs](file:///c:/Users/TIS/Documents/Akshay/Solana-TUI-Explorer/litesvm-integration/litesvm_explorer.rs) wrapper code into your testing workspace.
3. In your integration test file, wrap the standard `LiteSVM` initialization:
   ```rust
   // Initialize the custom wrapped test runner
   let mut svm = ExplorerLiteSVM::new(); // Instantiates LiteSVM and resets the watch file
   
   // Execution of transactions
   let result = svm.send_transaction(tx);
   ```
4. When tests execute, the log output is saved to `./litesvm-session.json` in the root workspace. The TUI's F6 session watcher dynamically monitors this file to refresh the dashboard.
