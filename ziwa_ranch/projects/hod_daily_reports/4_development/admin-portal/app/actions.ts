'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createHmac } from 'crypto'

function computeHash(password: string): string {
  return createHmac('sha256', password).update(password).digest('hex')
}

export async function loginAction(formData: FormData) {
  const password = formData.get('password') as string
  const expected = process.env.ADMIN_PASSWORD ?? ''

  if (!password || password !== expected) {
    return { error: 'Incorrect password.' }
  }

  const hash = computeHash(password)
  const cookieStore = await cookies()
  cookieStore.set('admin_auth', hash, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24,
  })

  redirect('/')
}

export async function logoutAction() {
  const cookieStore = await cookies()
  cookieStore.delete('admin_auth')
  redirect('/')
}
