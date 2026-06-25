-- ============================================================
-- C-SPACE ACADEMY — SETUP COMPLETO DO SUPABASE
-- Execute este ficheiro UMA VEZ no SQL Editor do Supabase.
-- Inclui schema, migrações, storage e newsletter.
-- ============================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABELAS PRINCIPAIS
-- ============================================================

-- 1. Perfis de utilizador (criado automaticamente pelo trigger)
CREATE TABLE IF NOT EXISTS public.perfis (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'professor', 'aluno')) DEFAULT 'aluno',
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Cursos
CREATE TABLE IF NOT EXISTS public.cursos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    preco NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    capa_url TEXT,
    publicado BOOLEAN DEFAULT false NOT NULL,
    professor_id UUID REFERENCES public.perfis(id) ON DELETE SET NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Adiciona professor_id se o schema antigo já existir
ALTER TABLE public.cursos ADD COLUMN IF NOT EXISTS professor_id UUID REFERENCES public.perfis(id) ON DELETE SET NULL;

-- 3. Inscrições e comprovativos
CREATE TABLE IF NOT EXISTS public.inscricoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aluno_id UUID REFERENCES public.perfis(id) ON DELETE CASCADE NOT NULL,
    curso_id UUID REFERENCES public.cursos(id) ON DELETE CASCADE NOT NULL,
    status TEXT CHECK (status IN ('pendente', 'aprovado', 'rejeitado')) DEFAULT 'pendente' NOT NULL,
    comprovativo_url TEXT NOT NULL,
    data_solicitacao TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    data_aprovacao TIMESTAMP WITH TIME ZONE,
    UNIQUE (aluno_id, curso_id)
);

-- 4. Aulas / Lives
CREATE TABLE IF NOT EXISTS public.aulas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    curso_id UUID REFERENCES public.cursos(id) ON DELETE CASCADE NOT NULL,
    titulo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    ordem INTEGER NOT NULL,
    data_hora_live TIMESTAMP WITH TIME ZONE,
    sala_live_id TEXT,
    concluida BOOLEAN DEFAULT false NOT NULL,
    live_iniciada BOOLEAN DEFAULT false NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Adiciona colunas de status da live se já existia a tabela sem elas
ALTER TABLE public.aulas ADD COLUMN IF NOT EXISTS concluida BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE public.aulas ADD COLUMN IF NOT EXISTS live_iniciada BOOLEAN DEFAULT false NOT NULL;

-- 5. Materiais de aula (PDFs, ficheiros)
CREATE TABLE IF NOT EXISTS public.materiais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aula_id UUID REFERENCES public.aulas(id) ON DELETE CASCADE NOT NULL,
    titulo TEXT NOT NULL,
    arquivo_url TEXT NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Exercícios de aula
CREATE TABLE IF NOT EXISTS public.exercicios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aula_id UUID REFERENCES public.aulas(id) ON DELETE CASCADE NOT NULL,
    pergunta TEXT NOT NULL,
    opcoes JSONB NOT NULL,
    resposta_correta INTEGER NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Respostas dos alunos aos exercícios
CREATE TABLE IF NOT EXISTS public.respostas_exercicios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aluno_id UUID REFERENCES public.perfis(id) ON DELETE CASCADE NOT NULL,
    exercicio_id UUID REFERENCES public.exercicios(id) ON DELETE CASCADE NOT NULL,
    resposta_aluno INTEGER NOT NULL,
    correta BOOLEAN NOT NULL,
    respondido_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (aluno_id, exercicio_id)
);

-- 8. Mensagens do chat das lives (persistência)
CREATE TABLE IF NOT EXISTS public.mensagens_live (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aula_id UUID REFERENCES public.aulas(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.perfis(id) ON DELETE CASCADE NOT NULL,
    nome_utilizador TEXT NOT NULL,
    role_utilizador TEXT NOT NULL,
    texto TEXT NOT NULL,
    tipo TEXT DEFAULT 'mensagem' CHECK (tipo IN ('mensagem', 'duvida', 'sistema')),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Subscritores da newsletter
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    nome TEXT,
    subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================
-- TRIGGER: cria perfil automaticamente ao registar
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.perfis (id, nome, email, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'aluno')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inscricoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.respostas_exercicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensagens_live ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "Qualquer um pode ver perfis" ON public.perfis;
DROP POLICY IF EXISTS "O próprio usuário pode atualizar seu perfil" ON public.perfis;
DROP POLICY IF EXISTS "Qualquer um pode ver cursos publicados" ON public.cursos;
DROP POLICY IF EXISTS "Apenas admin/professor pode inserir cursos" ON public.cursos;
DROP POLICY IF EXISTS "Apenas admin/professor pode atualizar cursos" ON public.cursos;
DROP POLICY IF EXISTS "Apenas admin pode deletar cursos" ON public.cursos;
DROP POLICY IF EXISTS "Aluno pode ver suas próprias inscrições" ON public.inscricoes;
DROP POLICY IF EXISTS "Aluno pode solicitar inscrição" ON public.inscricoes;
DROP POLICY IF EXISTS "Apenas admin/professor pode atualizar inscrições (aprovar)" ON public.inscricoes;
DROP POLICY IF EXISTS "Aulas visíveis para inscritos aprovados ou admins/professores" ON public.aulas;
DROP POLICY IF EXISTS "Apenas admin/professor pode gerenciar aulas" ON public.aulas;
DROP POLICY IF EXISTS "Materiais visíveis para inscritos aprovados ou admins/professores" ON public.materiais;
DROP POLICY IF EXISTS "Apenas admin/professor pode gerenciar materiais" ON public.materiais;
DROP POLICY IF EXISTS "Exercícios visíveis para inscritos aprovados ou admins/professores" ON public.exercicios;
DROP POLICY IF EXISTS "Apenas admin/professor pode gerenciar exercícios" ON public.exercicios;
DROP POLICY IF EXISTS "Alunos podem ver suas próprias respostas" ON public.respostas_exercicios;
DROP POLICY IF EXISTS "Alunos podem responder exercícios" ON public.respostas_exercicios;

-- PERFIS
CREATE POLICY "perfis_select" ON public.perfis FOR SELECT TO authenticated USING (true);
CREATE POLICY "perfis_update" ON public.perfis FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "perfis_insert_admin" ON public.perfis FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "perfis_delete_admin" ON public.perfis FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND role = 'admin'));

-- CURSOS
CREATE POLICY "cursos_select" ON public.cursos FOR SELECT
  USING (publicado = true OR EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND role IN ('admin', 'professor')));
CREATE POLICY "cursos_insert" ON public.cursos FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND role IN ('admin', 'professor')));
CREATE POLICY "cursos_update" ON public.cursos FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND role IN ('admin', 'professor')));
CREATE POLICY "cursos_delete" ON public.cursos FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND role = 'admin'));

-- INSCRIÇÕES
CREATE POLICY "inscricoes_select" ON public.inscricoes FOR SELECT TO authenticated
  USING (aluno_id = auth.uid() OR EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND role IN ('admin', 'professor')));
CREATE POLICY "inscricoes_insert" ON public.inscricoes FOR INSERT TO authenticated
  WITH CHECK (aluno_id = auth.uid());
CREATE POLICY "inscricoes_update" ON public.inscricoes FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND role IN ('admin', 'professor')));
CREATE POLICY "inscricoes_delete" ON public.inscricoes FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND role = 'admin'));

-- AULAS
CREATE POLICY "aulas_select" ON public.aulas FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.inscricoes WHERE inscricoes.curso_id = aulas.curso_id AND inscricoes.aluno_id = auth.uid() AND inscricoes.status = 'aprovado')
    OR EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND role IN ('admin', 'professor'))
  );
CREATE POLICY "aulas_all_admin" ON public.aulas FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND role IN ('admin', 'professor')));

-- MATERIAIS
CREATE POLICY "materiais_select" ON public.materiais FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.aulas
      JOIN public.inscricoes ON inscricoes.curso_id = aulas.curso_id
      WHERE aulas.id = materiais.aula_id AND inscricoes.aluno_id = auth.uid() AND inscricoes.status = 'aprovado'
    ) OR EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND role IN ('admin', 'professor'))
  );
CREATE POLICY "materiais_all_admin" ON public.materiais FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND role IN ('admin', 'professor')));

-- EXERCÍCIOS
CREATE POLICY "exercicios_select" ON public.exercicios FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.aulas
      JOIN public.inscricoes ON inscricoes.curso_id = aulas.curso_id
      WHERE aulas.id = exercicios.aula_id AND inscricoes.aluno_id = auth.uid() AND inscricoes.status = 'aprovado'
    ) OR EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND role IN ('admin', 'professor'))
  );
CREATE POLICY "exercicios_all_admin" ON public.exercicios FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND role IN ('admin', 'professor')));

-- RESPOSTAS EXERCÍCIOS
CREATE POLICY "respostas_select" ON public.respostas_exercicios FOR SELECT TO authenticated
  USING (aluno_id = auth.uid() OR EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND role IN ('admin', 'professor')));
CREATE POLICY "respostas_insert" ON public.respostas_exercicios FOR INSERT TO authenticated
  WITH CHECK (aluno_id = auth.uid());

-- MENSAGENS LIVE
CREATE POLICY "mensagens_select" ON public.mensagens_live FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.inscricoes JOIN public.aulas ON aulas.curso_id = inscricoes.curso_id WHERE aulas.id = mensagens_live.aula_id AND inscricoes.aluno_id = auth.uid() AND inscricoes.status = 'aprovado')
    OR EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND role IN ('admin', 'professor'))
  );
CREATE POLICY "mensagens_insert" ON public.mensagens_live FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- NEWSLETTER
CREATE POLICY "newsletter_insert" ON public.newsletter_subscribers FOR INSERT
  WITH CHECK (true);
CREATE POLICY "newsletter_select_admin" ON public.newsletter_subscribers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- SUPABASE STORAGE — BUCKETS PÚBLICOS
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('comprovativos', 'comprovativos', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('materiais', 'materiais', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('capas', 'capas', true) ON CONFLICT DO NOTHING;

-- Políticas Storage
DROP POLICY IF EXISTS "Alunos podem fazer upload de comprovativos" ON storage.objects;
DROP POLICY IF EXISTS "Admin pode ver comprovativos" ON storage.objects;
DROP POLICY IF EXISTS "Qualquer um pode ver materiais" ON storage.objects;
DROP POLICY IF EXISTS "Admin pode gerir materiais" ON storage.objects;
DROP POLICY IF EXISTS "Qualquer um pode ver capas" ON storage.objects;
DROP POLICY IF EXISTS "Admin pode gerir capas" ON storage.objects;

CREATE POLICY "upload_comprovativos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'comprovativos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "admin_ver_comprovativos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'comprovativos' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND role IN ('admin', 'professor'))
  ));

CREATE POLICY "public_materiais_select" ON storage.objects FOR SELECT USING (bucket_id = 'materiais');
CREATE POLICY "admin_materiais_all" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'materiais' AND EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND role IN ('admin', 'professor')))
  WITH CHECK (bucket_id = 'materiais' AND EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND role IN ('admin', 'professor')));

CREATE POLICY "public_capas_select" ON storage.objects FOR SELECT USING (bucket_id = 'capas');
CREATE POLICY "admin_capas_all" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'capas' AND EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND role IN ('admin', 'professor')))
  WITH CHECK (bucket_id = 'capas' AND EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND role IN ('admin', 'professor')));
