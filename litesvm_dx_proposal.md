# Design Proposal: Zero-Boilerplate LiteSVM Logging DX

To maximize developer experience (DX), we want to eliminate the need for copy-pasting wrappers (`litesvm_explorer.rs`) or refactoring test source code. The developer should simply write standard `litesvm` tests using `LiteSVM::new()` and have them logged automatically.

Here are the three primary strategies to achieve this, ranging from cargo dependency patching to automated code instrumentation.

---

## Strategy A: Temporary `Cargo.toml` Patching (Recommended)

This strategy wraps the `cargo test` command in a TUI helper or a CLI tool (e.g., `st test`). It intercepts `Cargo.toml` to swap the standard `litesvm` crate with a patched version during compilation.

### How it works
1. When the developer runs `st test` (or triggers tests via the TUI):
   - The tool backups `Cargo.toml`.
   - The tool appends a `[patch]` section to the `Cargo.toml`:
     ```toml
     [patch.crates-io]
     litesvm = { git = "https://github.com/solana-tui-explorer/litesvm-logger.git", branch = "main" }
     ```
   - The patched `litesvm` crate is identical to the official one, but contains a small hook inside its `send_transaction` method to write transaction details and logs to `litesvm-session.json`.
2. The tool runs `cargo test` on behalf of the developer.
3. Once the command completes (or if it crashes/exits), a `finally` block immediately restores the original `Cargo.toml`.

### Developer Workflow
- **Code**: Write standard LiteSVM tests:
  ```rust
  use litesvm::LiteSVM;
  let mut svm = LiteSVM::new();
  svm.send_transaction(tx).unwrap();
  ```
- **Execution**: Run `st test` instead of `cargo test`.
- **Result**: Zero boilerplate, zero code changes, automatic logging.

---

## Strategy B: Local Code Instrumentation CLI (`st init-litesvm`)

This strategy uses a CLI command to automatically refactor the local Rust project once, setting up the wrapper and renaming imports.

### How it works
- The developer runs `st init-litesvm`.
- The CLI automatically:
  1. Writes the wrapper file (`tests/litesvm_explorer.rs`) into their project.
  2. Scans all test files in the `tests/` and `src/` directories.
  3. Replaces `use litesvm::LiteSVM;` with:
     ```rust
     #[cfg(test)]
     use crate::tests::litesvm_explorer::ExplorerLiteSVM as LiteSVM;
     ```
     *(This renames our wrapper to `LiteSVM` so that the rest of their test code calling `LiteSVM::new()` remains untouched).*

### Developer Workflow
- **Code**: Write standard LiteSVM tests.
- **Execution**: Run standard `cargo test`.
- **Result**: One-time setup command, standard cargo commands continue to work natively.

---

## Strategy C: Procedural Macro Attribute (`#[litesvm_explorer::test]`)

This strategy uses a custom Rust macro crate to intercept the test compilation.

### How it works
- The developer adds `litesvm_explorer` to their `[dev-dependencies]` in `Cargo.toml`.
- In their tests, they replace the standard `#[test]` attribute with `#[litesvm_explorer::test]`.
- The procedural macro parses the test function body at compile-time:
  - It inserts the logging file setup.
  - It replaces all instances of `LiteSVM::new()` with `ExplorerLiteSVM::new()`.
  - It rewrites transaction execution calls to log metadata.

### Developer Workflow
- **Code**: Add macro attribute to tests:
  ```rust
  #[litesvm_explorer::test]
  fn test_my_program() {
      let mut svm = LiteSVM::new();
      ...
  }
  ```
- **Execution**: Run standard `cargo test`.
- **Result**: Standard Rust idiomatic approach, minimal macro annotation required.

---

## Recommendation & Next Steps

> [!TIP]
> **Strategy A (Temporary Patching)** offers the absolute best DX because it requires **zero** changes to the developer's source code and configuration files. 
> 
> We can implement a command `st test` inside the CLI that performs the `Cargo.toml` patch-run-restore sequence automatically.

### Feedback Request
Which strategy aligns best with your ideal workflow?
1. **Strategy A**: A wrapper test runner command (`st test`) that requires no code changes.
2. **Strategy B**: A one-time setup command (`st init-litesvm`) that refactors imports locally.
3. **Strategy C**: A procedural macro dependency approach.
