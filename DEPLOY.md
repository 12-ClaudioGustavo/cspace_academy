# C-Space Academy — Guia de Deploy & Configuração

> **Tempo estimado:** 15 minutos  
> **Pré-requisito:** Conta no Supabase e projeto criado em https://supabase.com

---

## 1. Configurar o Banco de Dados (Supabase)

### 1.1 Executar o SQL de Setup Completo

1. Acede ao painel do teu projeto em [supabase.com](https://supabase.com)
2. Vai a **SQL Editor** → **New Query**
3. Copia o conteúdo de `supabase_setup_completo.sql` (na raiz do projecto)
4. Cola e clica em **Run**

> ✅ Este único ficheiro cria **todas as tabelas**, **triggers**, **políticas RLS** e **buckets de Storage**.

---

## 2. Configurar as URLs de Email (Supabase Auth)

> **CRÍTICO** — sem isto os links de confirmação de conta e reset de senha não funcionam em produção.

1. No painel do Supabase → **Authentication** → **URL Configuration**

| Campo | Valor |
|---|---|
| **Site URL** | `https://cspace-academy.vercel.app` |
| **Redirect URLs** | `https://cspace-academy.vercel.app/**` |

2. Clica em **Save**

---

## 3. Criar o Utilizador Admin Inicial

O primeiro admin tem de ser criado manualmente:

1. No Supabase → **Authentication** → **Users** → **Add User** (Invite)
2. Introduz o teu email → confirma a conta
3. No **SQL Editor**, executa:

```sql
UPDATE public.perfis 
SET role = 'admin' 
WHERE email = 'o-teu-email@exemplo.com';
```

---

## 4. Configurar as Variáveis de Ambiente na Vercel

1. Vai ao teu projecto em [vercel.com](https://vercel.com)
2. **Settings** → **Environment Variables**
3. Adiciona as 3 variáveis:

| Nome | Onde obter |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → `anon public` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → `service_role secret` |

4. Marca todas com **Environment: Production + Preview + Development**
5. Clica **Save** e faz **Redeploy** (para as variáveis terem efeito)

---

## 5. Configurar os Templates de Email (Supabase)

1. Supabase → **Authentication** → **Email Templates**

### Confirmação de Conta (Confirm signup)
Substitui `{{ .ConfirmationURL }}` por:
```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup
```

### Reset de Senha (Reset password)
Substitui `{{ .ConfirmationURL }}` por:
```
{{ .SiteURL }}/atualizar-senha?token_hash={{ .TokenHash }}&type=recovery
```

> **Nota:** Os templates padrão do Supabase já devem funcionar, mas se os links redireccionarem para `localhost`, verifica a URL em Authentication → URL Configuration.

---

## 6. Verificar os Buckets de Storage

1. Supabase → **Storage**
2. Confirma que os 3 buckets existem:

| Bucket | Público | Uso |
|---|---|---|
| `comprovativos` | ❌ Privado | Uploads de comprovativos de pagamento |
| `materiais` | ✅ Público | PDFs de aulas |
| `capas` | ✅ Público | Imagens de capa dos cursos |

> O SQL de setup já cria estes buckets automaticamente.

---

## 7. Teste de Ponta a Ponta (Checklist de Produção)

- [ ] Cadastro → email de confirmação chega → link funciona → sessão criada
- [ ] "Esqueci a senha" → email chega → link abre `/atualizar-senha` → senha alterada
- [ ] Aluno inscreve-se num curso → faz upload de comprovativo → admin aprova
- [ ] Aluno acede à sala de aula → vê materiais e exercícios
- [ ] Professor inicia live → aluno vê botão "Entrar" → sala WebRTC abre
- [ ] Email subscrito na newsletter → aparece na aba "Newsletter" do painel Admin
- [ ] Certificado gerado após 100% de progresso

---

## Variáveis de Ambiente — Ficheiro `.env.local` (Local)

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Comandos de Desenvolvimento

```bash
# Instalar dependências
npm install

# Servidor de desenvolvimento
npm run dev

# Build de produção (verificação local)
npm run build
```
