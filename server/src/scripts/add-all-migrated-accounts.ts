import db from '../database/db';
import { Vault } from '../utils/vault';

const MASTER_PASSWORD = 'MasterPassword2026';
const VAULT_SALT = 'fc59cbb112951f11173f4a2ebaffe4b2';
const USER_ID = 1;

const accountsToAdd = [
  { email: 'imre@prstart.hu', password: 'nimda1234', display_name: 'Imre Prstart' },
  { email: 'hello@apiport.hu', password: 'nimda1234', display_name: 'Apiport Hello' },
  { email: 'econosim@prstart.hu', password: 'econosim', display_name: 'Econo Sim' },
  { email: 'hello@piliserp.hu', password: '1qaw3ed-', display_name: 'Piliserp Hello' },
  { email: 'imre@sephir.hu', password: 'nimda1234', display_name: 'Imre Sephir' },
  { email: 'devops@prstart.hu', password: '1qaw3ed-', display_name: 'Prstart DevOps' },
  { email: 'pizza@prstart.hu', password: 'pizza1234', display_name: 'Prstart Pizza' },
  { email: 'hello@irodaszerem.hu', password: '1qaw3ed-', display_name: 'Irodaszerem Hello' },
  { email: 'hello@sephir.hu', password: '1qaw3ed-', display_name: 'Sephir Hello' },
  { email: 'admin@apiport.hu', password: 'nimda1234', display_name: 'Apiport Admin' },
  { email: 'hello@prstart.hu', password: '1qaw3ed-', display_name: 'Prstart Hello' },
  { email: 'noreply@sephir.hu', password: '1Qaw3ed-', display_name: 'Sephir Noreply' },
  { email: 'info@marcika.hu', password: '1qaw3ed-', display_name: 'Marcika Info' },
  { email: 'demo@sephir.hu', password: 'demo1234', display_name: 'Sephir Demo' },
  { email: 'imre@piliserp.hu', password: '1qaw3ed-', display_name: 'Imre Piliserp' },
  { email: 'support@prstart.hu', password: '1qaw3ed-', display_name: 'Prstart Support' },
  { email: 'info@apiport.hu', password: '1qaw3ed-', display_name: 'Apiport Info' },
  { email: 'imre@apiport.hu', password: '1qaw3ed-', display_name: 'Imre Apiport' },
  { email: 'noreply@apiport.hu', password: '1qaw3ed-', display_name: 'Apiport Noreply' },
  { email: 'shop@irodaszerem.hu', password: '1qaw3ed-', display_name: 'Irodaszerem Shop' },
  { email: 'admin@irodaszerem.hu', password: '1qaw3ed-', display_name: 'Irodaszerem Admin' },
  { email: 'ai@apiport.hu', password: '1qaw3ed-', display_name: 'Apiport AI' },
];

async function run() {
  console.log('Deriving vault key...');
  const vaultKey = Vault.deriveKey(MASTER_PASSWORD, VAULT_SALT);
  console.log('Vault key derived.');

  for (const acc of accountsToAdd) {
    console.log(`Adding ${acc.email}...`);
    const encryptedPassword = Vault.encrypt(acc.password, vaultKey);
    
    await db('accounts').insert({
      user_id: USER_ID,
      email: acc.email,
      display_name: acc.display_name,
      imap_host: 'mail.prstart.hu',
      imap_port: 993,
      smtp_host: 'mail.prstart.hu',
      smtp_port: 587,
      encrypted_password: encryptedPassword
    }).onConflict('email').ignore();
  }

  console.log('Finished adding accounts.');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
