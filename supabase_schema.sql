-- Habilita extensão UUID se necessário
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA DE PERFIS (Profiles)
CREATE TABLE public.perfis (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'professor', 'aluno')) DEFAULT 'aluno',
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. TABELA DE CURSOS (Courses)
CREATE TABLE public.cursos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    preco NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    capa_url TEXT,
    publicado BOOLEAN DEFAULT false NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABELA DE INSCRIÇÕES E COMPROVATIVOS (Enrollments / Payments)
CREATE TABLE public.inscricoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aluno_id UUID REFERENCES public.perfis(id) ON DELETE CASCADE NOT NULL,
    curso_id UUID REFERENCES public.cursos(id) ON DELETE CASCADE NOT NULL,
    status TEXT CHECK (status IN ('pendente', 'aprovado', 'rejeitado')) DEFAULT 'pendente' NOT NULL,
    comprovativo_url TEXT NOT NULL,
    data_solicitacao TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    data_aprovacao TIMESTAMP WITH TIME ZONE,
    UNIQUE (aluno_id, curso_id)
);

-- 4. TABELA DE AULAS (Lessons / Lives)
CREATE TABLE public.aulas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    curso_id UUID REFERENCES public.cursos(id) ON DELETE CASCADE NOT NULL,
    titulo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    ordem INTEGER NOT NULL,
    data_hora_live TIMESTAMP WITH TIME ZONE, -- Se nulo, é aula gravada/material
    sala_live_id TEXT, -- ID ou slug da sala Jitsi
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. TABELA DE MATERIAIS DE AULA (PDFs / Files)
CREATE TABLE public.materiais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aula_id UUID REFERENCES public.aulas(id) ON DELETE CASCADE NOT NULL,
    titulo TEXT NOT NULL,
    arquivo_url TEXT NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. TABELA DE EXERCÍCIOS DE AULA (Exercises)
CREATE TABLE public.exercicios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aula_id UUID REFERENCES public.aulas(id) ON DELETE CASCADE NOT NULL,
    pergunta TEXT NOT NULL,
    opcoes JSONB NOT NULL, -- Array de strings ex: ["Resposta A", "Resposta B"]
    resposta_correta INTEGER NOT NULL, -- Índice (0, 1, 2...)
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. TABELA DE RESPOSTAS DOS ALUNOS (Exercise Responses)
CREATE TABLE public.respostas_exercicios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aluno_id UUID REFERENCES public.perfis(id) ON DELETE CASCADE NOT NULL,
    exercicio_id UUID REFERENCES public.exercicios(id) ON DELETE CASCADE NOT NULL,
    resposta_aluno INTEGER NOT NULL,
    correta BOOLEAN NOT NULL,
    respondido_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (aluno_id, exercicio_id)
);

-- TRIGGER AUTOMÁTICO PARA CRIAR PERFIL AO CADASTRAR NO SUPABASE AUTH
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.perfis (id, nome, email, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'nome', 'Estudante'),
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'aluno')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- HABILITAR RLS (Row Level Security) NAS TABELAS
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inscricoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.respostas_exercicios ENABLE ROW LEVEL SECURITY;

-- DEFINIÇÃO DE POLÍTICAS DE ACESSO (RLS)

-- 1. Perfis
CREATE POLICY "Qualquer um pode ver perfis" ON public.perfis FOR SELECT TO authenticated USING (true);
CREATE POLICY "O próprio usuário pode atualizar seu perfil" ON public.perfis FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 2. Cursos
CREATE POLICY "Qualquer um pode ver cursos publicados" ON public.cursos FOR SELECT USING (publicado = true OR (EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND role IN ('admin', 'professor'))));
CREATE POLICY "Apenas admin/professor pode inserir cursos" ON public.cursos FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND role IN ('admin', 'professor')));
CREATE POLICY "Apenas admin/professor pode atualizar cursos" ON public.cursos FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND role IN ('admin', 'professor')));
CREATE POLICY "Apenas admin pode deletar cursos" ON public.cursos FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND role = 'admin'));

-- 3. Inscrições
CREATE POLICY "Aluno pode ver suas próprias inscrições" ON public.inscricoes FOR SELECT TO authenticated USING (aluno_id = auth.uid() OR EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND role IN ('admin', 'professor')));
CREATE POLICY "Aluno pode solicitar inscrição" ON public.inscricoes FOR INSERT TO authenticated WITH CHECK (aluno_id = auth.uid());
CREATE POLICY "Apenas admin/professor pode atualizar inscrições (aprovar)" ON public.inscricoes FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND role IN ('admin', 'professor')));

-- 4. Aulas
CREATE POLICY "Aulas visíveis para inscritos aprovados ou admins/professores" ON public.aulas FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.inscricoes 
        WHERE inscricoes.curso_id = aulas.curso_id AND inscricoes.aluno_id = auth.uid() AND inscricoes.status = 'aprovado'
    ) OR EXISTS (
        SELECT 1 FROM public.perfis 
        WHERE id = auth.uid() AND role IN ('admin', 'professor')
    )
);
CREATE POLICY "Apenas admin/professor pode gerenciar aulas" ON public.aulas FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND role IN ('admin', 'professor'))
);

-- 5. Materiais
CREATE POLICY "Materiais visíveis para inscritos aprovados ou admins/professores" ON public.materiais FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.aulas
        JOIN public.inscricoes ON inscricoes.curso_id = aulas.curso_id
        WHERE aulas.id = materiais.aula_id AND inscricoes.aluno_id = auth.uid() AND inscricoes.status = 'aprovado'
    ) OR EXISTS (
        SELECT 1 FROM public.perfis 
        WHERE id = auth.uid() AND role IN ('admin', 'professor')
    )
);
CREATE POLICY "Apenas admin/professor pode gerenciar materiais" ON public.materiais FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND role IN ('admin', 'professor'))
);

-- 6. Exercícios
CREATE POLICY "Exercícios visíveis para inscritos aprovados ou admins/professores" ON public.exercicios FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.aulas
        JOIN public.inscricoes ON inscricoes.curso_id = aulas.curso_id
        WHERE aulas.id = exercicios.aula_id AND inscricoes.aluno_id = auth.uid() AND inscricoes.status = 'aprovado'
    ) OR EXISTS (
        SELECT 1 FROM public.perfis 
        WHERE id = auth.uid() AND role IN ('admin', 'professor')
    )
);
CREATE POLICY "Apenas admin/professor pode gerenciar exercícios" ON public.exercicios FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND role IN ('admin', 'professor'))
);

-- 7. Respostas Exercícios
CREATE POLICY "Alunos podem ver suas próprias respostas" ON public.respostas_exercicios FOR SELECT TO authenticated USING (
    aluno_id = auth.uid() OR EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND role IN ('admin', 'professor'))
);
CREATE POLICY "Alunos podem responder exercícios" ON public.respostas_exercicios FOR INSERT TO authenticated WITH CHECK (
    aluno_id = auth.uid()
);
