import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { email, nome } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email inválido.' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Formato de email inválido.' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (
      !supabaseUrl || 
      !supabaseKey || 
      supabaseUrl === 'https://seu-projeto.supabase.co' || 
      supabaseKey === 'sua-chave-anonima-aqui'
    ) {
      // Modo Demo: simula sucesso
      return NextResponse.json({ success: true, demo: true })
    }

    const supabase = await createClient()

    // Verifica se já existe
    const { data: existing } = await supabase
      .from('newsletter_subscribers')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (existing) {
      return NextResponse.json({ error: 'already_subscribed' }, { status: 409 })
    }

    const { error } = await supabase
      .from('newsletter_subscribers')
      .insert({
        email: email.toLowerCase().trim(),
        nome: nome || null
      })

    if (error) {
      // Conflict: já subscrito (race condition)
      if (error.code === '23505') {
        return NextResponse.json({ error: 'already_subscribed' }, { status: 409 })
      }
      console.error('[Newsletter] Supabase error:', error)
      return NextResponse.json({ error: 'Erro ao guardar subscrição.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[Newsletter] Unexpected error:', err)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}
