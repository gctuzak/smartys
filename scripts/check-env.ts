
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const url = process.env.DATABASE_URL;
if (!url) {
    console.log("DATABASE_URL is not set");
} else {
    // Mask password
    const masked = url.replace(/:([^:@]+)@/, ':****@');
    console.log("DATABASE_URL:", masked);
}
