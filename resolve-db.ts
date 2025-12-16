
import dotenv from 'dotenv';
import dns from 'dns';
import { URL } from 'url';

dotenv.config({ path: '.env.local' });
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: '.env' });
}

const connectionString = process.env.DATABASE_URL;

async function resolveHost() {
  if (!connectionString) {
    console.log("No connection string found.");
    return;
  }

  try {
    const url = new URL(connectionString);
    const hostname = url.hostname;
    console.log("Hostname:", hostname);

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        console.log("Localhost, skipping resolution.");
        return;
    }

    const addresses = await dns.promises.resolve4(hostname);
    console.log("IPv4 Addresses:", addresses);
  } catch (error) {
    console.error("Error resolving:", error);
  }
}

resolveHost();
