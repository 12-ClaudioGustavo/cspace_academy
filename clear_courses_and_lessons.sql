-- =========================================================================
-- SCRIPT PARA LIMPAR CURSOS, AULAS E DADOS ASSOCIADOS
-- Execute este código no "SQL Editor" do painel do seu projeto Supabase.
-- =========================================================================

-- Desativa temporariamente a verificação de chaves estrangeiras se necessário,
-- ou simplesmente realiza a limpeza em cascata (Cascading Truncate)
TRUNCATE public.cursos CASCADE;

-- Alternativamente, se preferir deletar de forma explícita de cada tabela:
-- DELETE FROM public.inscricoes;
-- DELETE FROM public.respostas_exercicios;
-- DELETE FROM public.exercicios;
-- DELETE FROM public.materiais;
-- DELETE FROM public.aulas;
-- DELETE FROM public.cursos;
