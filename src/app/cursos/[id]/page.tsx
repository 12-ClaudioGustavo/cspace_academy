'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { 
  getCourseById, 
  getLessons, 
  getEnrollments, 
  requestEnrollment, 
  Curso, 
  Aula, 
  Inscricao,
  isSupabaseConfigured
} from '@/lib/db'
import { createClient } from '@/lib/supabase/client'
import { 
  ArrowLeft, 
  CreditCard, 
  Upload, 
  FileText, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertTriangle,
  Info
} from 'lucide-react'

export default function CourseCheckoutPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  
  const [course, setCourse] = useState<Curso | null>(null)
  const [lessons, setLessons] = useState<Aula[]>([])
  const [enrollment, setEnrollment] = useState<Inscricao | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Estados do Formulário
  const [file, setFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }

    async function loadData() {
      if (!user) return
      try {
        const c = await getCourseById(id)
        if (!c) {
          router.push('/dashboard')
          return
        }
        setCourse(c)

        const myEnrollments = await getEnrollments(user.id)
        const foundEnroll = myEnrollments.find(e => e.curso_id === id)
        setEnrollment(foundEnroll || null)

        const listLessons = await getLessons(id)
        setLessons(listLessons)

        // Se já está aprovado, redireciona para a primeira aula
        if (foundEnroll?.status === 'aprovado' && listLessons.length > 0) {
          router.push(`/cursos/${id}/aula/${listLessons[0].id}`)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      loadData()
    }
  }, [user, authLoading, id, router])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
      setFileName(e.target.files[0].name)
    }
  }

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file && fileName === '') {
      setUploadError('Por favor, selecione um arquivo de comprovativo.')
      return
    }

    setSubmitting(true)
    setUploadError(null)

    try {
      let comprovativoUrl = '/proofs/dummy_receipt.pdf' // Fallback padrão

      if (user && course) {
        // Fluxo Real com Supabase Storage se configurado
        if (isSupabaseConfigured() && file) {
          const supabase = createClient()
          const fileExt = file.name.split('.').pop()
          const filePath = `${user.id}/${course.id}_${Date.now()}.${fileExt}`
          
          const { error: uploadErr, data } = await supabase.storage
            .from('comprovativos')
            .upload(filePath, file)
            
          if (uploadErr) {
            throw new Error(`Falha no upload: ${uploadErr.message}`)
          }
          
          const { data: { publicUrl } } = supabase.storage
            .from('comprovativos')
            .getPublicUrl(filePath)
            
          comprovativoUrl = publicUrl
        } else {
          // No modo demo, se o usuário digitou o nome do arquivo, simulamos o upload
          comprovativoUrl = `/proofs/simulado_${fileName || 'recebido.pdf'}`
        }

        const newEnroll = await requestEnrollment(user.id, course.id, comprovativoUrl)
        setEnrollment(newEnroll)
      }
    } catch (err: any) {
      setUploadError(err.message || 'Erro ao enviar comprovativo.')
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#070b13]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#070b13] dark:text-slate-100 font-sans pb-16">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 dark:bg-[#0c1220] dark:border-slate-800 py-4 px-6 sm:px-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-cyan-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao Dashboard</span>
          </Link>
          <span className="text-xs bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg text-slate-500 dark:text-slate-400">
            C-Space Academy
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 sm:px-8 mt-10">
        
        {/* Seção Principal: Informações do Curso */}
        <div className="grid gap-8 lg:grid-cols-3">
          
          {/* Esquerda: Detalhes do Curso */}
          <div className="lg:col-span-2 space-y-6">
            <div className="relative h-60 w-full rounded-2xl overflow-hidden shadow">
              <img 
                src={course?.capa_url} 
                alt={course?.titulo} 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                  {course?.titulo}
                </h1>
                <p className="text-xs sm:text-sm text-slate-200 mt-2 line-clamp-2 leading-relaxed">
                  {course?.descricao}
                </p>
              </div>
            </div>

            {/* Aulas/Cronograma Previsto */}
            <div className="p-6 bg-white dark:bg-[#0c1220] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" />
                <span>Cronograma da Formação ({lessons.length} dias)</span>
              </h2>
              
              <div className="space-y-4">
                {lessons.map((lesson) => (
                  <div 
                    key={lesson.id} 
                    className="flex gap-4 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors border border-slate-100/50 dark:border-slate-800/20"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-cyan-400 text-xs font-bold">
                      {lesson.ordem}
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {lesson.titulo}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {lesson.descricao}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Direita: Inscrição / Pagamento */}
          <div>
            
            {/* Caso 1: Não matriculado (Ou Rejeitado) */}
            {(!enrollment || enrollment.status === 'rejeitado') && (
              <div className="p-6 bg-white dark:bg-[#0c1220] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-6">
                
                {enrollment?.status === 'rejeitado' && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2">
                    <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Comprovativo Rejeitado</p>
                      <p className="mt-0.5 text-[10px]">O comprovativo enviado anteriormente foi rejeitado pelo administrador. Por favor, envie uma nova imagem legível.</p>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Preço do Curso</h3>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    {course?.preco.toLocaleString('pt-AO')} Kz
                  </div>
                </div>

                {/* Coordenadas Bancárias */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800/80 space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-indigo-500" />
                    <span>Dados de Transferência</span>
                  </h4>
                  <div className="text-[11px] space-y-2 text-slate-600 dark:text-slate-400 leading-normal">
                    <div>
                      <span className="block font-semibold">Banco:</span>
                      <span className="font-mono">BFA (Banco de Fomento Angola)</span>
                    </div>
                    <div>
                      <span className="block font-semibold">IBAN:</span>
                      <span className="font-mono bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 select-all block mt-0.5">
                        AO06.0006.0000.1234.5678.9012.3
                      </span>
                    </div>
                    <div>
                      <span className="block font-semibold">Titular:</span>
                      <span>C-Space Technologies, Lda</span>
                    </div>
                  </div>
                </div>

                {/* Formulário de Envio */}
                <form onSubmit={handleSubmitProof} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Comprovativo de Pagamento
                    </label>
                    <div className="relative border-2 border-dashed border-slate-200 hover:border-indigo-500/50 dark:border-slate-800 dark:hover:border-cyan-500/50 rounded-xl p-4 text-center cursor-pointer transition-colors">
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                      <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        {fileName ? fileName : 'Selecionar Recibo (Foto/PDF)'}
                      </p>
                      <p className="text-[9px] text-slate-400 mt-1">Formatos: JPG, PNG ou PDF</p>
                    </div>
                  </div>

                  {uploadError && (
                    <div className="text-[11px] text-rose-500 font-semibold">
                      {uploadError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-500 text-white rounded-xl font-bold text-xs shadow hover:from-indigo-700 hover:to-cyan-600 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <span>{submitting ? 'Enviando...' : 'Enviar Comprovativo'}</span>
                  </button>
                </form>
              </div>
            )}

            {/* Caso 2: Inscrição Pendente */}
            {enrollment && enrollment.status === 'pendente' && (
              <div className="p-6 bg-white dark:bg-[#0c1220] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-5 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">Pagamento em Análise</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    O seu comprovativo de transferência bancária foi recebido com sucesso. O administrador está a validar o pagamento.
                  </p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800/80 text-[10px] text-slate-500 dark:text-slate-400 text-left leading-normal space-y-2">
                  <div className="flex gap-2">
                    <Info className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>A liberação de acessos geralmente ocorre em menos de 1 hora durante horário útil.</span>
                  </div>
                </div>
                <Link 
                  href="/dashboard"
                  className="block w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors"
                >
                  Voltar ao Dashboard
                </Link>
              </div>
            )}

          </div>

        </div>

      </main>
    </div>
  )
}
