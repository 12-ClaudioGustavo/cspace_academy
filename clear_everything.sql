-- =========================================================================
-- SCRIPT PARA DELETAR ABSOLUTAMENTE TUDO (LIMPANDO USUÁRIOS E DADOS)
-- E RECRIAR O ADMINISTRADOR DO SISTEMA
-- Execute este código no "SQL Editor" do painel do seu projeto Supabase.
-- =========================================================================

-- 1. DELETAR TODOS OS USUÁRIOS E CURSOS (A exclusão em cascata limpará todas as outras tabelas)
TRUNCATE auth.users CASCADE;
TRUNCATE public.cursos CASCADE;

-- 2. RECRIAR O USUÁRIO ADMINISTRADOR NO AUTH DO SUPABASE (para você poder entrar e cadastrar)
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'd1b8c6e2-2a7f-4b3d-9d7e-0c1f2b3a4c5d', -- UUID fixo para o administrador
    'authenticated',
    'authenticated',
    'josemargstv@gmail.com',
    extensions.crypt('Josemar@2007#', extensions.gen_salt('bf', 10)), -- Criptografia da senha
    now(),
    null,
    null,
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"nome": "Josemar", "role": "admin"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
);

-- 3. CRIAR IDENTIDADE DE AUTENTICAÇÃO
INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
) VALUES (
    'd1b8c6e2-2a7f-4b3d-9d7e-0c1f2b3a4c5d',
    'd1b8c6e2-2a7f-4b3d-9d7e-0c1f2b3a4c5d',
    jsonb_build_object('sub', 'd1b8c6e2-2a7f-4b3d-9d7e-0c1f2b3a4c5d', 'email', 'josemargstv@gmail.com'),
    'email',
    'd1b8c6e2-2a7f-4b3d-9d7e-0c1f2b3a4c5d',
    now(),
    now(),
    now()
);

-- 4. GARANTIR A PROPRIEDADE DO PERFIL DO ADMINISTRADOR
INSERT INTO public.perfis (id, nome, email, role)
VALUES (
    'd1b8c6e2-2a7f-4b3d-9d7e-0c1f2b3a4c5d',
    'Josemar',
    'josemargstv@gmail.com',
    'admin'
)
ON CONFLICT (id) DO UPDATE SET role = 'admin';
