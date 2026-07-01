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

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const action = searchParams.get('action')

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Configuração do servidor incompleta. SUPABASE_SERVICE_ROLE_KEY ausente.' },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    if (action === 'truncate') {
      // 1. Buscar perfis de alunos e professores
      const { data: profiles, error: fetchError } = await supabaseAdmin
        .from('perfis')
        .select('id, role')
        .in('role', ['aluno', 'professor'])

      if (fetchError) {
        return NextResponse.json({ error: fetchError.message }, { status: 400 })
      }

      if (profiles && profiles.length > 0) {
        // Excluir cada um da autenticação do Supabase
        for (const profile of profiles) {
          await supabaseAdmin.auth.admin.deleteUser(profile.id)
        }
        // Excluir todos da tabela de perfis
        const { error: deleteError } = await supabaseAdmin
          .from('perfis')
          .delete()
          .in('role', ['aluno', 'professor'])

        if (deleteError) {
          return NextResponse.json({ error: deleteError.message }, { status: 400 })
        }
      }

      return NextResponse.json({ success: true, message: 'Todos os alunos e professores foram excluídos com sucesso.' })
    }

    if (userId) {
      // Excluir usuário da autenticação
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
      // Excluir da tabela perfis
      const { error: profileError } = await supabaseAdmin
        .from('perfis')
        .delete()
        .eq('id', userId)

      if (authError && profileError) {
        return NextResponse.json({ error: `Erro Auth: ${authError.message}. Erro Perfil: ${profileError.message}` }, { status: 400 })
      }

      return NextResponse.json({ success: true, message: 'Utilizador removido com sucesso.' })
    }

    return NextResponse.json({ error: 'Parâmetros inválidos.' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 550 })
  }
}

