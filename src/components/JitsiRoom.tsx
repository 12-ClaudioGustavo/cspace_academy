'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Perfil } from '@/lib/db'
import { Shield, Users, Video } from 'lucide-react'

interface JitsiRoomProps {
  roomName: string
  user: Perfil
}

declare global {
  interface Window {
    JitsiMeetExternalAPI: any
  }
}

export function JitsiRoom({ roomName, user }: JitsiRoomProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<any>(null)
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 1. Carrega o script externo do Jitsi
  useEffect(() => {
    if (window.JitsiMeetExternalAPI) {
      setScriptLoaded(true)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://meet.jit.si/external_api.js'
    script.async = true
    script.onload = () => setScriptLoaded(true)
    script.onerror = () => setError('Não foi possível carregar o sistema de videoconferência. Verifique a sua ligação à internet.')
    document.body.appendChild(script)

    return () => {
      // Opcional: não removemos o script global para evitar recarregar
    }
  }, [])

  // 2. Inicializa a sala quando o script está pronto e o container está montado
  useEffect(() => {
    if (!scriptLoaded || !containerRef.current || apiRef.current) return

    try {
      const domain = 'meet.jit.si'
      const options = {
        roomName: roomName,
        width: '100%',
        height: '100%',
        parentNode: containerRef.current,
        userInfo: {
          email: user.email,
          displayName: user.nome,
        },
        configOverwrite: {
          startWithAudioMuted: user.role === 'aluno', // Aluno entra silenciado
          startWithVideoMuted: false,
          enableUserRolesBasedOnToken: false,
          prejoinPageEnabled: false, // Entrar direto
          disableDeepLinking: true, // Impedir redirecionamento para app móvel
          toolbarButtons: [
            'microphone',
            'camera',
            'closedcaptions',
            'desktop',
            'embedmeeting',
            'fullscreen',
            'fodeviceselection',
            'hangup',
            'profile',
            'chat',
            'raisehand',
            'videoquality',
            'tileview',
            'participants-pane',
            'mute-everyone', // Visível, mas Jitsi gerencia permissão de moderador
            'select-background'
          ],
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_BRAND_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          DEFAULT_BACKGROUND: '#090d16',
          TOOLBAR_BUTTONS: []
        }
      }

      const api = new window.JitsiMeetExternalAPI(domain, options)
      apiRef.current = api

      // Escuta eventos se necessário
      api.addEventListener('videoConferenceJoined', () => {
        console.log('Entrou na conferência Jitsi')
      })

    } catch (err: any) {
      console.error('Erro ao instanciar Jitsi Meet:', err)
      setError('Erro ao iniciar a videoconferência.')
    }

    return () => {
      if (apiRef.current) {
        apiRef.current.dispose()
        apiRef.current = null
      }
    }
  }, [scriptLoaded, roomName, user])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-slate-900 text-slate-300 p-6 rounded-xl border border-slate-800 text-center">
        <Video className="w-10 h-10 text-rose-500 mb-3" />
        <p className="text-xs font-semibold">{error}</p>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full bg-slate-900 rounded-2xl overflow-hidden shadow-inner border border-slate-800 flex flex-col">
      
      {/* Header interno da Live */}
      <div className="absolute top-0 inset-x-0 bg-slate-900/90 border-b border-slate-800/80 px-4 py-2 flex items-center justify-between z-20 pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[10px] font-bold text-slate-200 tracking-wider uppercase">Live Integrada</span>
        </div>
        <div className="flex items-center gap-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full text-[9px] font-semibold">
          {user.role === 'admin' ? (
            <>
              <Shield className="w-3 h-3" />
              <span>Modo Moderador</span>
            </>
          ) : (
            <>
              <Users className="w-3 h-3" />
              <span>Modo Aluno</span>
            </>
          )}
        </div>
      </div>

      {/* Container do Iframe Jitsi */}
      <div ref={containerRef} className="flex-1 w-full pt-10" />

      {/* Fallback de Carregamento */}
      {!scriptLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#090d16] z-10">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent mb-3" />
          <p className="text-xs text-slate-400">Ligando ao servidor de videoconferência...</p>
        </div>
      )}
    </div>
  )
}
