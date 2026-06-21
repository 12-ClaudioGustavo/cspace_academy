'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Perfil, isSupabaseConfigured } from '@/lib/db'
import { createClient } from '@/lib/supabase/client'
import { 
  Video, VideoOff, Mic, MicOff, Monitor, StopCircle, 
  Play, Users, Shield, AlertCircle, RefreshCw, ExternalLink 
} from 'lucide-react'

interface CustomLiveRoomProps {
  roomName: string
  user: Perfil
}

export function CustomLiveRoom({ roomName, user }: CustomLiveRoomProps) {
  const isProfessor = user.role === 'professor' || user.role === 'admin'
  
  // Deteta se o roomName é um link de streaming externo
  const isExternalUrl = 
    roomName.startsWith('http://') || 
    roomName.startsWith('https://') || 
    roomName.includes('youtube.com') || 
    roomName.includes('youtu.be') || 
    roomName.includes('twitch.tv') || 
    roomName.includes('.m3u8')

  if (isExternalUrl) {
    return <ExternalStreamPlayer url={roomName} />
  }

  return <WebRTCLiveRoom roomName={roomName} user={user} isProfessor={isProfessor} />
}

// ==========================================
// 1. JOGADOR DE STREAM EXTERNO (Fallback)
// ==========================================
function ExternalStreamPlayer({ url }: { url: string }) {
  const isYouTube = url.includes('youtube.com') || url.includes('youtu.be')
  const isTwitch = url.includes('twitch.tv')

  let embedUrl = url
  if (isYouTube) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
    const match = url.match(regExp)
    const videoId = (match && match[2].length === 11) ? match[2] : null
    embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1` : url
  } else if (isTwitch) {
    // Extrai o canal
    const match = url.match(/twitch\.tv\/([a-zA-Z0-9_]+)/)
    const channel = match ? match[1] : null
    embedUrl = channel ? `https://player.twitch.tv/?channel=${channel}&parent=${window.location.hostname}&autoplay=true` : url
  }

  return (
    <div className="relative h-full w-full bg-slate-950 rounded-2xl overflow-hidden flex flex-col border border-slate-800">
      <div className="absolute top-3 left-3 bg-red-650 bg-red-600 text-white font-bold text-[9px] px-2.5 py-1 rounded-full uppercase tracking-wider animate-pulse z-15 flex items-center gap-1 shadow-lg">
        <span className="w-1.5 h-1.5 rounded-full bg-white" />
        <span>Live Externa</span>
      </div>

      <div className="flex-1 w-full h-full">
        {isYouTube || isTwitch ? (
          <iframe
            src={embedUrl}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-350 p-6 text-center space-y-4">
            <Video className="w-12 h-12 text-indigo-400 animate-pulse" />
            <div>
              <h3 className="font-bold text-white text-sm">Aula ao Vivo Programada</h3>
              <p className="text-[11px] text-slate-450 mt-1 max-w-sm">Esta live está sendo transmitida por uma plataforma externa.</p>
            </div>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-xs font-semibold shadow transition-colors"
            >
              <span>Abrir Transmissão Externa</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

// ==========================================
// 2. SALA WEBRTC IN-HOUSE (P2P + Supabase)
// ==========================================
function WebRTCLiveRoom({ 
  roomName, user, isProfessor 
}: { roomName: string, user: Perfil, isProfessor: boolean }) {
  
  const [streamActive, setStreamActive] = useState(false)
  const [onlineStudents, setOnlineStudents] = useState<string[]>([])
  const [micOn, setMicOn] = useState(true)
  const [cameraOn, setCameraOn] = useState(true)
  const [sharingScreen, setSharingScreen] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  
  const localStreamRef = useRef<MediaStream | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  
  // Conexões WebRTC
  // Professor guarda conexão para cada estudante: { [studentId]: RTCPeerConnection }
  const pcsRef = useRef<{ [key: string]: RTCPeerConnection }>({})
  // Estudante guarda conexão com o Professor
  const pcRef = useRef<RTCPeerConnection | null>(null)
  
  // Canal Supabase Realtime
  const channelRef = useRef<any>(null)
  const supabase = isSupabaseConfigured() ? createClient() : null

  // 1. Inicializa o Canal de Realtime e Presença
  useEffect(() => {
    if (!supabase) {
      // Modo Mock: simula sinalização
      setOnlineStudents(['António Silva (Mock)', 'Estudante Simulado'])
      return
    }

    const channelId = `live_channel_${roomName}`
    const channel = supabase.channel(channelId, {
      config: {
        presence: {
          key: user.id
        }
      }
    })

    channelRef.current = channel

    // Ouvir mensagens de sinalização do WebRTC
    channel.on('broadcast', { event: 'webrtc-signal' }, async ({ payload }) => {
      const { targetId, senderId, type, data } = payload
      
      // Apenas processa se for direcionado a mim
      if (targetId !== user.id) return

      try {
        if (type === 'offer' && !isProfessor) {
          // Estudante recebe proposta do Professor
          await handleOffer(senderId, data)
        } else if (type === 'answer' && isProfessor) {
          // Professor recebe resposta do Estudante
          await handleAnswer(senderId, data)
        } else if (type === 'ice-candidate') {
          // Ambos recebem candidatos ICE
          const pc = isProfessor ? pcsRef.current[senderId] : pcRef.current
          if (pc && pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(data))
          }
        }
      } catch (err) {
        console.error('Erro no processamento do sinal WebRTC:', err)
      }
    })

    // Presença: rastrear quem está online na sala
    channel.on('presence', { event: 'sync' }, () => {
      const presenceState = channel.presenceState()
      const list: string[] = []
      Object.keys(presenceState).forEach(id => {
        const pres = presenceState[id] as any
        if (pres && pres[0]) {
          list.push(pres[0].nome || 'Utilizador')
        }
      })
      setOnlineStudents(list.filter(n => n !== user.nome))
    })

    // Inscreve no canal com metadata do utilizador
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          nome: user.nome,
          role: user.role
        })
      }
    })

    return () => {
      channel.unsubscribe()
      cleanupWebRTC()
    }
  }, [roomName, user, isProfessor])

  // Limpa streams e peer connections
  const cleanupWebRTC = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop())
      localStreamRef.current = null
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop())
      screenStreamRef.current = null
    }
    
    // Fecha conexões do Professor
    Object.values(pcsRef.current).forEach(pc => pc.close())
    pcsRef.current = {}
    
    // Fecha conexão do Estudante
    if (pcRef.current) {
      pcRef.current.close()
      pcRef.current = null
    }
    
    setStreamActive(false)
    setSharingScreen(false)
  }

  // ==========================================
  // LOGICA DO PROFESSOR (Broadcaster)
  // ==========================================
  const startBroadcast = async () => {
    try {
      setErrorMsg(null)
      // Captura camera e microfone
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true
      })
      localStreamRef.current = stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }
      setStreamActive(true)

      // Se houver estudantes já presentes na sala, inicia conexões
      if (channelRef.current && supabase) {
        const presence = channelRef.current.presenceState()
        Object.keys(presence).forEach(studentId => {
          if (studentId !== user.id) {
            initiateConnectionToStudent(studentId, stream)
          }
        })
      }
    } catch (err: any) {
      console.error(err)
      setErrorMsg('Sem permissão de acesso à câmara/microfone. Dê autorização no seu navegador.')
    }
  }

  const initiateConnectionToStudent = async (studentId: string, stream: MediaStream) => {
    if (pcsRef.current[studentId]) {
      pcsRef.current[studentId].close()
    }

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    })
    pcsRef.current[studentId] = pc

    // Adiciona tracks locais
    stream.getTracks().forEach(track => pc.addTrack(track, stream))

    // Envia candidatos ICE
    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'webrtc-signal',
          payload: {
            targetId: studentId,
            senderId: user.id,
            type: 'ice-candidate',
            data: event.candidate
          }
        })
      }
    }

    // Cria oferta SDP
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'webrtc-signal',
        payload: {
          targetId: studentId,
          senderId: user.id,
          type: 'offer',
          data: offer
        }
      })
    }
  }

  const handleAnswer = async (studentId: string, answer: RTCSessionDescriptionInit) => {
    const pc = pcsRef.current[studentId]
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer))
    }
  }

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !micOn
        setMicOn(!micOn)
      }
    }
  }

  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !cameraOn
        setCameraOn(!cameraOn)
      }
    }
  }

  const toggleScreenShare = async () => {
    if (sharingScreen) {
      // Desativa Screen Share, retorna para Câmara
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop())
        screenStreamRef.current = null
      }
      
      const cameraTrack = localStreamRef.current?.getVideoTracks()[0]
      if (cameraTrack) {
        // Substitui track em todas as conexões
        Object.values(pcsRef.current).forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video')
          if (sender) sender.replaceTrack(cameraTrack)
        })
      }
      setSharingScreen(false)
    } else {
      // Inicia Screen Share
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true })
        screenStreamRef.current = stream
        const screenTrack = stream.getVideoTracks()[0]

        // Quando o compartilhamento de tela é interrompido pelo utilizador nativamente
        screenTrack.onended = () => {
          toggleScreenShare()
        }

        // Substitui track em todas as conexões de alunos ativos
        Object.values(pcsRef.current).forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video')
          if (sender) sender.replaceTrack(screenTrack)
        })

        // Atualiza localVideo preview do professor
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
        }

        setSharingScreen(true)
      } catch (err) {
        console.error(err)
      }
    }
  }

  // ==========================================
  // LOGICA DO ESTUDANTE (Viewer)
  // ==========================================
  const handleOffer = async (professorId: string, offer: RTCSessionDescriptionInit) => {
    if (pcRef.current) {
      pcRef.current.close()
    }

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    })
    pcRef.current = pc

    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'webrtc-signal',
          payload: {
            targetId: professorId,
            senderId: user.id,
            type: 'ice-candidate',
            data: event.candidate
          }
        })
      }
    };

    pc.ontrack = (event) => {
      setStreamActive(true)
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0]
      }
    }

    await pc.setRemoteDescription(new RTCSessionDescription(offer))
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'webrtc-signal',
        payload: {
          targetId: professorId,
          senderId: user.id,
          type: 'answer',
          data: answer
        }
      })
    }
  }

  return (
    <div className="relative h-full w-full bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-slate-800/80 flex flex-col min-h-[300px] sm:min-h-[450px]">
      
      {/* Badge Estado Live */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        {streamActive ? (
          <span className="flex items-center gap-1 px-3 py-1 text-[9px] font-bold rounded-full bg-red-600 text-white shadow-lg animate-pulse uppercase tracking-wider">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
            <span>AO VIVO</span>
          </span>
        ) : (
          <span className="flex items-center gap-1 px-3 py-1 text-[9px] font-bold rounded-full bg-slate-850 bg-slate-800 text-slate-450 border border-slate-700/50 uppercase tracking-wider">
            <span>OFF-LINE</span>
          </span>
        )}
        
        <span className="flex items-center gap-1 px-2.5 py-1 text-[9px] font-bold rounded-full bg-slate-900/80 text-indigo-400 border border-slate-800/60 shadow">
          <Users className="w-3 h-3 text-indigo-500" />
          <span>{onlineStudents.length + 1} online</span>
        </span>
      </div>

      {/* Título de Perfil/Moderador */}
      <div className="absolute top-4 right-4 z-20">
        <span className="hidden sm:inline-flex items-center gap-1 bg-slate-900/95 border border-slate-850 px-3 py-1 rounded-full text-[9px] font-bold text-slate-300">
          {isProfessor ? <Shield className="w-3 h-3 text-indigo-400" /> : <Users className="w-3 h-3 text-indigo-400" />}
          <span>{isProfessor ? 'Professor / Canal' : 'Aluno / Visualizador'}</span>
        </span>
      </div>

      {/* Main Stream Area */}
      <div className="flex-1 w-full relative flex items-center justify-center bg-[#070b13]">
        {isProfessor ? (
          streamActive ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
          ) : (
            <div className="text-center p-6 space-y-4 max-w-sm">
              <div className="h-12 w-12 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20">
                <Video className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-200 text-sm">Iniciar Live do Professor</h3>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Pronto para transmitir a sua aula? Utilize o nosso sistema WebRTC in-house sem limite de tempo para se conectar diretamente com seus alunos.
                </p>
              </div>
              <button
                onClick={startBroadcast}
                className="w-full px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow transition-colors flex items-center justify-center gap-1.5"
              >
                <Play className="w-4 h-4" />
                <span>Iniciar Transmissão de 2h+</span>
              </button>
            </div>
          )
        ) : (
          streamActive ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center p-6 space-y-3">
              <div className="h-10 w-10 animate-pulse rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/15">
                <RefreshCw className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-300 text-xs">Aguardando o Professor...</h3>
                <p className="text-[10px] text-slate-500 mt-1 leading-normal max-w-xs mx-auto">
                  A aula iniciará automaticamente assim que o professor iniciar a sua transmissão WebRTC em tempo real.
                </p>
              </div>
            </div>
          )
        )}

        {/* Error overlay */}
        {errorMsg && (
          <div className="absolute inset-0 bg-[#090d16]/95 z-30 flex flex-col items-center justify-center p-6 text-center">
            <AlertCircle className="w-10 h-10 text-rose-500 mb-3" />
            <h4 className="font-bold text-slate-200 text-sm">Erro de Ligação</h4>
            <p className="text-[11px] text-slate-450 mt-1 max-w-xs leading-normal">{errorMsg}</p>
            <button
              onClick={() => { setErrorMsg(null); startBroadcast(); }}
              className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold border border-slate-750 transition-colors"
            >
              Tentar Novamente
            </button>
          </div>
        )}
      </div>

      {/* Professor Controls Drawer (Apenas para Professor Ativo) */}
      {isProfessor && streamActive && (
        <div className="p-4 bg-slate-900 border-t border-slate-850 flex items-center justify-between gap-4 z-20">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMic}
              className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                micOn 
                  ? 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-200' 
                  : 'bg-rose-500/15 border-rose-500/25 text-rose-400 hover:bg-rose-500/25'
              }`}
              title={micOn ? 'Desativar Microfone' : 'Ativar Microfone'}
            >
              {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>
            <button
              onClick={toggleCamera}
              className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                cameraOn 
                  ? 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-200' 
                  : 'bg-rose-500/15 border-rose-500/25 text-rose-400 hover:bg-rose-500/25'
              }`}
              title={cameraOn ? 'Desativar Câmara' : 'Ativar Câmara'}
            >
              {cameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            </button>
            <button
              onClick={toggleScreenShare}
              className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                sharingScreen 
                  ? 'bg-indigo-600 border-indigo-500 text-white' 
                  : 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-200'
              }`}
              title={sharingScreen ? 'Partilhar Câmara' : 'Partilhar Ecrã'}
            >
              <Monitor className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={cleanupWebRTC}
            className="px-4 py-2 bg-rose-650 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition-colors"
          >
            <StopCircle className="w-4 h-4" />
            <span>Encerrar Live</span>
          </button>
        </div>
      )}
    </div>
  )
}
