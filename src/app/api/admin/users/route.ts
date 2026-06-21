import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { nome, email, password, role } = await request.json()

    if (!nome || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Todos os campos (nome, email, senha, cargo) são obrigatórios.' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { 
          error: 'Configuração do servidor incompleta. Por favor, adicione a variável SUPABASE_SERVICE_ROLE_KEY no arquivo .env.local do seu projeto.' 
        },
        { status: 500 }
      )
    }

    // Inicializa o cliente com a chave administrativa service_role
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Cria o utilizador directamente na autenticação com email verificado
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nome,
        role
      }
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Para garantir que o perfil seja sincronizado de imediato com a role correta
    // no caso de qualquer delay no trigger da base de dados:
    const { error: profileError } = await supabaseAdmin
      .from('perfis')
      .upsert({
        id: data.user.id,
        nome,
        email,
        role,
        criado_em: new Date().toISOString()
      })

    if (profileError) {
      console.warn('Alerta: O utilizador foi criado mas houve erro ao sincronizar o perfil:', profileError.message)
    }

    return NextResponse.json({ 
      success: true, 
      user: {
        id: data.user.id,
        nome,
        email,
        role
      } 
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
