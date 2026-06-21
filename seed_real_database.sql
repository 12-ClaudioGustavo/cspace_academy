-- SEED DATA E CRIAÇÃO DO ADMINISTRADOR PARA C-SPACE ACADEMY
-- Execute este script completo no SQL Editor do painel do seu projeto Supabase.

-- 1. LIMPAR DADOS DE USUÁRIOS E PERFIS EXISTENTES (Cascata)
TRUNCATE auth.users CASCADE;

-- 2. CRIAR E CONFIRMAR O USUÁRIO ADMINISTRADOR NO AUTH DO SUPABASE
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
    extensions.crypt('Josemar@2007#', extensions.gen_salt('bf', 10)), -- Criptografia segura por pgcrypto
    now(),
    null,
    null,
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"nome": "Josemar", "role": "admin"}'::jsonb, -- Definido como Admin
    now(),
    now(),
    '',
    '',
    '',
    ''
);

-- 3. INSERIR IDENTIDADE DE AUTENTICAÇÃO POR E-MAIL
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
    'd1b8c6e2-2a7f-4b3d-9d7e-0c1f2b3a4c5d', -- provider_id mapeado para o UUID do usuário
    now(),
    now(),
    now()
);

-- 4. GARANTIR QUE A ROLE SEJA 'admin' NO PERFIL (Caso o Trigger precise de redundância)
INSERT INTO public.perfis (id, nome, email, role)
VALUES (
    'd1b8c6e2-2a7f-4b3d-9d7e-0c1f2b3a4c5d',
    'Josemar',
    'josemargstv@gmail.com',
    'admin'
)
ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- 4.5 GARANTIR QUE A COLUNA professor_id EXISTE NA TABELA cursos
ALTER TABLE public.cursos ADD COLUMN IF NOT EXISTS professor_id UUID REFERENCES public.perfis(id) ON DELETE SET NULL;

-- 5. INSERIR O CURSO DE 7 DIAS
INSERT INTO public.cursos (id, titulo, descricao, preco, capa_url, publicado)
VALUES (
    'c0c50d30-8cde-4e3a-9694-5c91176b6d6d',
    'Desenvolvimento Web Intensivo - 7 Dias',
    'Aprenda a construir aplicações web completas e dinâmicas utilizando HTML, CSS, JavaScript, React e Next.js com banco de dados real. Inclui aulas diárias ao vivo via Jitsi Meet e certificado.',
    25000.00,
    'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=800&q=80',
    true
)
ON CONFLICT (id) DO NOTHING;

-- 6. INSERIR AS 7 AULAS (Playlist e Lives)
INSERT INTO public.aulas (id, curso_id, titulo, descricao, ordem, data_hora_live, sala_live_id)
VALUES 
    (
        'a0a0a0a0-0000-0000-0000-000000000001',
        'c0c50d30-8cde-4e3a-9694-5c91176b6d6d',
        'Dia 1 - Fundamentos e Configuração do Ambiente',
        'Nesta aula cobriremos as bases do desenvolvimento web: protocolo HTTP, estrutura do HTML5 moderno, propriedades cruciais do CSS3, layout flexbox e configuração de editores profissionais.',
        1,
        now() + interval '2 hours',
        'cspace-intensivo-dia1'
    ),
    (
        'a0a0a0a0-0000-0000-0000-000000000002',
        'c0c50d30-8cde-4e3a-9694-5c91176b6d6d',
        'Dia 2 - Lógica de Programação e JavaScript',
        'Introdução à linguagem JavaScript: variáveis (let/const), operadores lógicos, estruturas de controlo de fluxo (if/else, switch), loops (for, while) e funções reutilizáveis.',
        2,
        now() + interval '26 hours',
        'cspace-intensivo-dia2'
    ),
    (
        'a0a0a0a0-0000-0000-0000-000000000003',
        'c0c50d30-8cde-4e3a-9694-5c91176b6d6d',
        'Dia 3 - Manipulação do DOM e APIs no Navegador',
        'Conectando JavaScript à página HTML: seletores complexos de elementos, escuta e resposta a eventos do utilizador, alteração dinâmica de CSS e requisições HTTP utilizando fetch.',
        3,
        null,
        'cspace-intensivo-dia3'
    ),
    (
        'a0a0a0a0-0000-0000-0000-000000000004',
        'c0c50d30-8cde-4e3a-9694-5c91176b6d6d',
        'Dia 4 - Fundamentos de React e Componentização',
        'Entendendo a biblioteca React: conceito de Componentes, manipulação de estado local (useState), propriedades (props) e o ciclo de renderização virtual.',
        4,
        null,
        'cspace-intensivo-dia4'
    ),
    (
        'a0a0a0a0-0000-0000-0000-000000000005',
        'c0c50d30-8cde-4e3a-9694-5c91176b6d6d',
        'Dia 5 - Framework Next.js (App Router)',
        'Arquitetura Next.js moderna: Server Components vs Client Components, sistema de pastas de roteamento baseado em ficheiros (App Router) e otimização de imagens.',
        5,
        null,
        'cspace-intensivo-dia5'
    ),
    (
        'a0a0a0a0-0000-0000-0000-000000000006',
        'c0c50d30-8cde-4e3a-9694-5c91176b6d6d',
        'Dia 6 - Integração de Banco de Dados com Supabase',
        'Persistindo dados em nuvem: queries relacionais, inserção de registos, segurança através de RLS (Row-Level Security) e autenticação de utilizadores com cookies.',
        6,
        null,
        'cspace-intensivo-dia6'
    ),
    (
        'a0a0a0a0-0000-0000-0000-000000000007',
        'c0c50d30-8cde-4e3a-9694-5c91176b6d6d',
        'Dia 7 - Publicação, Jitsi Live e Certificados',
        'Fase final da aplicação: deploy na plataforma Vercel, integração do SDK de chamadas Jitsi e emissão automática de certificado digital de conclusão de curso.',
        7,
        null,
        'cspace-intensivo-dia7'
    )
ON CONFLICT (id) DO NOTHING;

-- 7. INSERIR MATERIAIS DE APOIO
INSERT INTO public.materiais (id, aula_id, titulo, arquivo_url)
VALUES 
    (
        gen_random_uuid(),
        'a0a0a0a0-0000-0000-0000-000000000001',
        'Slides - Conceitos e Fundamentos Web',
        'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
    ),
    (
        gen_random_uuid(),
        'a0a0a0a0-0000-0000-0000-000000000002',
        'Manual de Sintaxe JavaScript Moderno',
        'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
    ),
    (
        gen_random_uuid(),
        'a0a0a0a0-0000-0000-0000-000000000003',
        'Guia Rápido de Seletores e Eventos DOM',
        'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
    ),
    (
        gen_random_uuid(),
        'a0a0a0a0-0000-0000-0000-000000000004',
        'Slides - React Hooks e Estados',
        'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
    ),
    (
        gen_random_uuid(),
        'a0a0a0a0-0000-0000-0000-000000000005',
        'Folha de Atalhos Next.js App Router',
        'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
    ),
    (
        gen_random_uuid(),
        'a0a0a0a0-0000-0000-0000-000000000006',
        'Instruções de RLS e Supabase PostgreSQL',
        'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
    ),
    (
        gen_random_uuid(),
        'a0a0a0a0-0000-0000-0000-000000000007',
        'Template de Certificado Digital PDF',
        'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
    )
ON CONFLICT (id) DO NOTHING;

-- 8. INSERIR EXERCÍCIOS DE FIXAÇÃO
INSERT INTO public.exercicios (id, aula_id, pergunta, opcoes, resposta_correta)
VALUES 
    (
        gen_random_uuid(),
        'a0a0a0a0-0000-0000-0000-000000000001',
        'Qual das alternativas abaixo é usada para definir uma seção independente em uma página HTML5 sem conotações semânticas?',
        '["<section>", "<div>", "<article>", "<aside>"]'::jsonb,
        1
    ),
    (
        gen_random_uuid(),
        'a0a0a0a0-0000-0000-0000-000000000002',
        'Qual método JavaScript é usado para converter uma string representando um JSON em um objeto literal?',
        '["JSON.stringify()", "JSON.parse()", "Object.parse()", "JSON.toObject()"]'::jsonb,
        1
    ),
    (
        gen_random_uuid(),
        'a0a0a0a0-0000-0000-0000-000000000003',
        'Qual das seguintes opções adiciona corretamente um evento de clique a um botão em JavaScript?',
        '["button.onclick(fn)", "button.addEventListener(''click'', fn)", "button.addEvent(''click'', fn)", "button.setClickEvent(fn)"]'::jsonb,
        1
    ),
    (
        gen_random_uuid(),
        'a0a0a0a0-0000-0000-0000-000000000004',
        'Em React, para que serve o hook useState?',
        '["Para realizar requisições assíncronas", "Para guardar estado local que re-renderiza o componente ao mudar", "Para manipular elementos diretamente no DOM", "Para criar rotas de páginas"]'::jsonb,
        2
    ),
    (
        gen_random_uuid(),
        'a0a0a0a0-0000-0000-0000-000000000005',
        'Por padrão, todos os componentes dentro do Next.js App Router são executados como:',
        '["Client Components", "Server Components", "Static HTML Files", "Shared Dynamic Elements"]'::jsonb,
        1
    ),
    (
        gen_random_uuid(),
        'a0a0a0a0-0000-0000-0000-000000000006',
        'O que significa a sigla RLS no banco de dados PostgreSQL do Supabase?',
        '["Resource Load System", "Row-Level Security", "Relational Local Storage", "Right Level Session"]'::jsonb,
        1
    ),
    (
        gen_random_uuid(),
        'a0a0a0a0-0000-0000-0000-000000000007',
        'Para que serve a API externa do Jitsi Meet?',
        '["Para processar pagamentos Multicaixa", "Para embutir uma conferência de vídeo em qualquer aplicação HTML", "Para monitorar logs do servidor", "Para compilar o código JavaScript"]'::jsonb,
        1
    )
ON CONFLICT (id) DO NOTHING;
