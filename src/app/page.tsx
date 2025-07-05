'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (session) {
          // User is logged in, redirect to dashboard
          router.push('/dashboard')
        } else {
          // User is not logged in, redirect to login
          router.push('/login')
        }
      } catch (error) {
        console.error('Error checking auth:', error)
        // On error, redirect to login
        router.push('/login')
      }
    }

    checkAuthAndRedirect()
  }, [router])

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">FocuSprint</h1>
        <p className="mt-2 text-sm text-gray-600">Carregando...</p>
      </div>
    </div>
  )
}
