-- Adiciona as colunas necessárias para o controle de conclusão da aula e status da live
ALTER TABLE public.aulas ADD COLUMN IF NOT EXISTS concluida BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE public.aulas ADD COLUMN IF NOT EXISTS live_iniciada BOOLEAN DEFAULT false NOT NULL;
