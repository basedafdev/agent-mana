use keyring::Entry;

#[derive(Clone)]
pub struct KeychainManager;

impl KeychainManager {
    pub fn new() -> Self {
        Self
    }

    pub fn store_api_key(&self, provider: &str, api_key: &str) -> Result<(), keyring::Error> {
        let entry = Entry::new("agent-mana", provider)?;
        entry.set_password(api_key)
    }

    pub fn get_api_key(&self, provider: &str) -> Result<Option<String>, keyring::Error> {
        let entry = Entry::new("agent-mana", provider)?;
        match entry.get_password() {
            Ok(password) => Ok(Some(password)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(e) => Err(e),
        }
    }

    pub fn delete_api_key(&self, provider: &str) -> Result<(), keyring::Error> {
        let entry = Entry::new("agent-mana", provider)?;
        entry.delete_credential()
    }
}
