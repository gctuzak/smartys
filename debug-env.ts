import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const url = process.env.DATABASE_URL;
if (url) {
  try {
    const parsed = new URL(url);
    console.log(`Protocol: ${parsed.protocol}`);
    console.log(`Host: ${parsed.hostname}`);
    console.log(`Port: ${parsed.port}`);
    console.log(`User: ${parsed.username}`);
    // console.log(`Path: ${parsed.pathname}`);
  } catch (e) {
    console.log("Invalid URL format");
  }
} else {
  console.log("No DATABASE_URL");
}
