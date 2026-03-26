import { createHmac } from 'crypto'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

function getExpectedHash(): string {
  const pw = process.env.ADMIN_PASSWORD ?? ''
  return createHmac('sha256', pw).update(pw).digest('hex')
}

export async function verifyAdminAuth(): Promise<NextResponse | null> {
  const cookieStore = await cookies()
  const authCookie = cookieStore.get('admin_auth')?.value
  if (authCookie !== getExpectedHash()) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  return null
}
