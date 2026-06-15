use litesvm::LiteSVM;
use solana_sdk::transaction::Transaction;
use std::fs::OpenOptions;
use std::io::Write;
use serde_json::json;
use std::ops::{Deref, DerefMut};

pub struct ExplorerLiteSVM {
    pub svm: LiteSVM,
    session_file: String,
}

impl ExplorerLiteSVM {
    /// Creates a new instance of ExplorerLiteSVM, wrapping LiteSVM, and
    /// resets the local TUI transaction log session file.
    pub fn new() -> Self {
        let session_file = "litesvm-session.json".to_string();
        // Clear previous session transactions at test start
        let _ = std::fs::remove_file(&session_file);
        Self {
            svm: LiteSVM::new(),
            session_file,
        }
    }

    /// Sends a transaction through the embedded LiteSVM runtime and
    /// appends the results and program logs to the TUI session log file.
    pub fn send_transaction(
        &mut self,
        tx: Transaction,
    ) -> Result<litesvm::types::TransactionMetadata, litesvm::types::FailedTransactionMetadata> {
        let sig = tx.signatures.get(0).cloned().unwrap_or_default();
        let result = self.svm.send_transaction(tx);

        let tx_data = match &result {
            Ok(meta) => {
                json!({
                    "signature": sig.to_string(),
                    "status": "Success",
                    "logs": meta.logs,
                    "compute_units": meta.compute_units_consumed,
                    "error": null,
                    "timestamp": std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_secs(),
                })
            }
            Err(fail_meta) => {
                json!({
                    "signature": sig.to_string(),
                    "status": "Failed",
                    "logs": fail_meta.meta.logs,
                    "compute_units": fail_meta.meta.compute_units_consumed,
                    "error": format!("{:?}", fail_meta.err),
                    "timestamp": std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_secs(),
                })
            }
        };

        // Write the transaction event to the log file as a single line JSON
        if let Ok(mut file) = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.session_file)
        {
            if let Ok(serialized) = serde_json::to_string(&tx_data) {
                let _ = writeln!(file, "{}", serialized);
            }
        }

        result
    }
}

impl Deref for ExplorerLiteSVM {
    type Target = LiteSVM;
    fn deref(&self) -> &Self::Target {
        &self.svm
    }
}

impl DerefMut for ExplorerLiteSVM {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.svm
    }
}
