import { exec } from 'child_process';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is not defined in .env.local');
  process.exit(1);
}

const backupDir = path.join(process.cwd(), 'backup');

// Ensure backup directory exists
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);

console.log(`Starting backup to ${backupFile}...`);

// Use pg_dump to create backup
// Note: pg_dump must be installed on the system
const command = `pg_dump "${databaseUrl}" -f "${backupFile}"`;

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error(`Backup failed: ${error.message}`);
    return;
  }
  if (stderr) {
    // pg_dump writes notices to stderr, so we don't treat all stderr as fatal
    console.log(`pg_dump output: ${stderr}`);
  }
  
  console.log(`Backup completed successfully: ${backupFile}`);
  
  // Verify file size
  const stats = fs.statSync(backupFile);
  const sizeInMB = stats.size / (1024 * 1024);
  console.log(`Backup size: ${sizeInMB.toFixed(2)} MB`);
});
