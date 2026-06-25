'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/context/AuthContext'
import { getCourses, Curso, isSupabaseConfigured } from '@/lib/db'
import { Logo } from '@/components/Logo'
import { 
  BookOpen, 
  Video, 
  FileText, 
  CheckCircle2, 
  ArrowRight, 
  HelpCircle, 
  Award, 
  CreditCard,
  ChevronDown,
  Lock,
  Mail,
  Send,
  Sparkles
} from 'lucide-react'

export default function LandingPage() {
  const { user, isDemo } = useAuth()
  const [courses, setCourses] = useState<Curso[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFaq, setActiveFaq] = useState<number | null>(null)

  // Newsletter states
  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'loading' | 'success' | 'already' | 'error'>('idle')

  useEffect(() => {
    async function loadData() {
      try {
        const list = await getCourses()
        setCourses(list)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newsletterEmail.trim()) return
    setNewsletterStatus('loading')
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsletterEmail.trim() })
      })
      const data = await res.json()
      if (res.status === 409 || data.error === 'already_subscribed') {
        setNewsletterStatus('already')
      } else if (res.ok) {
        setNewsletterStatus('success')
        setNewsletterEmail('')
      } else {
        setNewsletterStatus('error')
      }
    } catch {
      setNewsletterStatus('error')
    }
  }

  const faqs = [
    {
      q: 'Como funcionam as aulas ao vivo?',
      a: 'As aulas são transmitidas em tempo real diretamente na nossa plataforma às 19h00 (horário de Angola). Você terá um painel integrado para interagir com o professor, tirar dúvidas via chat, abrir a câmera/microfone e levantar a mão virtual.'
    },
    {
      q: 'Não consigo assistir no horário ao vivo, e agora?',
      a: 'Não se preocupe! Embora a chamada de vídeo feche após o término, todos os materiais da aula (como slides PDFs, códigos-fonte e exercícios práticos) ficam totalmente disponíveis na sua área do aluno para estudar quando quiser.'
    },
    {
      q: 'Como realizo o pagamento do curso?',
      a: 'O pagamento é feito por transferência bancária ou depósito (IBAN/Multicaixa). Após a transferência, você entra na plataforma, anexa o comprovante (imagem ou PDF) na área do curso e o administrador aprovará o seu acesso em instantes.'
    },
    {
      q: 'Receberei um certificado ao final da formação?',
      a: 'Sim! Todos os alunos que concluírem as aulas e realizarem os exercícios práticos diários receberão um certificado profissional emitido digitalmente pela C-Space Academy.'
    }
  ]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#070b13] dark:text-slate-100 font-sans transition-colors duration-300">
      
      {/* Banner de Modo Demo */}
      {isDemo && (
        <div className="bg-gradient-to-r from-amber-600 to-orange-700 text-white text-xs py-2 px-4 text-center font-medium flex items-center justify-center gap-2">
          <span>⚠️ Modo de Demonstração Ativo: O site está rodando com banco de dados local. Use o painel flutuante à direita para testar.</span>
        </div>
      )}

      {/* Header / Navegação */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800/80 dark:bg-[#070b13]/80 transition-colors">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 sm:px-8">
          <Link href="/">
            <Logo />
          </Link>
          
          <nav className="hidden md:flex items-center gap-8">
            <a href="#cursos" className="text-sm font-medium text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-cyan-400 transition-colors">
              Cursos
            </a>
            <a href="#beneficios" className="text-sm font-medium text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-cyan-400 transition-colors">
              Como Funciona
            </a>
            <a href="#faq" className="text-sm font-medium text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-cyan-400 transition-colors">
              Dúvidas
            </a>
          </nav>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline text-xs text-slate-500 dark:text-slate-400">
                  Olá, <strong className="font-semibold text-slate-700 dark:text-slate-200">{user.nome}</strong>
                </span>
                <Link
                  href={user.role === 'admin' ? '/admin' : '/dashboard'}
                  className="inline-flex h-9 items-center justify-center rounded-xl bg-indigo-600 px-4 text-xs font-semibold text-white shadow hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-all transform hover:scale-102"
                >
                  {user.role === 'admin' ? 'Painel Admin' : 'Minhas Aulas'}
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="inline-flex h-9 items-center justify-center rounded-xl px-4 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                >
                  Entrar
                </Link>
                <Link
                  href="/cadastro"
                  className="inline-flex h-9 items-center justify-center rounded-xl bg-indigo-600 px-4 text-xs font-semibold text-white shadow hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-all transform hover:scale-102"
                >
                  Cadastrar
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-24 md:pt-32 md:pb-36 bg-gradient-to-b from-indigo-50/30 via-transparent to-transparent dark:from-indigo-950/10">
        <div className="absolute inset-0 z-0 flex items-center justify-center opacity-30 dark:opacity-20 pointer-events-none">
          <div className="w-[500px] h-[500px] bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-6 sm:px-8 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/30 mb-6">
            🚀 Inscrições Abertas - Vagas Limitadas
          </span>
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl md:text-6xl leading-[1.1] sm:leading-[1.1]">
            Acelere a sua carreira em tecnologia com{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent dark:from-indigo-400 dark:to-cyan-300">
              Ensino Prático Próximo
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
            Plataforma LMS moderna com transmissões ao vivo integradas, materiais de apoio completos, fóruns e avaliação diária. Aprenda de verdade construindo projetos reais.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#cursos"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 px-6 font-semibold text-white shadow-lg hover:from-indigo-700 hover:to-cyan-600 transition-all transform hover:-translate-y-0.5"
            >
              Conhecer Cursos
            </a>
            <a
              href="#beneficios"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-300 bg-white/50 px-6 font-semibold text-slate-700 shadow-sm backdrop-blur hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:bg-slate-800 transition-all"
            >
              Como funciona?
            </a>
          </div>

          {/* Grid de Ícones em Destaque */}
          <div className="mx-auto mt-20 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4 px-4">
            {[
              { icon: Video, title: "Aulas ao Vivo", desc: "Interação direta" },
              { icon: FileText, title: "Materiais Didáticos", desc: "PDFs e códigos-fonte" },
              { icon: CheckCircle2, title: "Exercícios", desc: "Prática diária avaliada" },
              { icon: Award, title: "Certificado Válido", desc: "Garantia de conclusão" }
            ].map((item, idx) => (
              <div key={idx} className="flex flex-col items-center p-5 rounded-2xl bg-white/40 border border-slate-200/50 dark:bg-slate-900/30 dark:border-slate-800/50 shadow-sm backdrop-blur-sm hover:border-indigo-500/20 dark:hover:border-cyan-500/20 transition-all">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-cyan-400 mb-3">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200">{item.title}</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Seção Cursos */}
      <section id="cursos" className="py-20 border-t border-slate-200 dark:border-slate-800 bg-slate-100/30 dark:bg-slate-950/20">
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div className="text-center max-w-xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Nossas Formações Académicas
            </h2>
            <p className="text-slate-600 dark:text-slate-300 mt-4 text-sm sm:text-base">
              Explore nossos programas intensivos estruturados para levar você do zero ao mercado de trabalho.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
            </div>
          ) : (
            <div className="mx-auto mt-16 grid max-w-md gap-8 md:max-w-none md:grid-cols-2 lg:grid-cols-2 px-4 max-w-4xl">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="flex flex-col overflow-hidden rounded-2xl bg-white border border-slate-200/80 dark:bg-[#0c121e] dark:border-slate-800 shadow-lg hover:shadow-xl hover:border-indigo-500/30 dark:hover:border-cyan-500/30 transition-all duration-300"
                >
                  <div className="relative h-48 w-full bg-slate-200 dark:bg-slate-800">
                    <img
                      src={course.capa_url}
                      alt={course.titulo}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                    <span className="absolute bottom-4 left-4 inline-flex items-center rounded-lg bg-indigo-600 px-3 py-1 text-xs font-bold text-white shadow-md">
                      {course.preco > 0 ? `${course.preco.toLocaleString('pt-AO')} Kz` : 'Gratuito'}
                    </span>
                  </div>
                  
                  <div className="flex flex-1 flex-col justify-between p-6">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
                        {course.titulo}
                      </h3>
                      <p className="mt-3 text-xs text-slate-500 dark:text-slate-300 leading-relaxed">
                        {course.descricao}
                      </p>
                    </div>
                    
                    <div className="mt-6">
                      <Link
                        href={`/cursos/${course.id}`}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                      >
                        <span>Acessar Formação</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Seção Benefícios / Como funciona */}
      <section id="beneficios" className="py-20 border-t border-slate-200 dark:border-slate-800">
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                O melhor ecossistema para o seu aprendizado
              </h2>
              <p className="mt-4 text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
                Desenhamos a C-Space Academy pensando na melhor experiência do desenvolvedor. Aulas focadas na prática com apoio total do professor.
              </p>

              <div className="mt-8 space-y-6">
                {[
                  {
                    title: "Aulas ao vivo no Jitsi integrado",
                    desc: "Assista, participe com câmera e voz, tire dúvidas no chat e levante a mão sem sair da plataforma."
                  },
                  {
                    title: "Validação manual rápida",
                    desc: "Matricule-se enviando comprovativos de depósito/transferência bancária com aprovação rápida do administrador."
                  },
                  {
                    title: "Estudo flexível pós-live",
                    desc: "A live encerrou? Todos os PDFs da matéria, códigos e os exercícios para submissão continuam abertos."
                  }
                ].map((benefit, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{benefit.title}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{benefit.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative rounded-2xl bg-white/40 dark:bg-slate-900/40 p-2 border border-slate-200/50 dark:border-slate-800/50 shadow-2xl overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-cyan-500/10 opacity-50 group-hover:opacity-80 transition-opacity" />
              <img
                src="https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80"
                alt="Alunos estudando juntos"
                className="rounded-xl w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Seção FAQ */}
      <section id="faq" className="py-20 border-t border-slate-200 dark:border-slate-800 bg-slate-100/30 dark:bg-slate-950/10">
        <div className="mx-auto max-w-4xl px-6 sm:px-8">
          <div className="text-center max-w-xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center justify-center gap-2">
              <HelpCircle className="h-6 w-6 text-indigo-500" />
              <span>Perguntas Frequentes</span>
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-[#0c121e] overflow-hidden transition-all"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="flex w-full items-center justify-between p-6 text-left font-semibold text-slate-800 dark:text-slate-200 text-sm sm:text-base hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${activeFaq === idx ? 'rotate-180' : ''}`} />
                </button>
                {activeFaq === idx && (
                  <div className="p-6 pt-0 text-xs sm:text-sm text-slate-500 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/50">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SECÇÃO NEWSLETTER ===== */}
      <section id="newsletter" className="py-20 border-t border-slate-200 dark:border-slate-800 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 dark:opacity-15">
          <div className="w-[600px] h-[300px] bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-2xl px-6 sm:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/50 dark:border-indigo-800/30 px-4 py-1.5 mb-6">
            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
            <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">Newsletter C-Space Academy</span>
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Fique por dentro das{' '}
            <span className="bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent">
              novidades
            </span>
          </h2>
          <p className="mt-4 text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
            Receba em primeira mão alertas de novas turmas, datas de live, conteúdos gratuitos e promoções exclusivas para assinantes.
          </p>

          {newsletterStatus === 'success' ? (
            <div className="mt-8 flex flex-col items-center gap-3 p-6 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Subscrito com sucesso! 🎉</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-500">Receberá as novidades da C-Space Academy em primeira mão.</p>
            </div>
          ) : newsletterStatus === 'already' ? (
            <div className="mt-8 flex flex-col items-center gap-3 p-6 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-2xl">
              <Mail className="h-10 w-10 text-amber-500" />
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Este email já está subscrito!</p>
              <p className="text-xs text-amber-600 dark:text-amber-500">Já receberá as nossas novidades. Obrigado por fazer parte da comunidade.</p>
            </div>
          ) : (
            <form onSubmit={handleNewsletterSubmit} className="mt-8 flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 pointer-events-none">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  type="email"
                  required
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="O seu melhor email..."
                  className="block w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-indigo-500 dark:focus:border-cyan-500 text-slate-800 dark:text-slate-200 placeholder-slate-400 transition-colors shadow-sm"
                />
              </div>
              <button
                type="submit"
                disabled={newsletterStatus === 'loading'}
                className="inline-flex items-center justify-center gap-2 h-12 px-6 bg-gradient-to-r from-indigo-600 to-cyan-500 text-white rounded-xl font-semibold text-sm hover:from-indigo-700 hover:to-cyan-600 shadow-lg transition-all disabled:opacity-60 whitespace-nowrap"
              >
                {newsletterStatus === 'loading' ? (
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span>{newsletterStatus === 'loading' ? 'Enviando...' : 'Subscrever'}</span>
              </button>
            </form>
          )}

          {newsletterStatus === 'error' && (
            <p className="mt-3 text-xs text-rose-500">Ocorreu um erro. Tente novamente.</p>
          )}

          <p className="mt-4 text-[11px] text-slate-400">
            Sem spam. Cancelamento a qualquer momento. Os seus dados estão seguros.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 py-10 bg-white dark:bg-[#070b13] transition-colors">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-slate-500 dark:text-slate-400 text-xs">
          <Logo height="h-6 sm:h-7 md:h-8" />
          <div className="flex items-center gap-6">
            <Link href="/recuperar-senha" className="hover:text-indigo-500 transition-colors">Recuperar Senha</Link>
            <Link href="/cadastro" className="hover:text-indigo-500 transition-colors">Cadastrar</Link>
            <Link href="/login" className="hover:text-indigo-500 transition-colors">Login</Link>
          </div>
          <p>© {new Date().getFullYear()} C-Space Technologies. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
