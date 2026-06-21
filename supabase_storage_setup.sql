-- =========================================================================
-- SCRIPT DE CONFIGURAÇÃO DE BUCKETS E POLÍTICAS RLS DO SUPABASE STORAGE
-- Execute este código no "SQL Editor" do painel do seu projeto Supabase.
-- =========================================================================

-- 1. CRIAR OS BUCKETS SE ELES NÃO EXISTIREM
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('capas', 'capas', true),
  ('materiais', 'materiais', true),
  ('comprovativos', 'comprovativos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. REMOVER POLÍTICAS EXISTENTES PARA EVITAR DUPLICIDADE
DROP POLICY IF EXISTS "Acesso de leitura público para capas" ON storage.objects;
DROP POLICY IF EXISTS "Professores e admins podem inserir capas" ON storage.objects;
DROP POLICY IF EXISTS "Professores e admins podem apagar capas" ON storage.objects;

DROP POLICY IF EXISTS "Acesso de leitura público para materiais" ON storage.objects;
DROP POLICY IF EXISTS "Professores e admins podem inserir materiais" ON storage.objects;
DROP POLICY IF EXISTS "Professores e admins podem apagar materiais" ON storage.objects;

DROP POLICY IF EXISTS "Acesso de leitura público para comprovativos" ON storage.objects;
DROP POLICY IF EXISTS "Alunos podem carregar comprovativos" ON storage.objects;
DROP POLICY IF EXISTS "Professores e admins podem apagar comprovativos" ON storage.objects;


-- 3. CRIAR POLÍTICAS DE ACESSO PARA O BUCKET "capas" (Imagens de Capa de Cursos)
-- Leitura: Pública para qualquer pessoa
CREATE POLICY "Acesso de leitura público para capas" ON storage.objects
  FOR SELECT USING (bucket_id = 'capas');

-- Inserção: Permitida apenas para Administradores e Professores autenticados
CREATE POLICY "Professores e admins podem inserir capas" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'capas' AND (EXISTS (
    SELECT 1 FROM public.perfis 
    WHERE perfis.id = auth.uid() AND perfis.role IN ('admin', 'professor')
  )));

-- Exclusão: Permitida apenas para Administradores e Professores autenticados
CREATE POLICY "Professores e admins podem apagar capas" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'capas' AND (EXISTS (
    SELECT 1 FROM public.perfis 
    WHERE perfis.id = auth.uid() AND perfis.role IN ('admin', 'professor')
  )));


-- 4. CRIAR POLÍTICAS DE ACESSO PARA O BUCKET "materiais" (PDFs de Materiais de Aula)
-- Leitura: Pública para qualquer pessoa
CREATE POLICY "Acesso de leitura público para materiais" ON storage.objects
  FOR SELECT USING (bucket_id = 'materiais');

-- Inserção: Permitida apenas para Administradores e Professores autenticados
CREATE POLICY "Professores e admins podem inserir materiais" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'materiais' AND (EXISTS (
    SELECT 1 FROM public.perfis 
    WHERE perfis.id = auth.uid() AND perfis.role IN ('admin', 'professor')
  )));

-- Exclusão: Permitida apenas para Administradores e Professores autenticados
CREATE POLICY "Professores e admins podem apagar materiais" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'materiais' AND (EXISTS (
    SELECT 1 FROM public.perfis 
    WHERE perfis.id = auth.uid() AND perfis.role IN ('admin', 'professor')
  )));


-- 5. CRIAR POLÍTICAS DE ACESSO PARA O BUCKET "comprovativos" (Comprovativos de Pagamento)
-- Leitura: Pública para qualquer pessoa
CREATE POLICY "Acesso de leitura público para comprovativos" ON storage.objects
  FOR SELECT USING (bucket_id = 'comprovativos');

-- Inserção: Permitida para qualquer utilizador autenticado (alunos enviando o comprovativo)
CREATE POLICY "Alunos podem carregar comprovativos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'comprovativos');

-- Exclusão: Permitida apenas para Administradores e Professores autenticados
CREATE POLICY "Professores e admins podem apagar comprovativos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'comprovativos' AND (EXISTS (
    SELECT 1 FROM public.perfis 
    WHERE perfis.id = auth.uid() AND perfis.role IN ('admin', 'professor')
  )));
