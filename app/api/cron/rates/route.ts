import { NextResponse } from 'next/server';
import { getExchangeRates } from '@/lib/tcmb';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Check for authorization header if you want to secure it (optional for Vercel Cron if protected)
    // const authHeader = request.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return new Response('Unauthorized', { status: 401 });
    // }

    console.log("Cron job triggered: Fetching exchange rates...");
    const rates = await getExchangeRates();
    
    if (rates) {
      return NextResponse.json({ success: true, message: "Rates updated successfully", data: rates });
    } else {
      return NextResponse.json({ success: false, message: "Could not fetch rates" }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Cron job error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
