import { NextResponse } from 'next/server';

// මෙතන "export default" පාවිච්චි කරන්න බෑ. 
// අනිවාර්යයෙන්ම "export async function GET" වෙන්නම ඕන.

export async function GET() {
  const API_KEY = process.env.CRIC_API_KEY;

  // Key එක නැත්නම් Error එකක් යවනවා
  if (!API_KEY) {
    return NextResponse.json({ error: 'API Key missing' }, { status: 500 });
  }

  try {
    const res = await fetch(`https://api.cricapi.com/v1/currentMatches?apikey=${API_KEY}&offset=0`);
    const data = await res.json();

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 });
  }
}