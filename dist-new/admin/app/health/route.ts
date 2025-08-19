import { NextResponse } from 'next/server';

export async function GET() {
	return NextResponse.json({ status: 'ok', service: 'operator-admin', ts: Date.now() });
}
