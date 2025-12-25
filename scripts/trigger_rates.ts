
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Fix __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  console.log('Starting manual exchange rate update...');
  
  try {
    // Dynamic import to ensure env vars are loaded before module execution
    const { getExchangeRates } = await import('../lib/tcmb');
    
    const rates = await getExchangeRates();
    if (rates) {
        console.log('✅ Exchange rates updated successfully:');
        console.log(JSON.stringify(rates, null, 2));
    } else {
        console.log('ℹ️ No new rates fetched. They might already exist for the effective date or TCMB is unreachable.');
    }
  } catch (error) {
    console.error('❌ Error updating rates:', error);
  }
}

main();
