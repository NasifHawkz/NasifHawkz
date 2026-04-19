import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Chat from "@/components/Chat";
import {
  Monitor,
  MonitorOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  ArrowLeft,
  Play,
  Pause,
  MessageCircle,
  X,
  CircleDot,
  Volume2,
  VolumeX,
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const ICE_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export default function WatchRoom() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode");

  // State
  const [messages, setMessages] = useState([]);
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [partnerName, setPartnerName] = useState("");
  const [wsConnected, setWsConnected] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [remoteScreen, setRemoteScreen] = useState(null);
  const [isInCall, setIsInCall] = useState(false);
  const [callType, setCallType] = useState(null);
  const [localVideoEnabled, setLocalVideoEnabled] = useState(true);
  const [localAudioEnabled, setLocalAudioEnabled] = useState(true);
  const [showChat, setShowChat] = useState(true);
  const [syncNotif, setSyncNotif] = useState(null);
  const [floatingReactions, setFloatingReactions] = useState([]);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [partnerLastReadId, setPartnerLastReadId] = useState(null);
  const [iceConfig, setIceConfig] = useState(ICE_CONFIG);
  const typingTimeoutRef = useRef(null);

  // Refs
  const wsRef = useRef(null);
  const screenPcRef = useRef(null);
  const callPcRef = useRef(null);
  const localScreenRef = useRef(null);
  const localCallRef = useRef(null);
  const screenVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const iceCandidatesQueue = useRef({ screen: [], call: [] });
  const reconnectTimer = useRef(null);
  const cleaningUpRef = useRef(false);
  const handleWSMessageRef = useRef(null);

  // Load chat history
  useEffect(() => {
    axios
      .get(`${API}/messages?limit=50`, { withCredentials: true })
      .then(({ data }) => setMessages(data))
      .catch(() => {});
  }, []);

  // Fetch ICE config (TURN/STUN servers)
  useEffect(() => {
    axios
      .get(`${API}/ice-config`, { withCredentials: true })
      .then(({ data }) => { if (data?.iceServers) setIceConfig(data); })
      .catch(() => {});
  }, []);

  // Fetch partner info
  useEffect(() => {
    axios
      .get(`${API}/partner/info`, { withCredentials: true })
      .then(({ data }) => {
        if (data.paired) setPartnerName(data.partner_name);
      })
      .catch(() => {});
  }, []);

  // Keep message handler ref current - assigned after definition below
  // handleWSMessageRef.current is set below after handleWSMessage is defined

  // WebSocket connection - guards against StrictMode double-mount
  useEffect(() => {
    if (!token || !user?.couple_id) return;
    cleaningUpRef.current = false;
    const timerRef = reconnectTimer.current;

    const wsUrl = `${BACKEND_URL.replace(/^http/, "ws")}/api/ws?token=${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!cleaningUpRef.current) setWsConnected(true);
    };

    ws.onclose = () => {
      if (!cleaningUpRef.current) {
        setWsConnected(false);
        setPartnerOnline(false);
      }
    };

    ws.onmessage = (e) => {
      if (cleaningUpRef.current) return;
      try {
        const data = JSON.parse(e.data);
        if (handleWSMessageRef.current) handleWSMessageRef.current(data);
      } catch {
        /* ignore */
      }
    };

    return () => {
      cleaningUpRef.current = true;
      if (timerRef) clearTimeout(timerRef);
      ws.close();
      wsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.couple_id]);

  // Auto-start video call if mode=video
  useEffect(() => {
    if (mode === "video" && wsConnected && partnerOnline) {
      startCall("video");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, wsConnected, partnerOnline]);

  const handleWSMessage = (data) => {
    switch (data.type) {
      case "chat_message":
        setMessages((prev) => [...prev, data]);
        break;
      case "reaction":
        setMessages((prev) =>
          prev.map((m) =>
            m.id === data.message_id
              ? { ...m, reactions: [...(m.reactions || []), { emoji: data.emoji, user_id: data.user_id }] }
              : m
          )
        );
        break;
      case "partner_online":
        setPartnerOnline(true);
        toast.success("Your partner joined the room!");
        break;
      case "partner_offline":
        setPartnerOnline(false);
        toast.info("Partner left the room");
        break;
      case "webrtc_offer":
        handleOffer(data);
        break;
      case "webrtc_answer":
        handleAnswer(data);
        break;
      case "ice_candidate":
        handleIceCandidate(data);
        break;
      case "call_offer":
        handleCallOffer(data);
        break;
      case "call_answer":
        handleCallAnswer(data);
        break;
      case "call_end":
        endCallCleanup();
        toast.info("Call ended");
        break;
      case "sync_play":
        showSyncNotification("play", data.sender_name);
        break;
      case "sync_pause":
        showSyncNotification("pause", data.sender_name);
        break;
      case "screen_share_stop":
        setRemoteScreen(null);
        if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
        toast.info("Screen sharing stopped");
        break;
      case "typing":
        setIsPartnerTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setIsPartnerTyping(false), 3000);
        break;
      case "messages_read":
        setPartnerLastReadId(data.last_message_id);
        break;
      default:
        break;
    }
  };

  // Keep the ref current so WS onmessage always uses the latest handler
  handleWSMessageRef.current = handleWSMessage;

  // Screen sharing
  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
        audio: true,
      });
      const pc = new RTCPeerConnection(iceConfig);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      pc.onicecandidate = (e) => {
        if (e.candidate)
          wsRef.current?.send(JSON.stringify({ type: "ice_candidate", candidate: e.candidate, purpose: "screen" }));
      };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "webrtc_offer", sdp: pc.localDescription, purpose: "screen" }));
      }
      screenPcRef.current = pc;
      localScreenRef.current = stream;
      setIsSharing(true);
      stream.getVideoTracks()[0].onended = () => stopScreenShare();
    } catch (err) {
      if (err.name !== "NotAllowedError") toast.error("Could not start screen sharing");
    }
  };

  const stopScreenShare = () => {
    localScreenRef.current?.getTracks().forEach((t) => t.stop());
    screenPcRef.current?.close();
    screenPcRef.current = null;
    localScreenRef.current = null;
    setIsSharing(false);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "screen_share_stop" }));
    }
  };

  // Video/Voice call
  const startCall = async (type) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === "video",
        audio: true,
      });
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      const pc = new RTCPeerConnection(iceConfig);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      pc.ontrack = (e) => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
      };
      pc.onicecandidate = (e) => {
        if (e.candidate)
          wsRef.current?.send(JSON.stringify({ type: "ice_candidate", candidate: e.candidate, purpose: "call" }));
      };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "call_offer", call_type: type }));
        wsRef.current.send(JSON.stringify({ type: "webrtc_offer", sdp: pc.localDescription, purpose: "call" }));
      }
      callPcRef.current = pc;
      localCallRef.current = stream;
      setIsInCall(true);
      setCallType(type);
    } catch (err) {
      toast.error("Could not access camera/microphone");
    }
  };

  const endCall = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "call_end" }));
    }
    endCallCleanup();
  };

  const endCallCleanup = () => {
    localCallRef.current?.getTracks().forEach((t) => t.stop());
    callPcRef.current?.close();
    callPcRef.current = null;
    localCallRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setIsInCall(false);
    setCallType(null);
  };

  const toggleVideo = () => {
    const track = localCallRef.current?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setLocalVideoEnabled(track.enabled);
    }
  };

  const toggleAudio = () => {
    const track = localCallRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setLocalAudioEnabled(track.enabled);
    }
  };

  // WebRTC signaling handlers
  const handleOffer = async (data) => {
    const purpose = data.purpose || "screen";
    const pc = new RTCPeerConnection(iceConfig);
    if (purpose === "screen") {
      pc.ontrack = (e) => {
        if (screenVideoRef.current) screenVideoRef.current.srcObject = e.streams[0];
        setRemoteScreen(e.streams[0]);
      };
      screenPcRef.current = pc;
    } else {
      pc.ontrack = (e) => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
      };
      callPcRef.current = pc;
    }
    pc.onicecandidate = (e) => {
      if (e.candidate)
        wsRef.current?.send(JSON.stringify({ type: "ice_candidate", candidate: e.candidate, purpose }));
    };
    if (purpose === "call" && localCallRef.current) {
      localCallRef.current.getTracks().forEach((t) => pc.addTrack(t, localCallRef.current));
    }
    await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
    const queued = iceCandidatesQueue.current[purpose] || [];
    for (const c of queued) {
      await pc.addIceCandidate(new RTCIceCandidate(c));
    }
    iceCandidatesQueue.current[purpose] = [];
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    wsRef.current?.send(JSON.stringify({ type: "webrtc_answer", sdp: pc.localDescription, purpose }));
  };

  const handleAnswer = async (data) => {
    const purpose = data.purpose || "screen";
    const pc = purpose === "screen" ? screenPcRef.current : callPcRef.current;
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      const queued = iceCandidatesQueue.current[purpose] || [];
      for (const c of queued) {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      }
      iceCandidatesQueue.current[purpose] = [];
    }
  };

  const handleIceCandidate = async (data) => {
    const purpose = data.purpose || "screen";
    const pc = purpose === "screen" ? screenPcRef.current : callPcRef.current;
    if (pc && pc.remoteDescription) {
      await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    } else {
      if (!iceCandidatesQueue.current[purpose]) iceCandidatesQueue.current[purpose] = [];
      iceCandidatesQueue.current[purpose].push(data.candidate);
    }
  };

  const handleCallOffer = async (data) => {
    const type = data.call_type || "video";
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === "video",
        audio: true,
      });
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      localCallRef.current = stream;
      setIsInCall(true);
      setCallType(type);
    } catch {
      toast.error("Could not access camera/microphone");
    }
  };

  const handleCallAnswer = () => {};

  // Sync signals
  const sendSync = (action) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: `sync_${action}` }));
    }
    showSyncNotification(action, "You");
  };

  const showSyncNotification = (action, name) => {
    setSyncNotif(`${name} pressed ${action}`);
    setTimeout(() => setSyncNotif(null), 2000);
  };

  // Chat handlers
  const sendMessage = (content, msgType) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "chat_message", content, message_type: msgType }));
    } else {
      toast.error("Reconnecting... try again in a moment");
    }
  };

  const sendReaction = (messageId, emoji) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "reaction", message_id: messageId, emoji }));
    }
  };

  const sendTyping = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "typing" }));
    }
  };

  const sendReadReceipt = (lastMsgId) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && lastMsgId) {
      wsRef.current.send(JSON.stringify({ type: "messages_read", last_message_id: lastMsgId }));
    }
  };

  return (
    <div className="h-screen watch-room-bg flex flex-col">
      {/* Top Bar */}
      <div className="glass-dark px-4 py-3 flex items-center justify-between z-20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button
            data-testid="back-to-dashboard"
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="text-white/70 hover:text-white hover:bg-white/10 rounded-full"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-base md:text-lg font-bold text-white">Watch Room</h2>
          <Badge
            data-testid="partner-online-badge"
            className={`rounded-full text-xs ${
              partnerOnline ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-slate-400"
            }`}
          >
            <CircleDot className="w-3 h-3 mr-1" />
            {partnerOnline ? partnerName || "Partner" : "Waiting..."}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            data-testid="toggle-chat-sidebar"
            variant="ghost"
            size="sm"
            onClick={() => setShowChat(!showChat)}
            className="text-white/70 hover:text-white hover:bg-white/10 rounded-full lg:hidden"
          >
            {showChat ? <X className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Screen Area */}
        <div className={`flex-1 relative flex items-center justify-center ${showChat ? "lg:mr-0" : ""}`}>
          {/* Remote screen */}
          {remoteScreen ? (
            <video
              ref={screenVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-contain"
              data-testid="remote-screen-video"
            />
          ) : isSharing ? (
            <div className="text-center text-white/70">
              <Monitor className="w-16 h-16 mx-auto mb-4 text-[#D8B4E2]" />
              <p className="text-lg font-semibold">You are sharing your screen</p>
              <p className="text-sm text-white/50 mt-1">Your partner can see your screen now</p>
            </div>
          ) : (
            <div className="text-center text-white/70">
              <div
                className="w-64 h-40 rounded-2xl mx-auto mb-6 bg-cover bg-center opacity-40"
                style={{
                  backgroundImage: `url(https://images.pexels.com/photos/21832930/pexels-photo-21832930.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940)`,
                }}
              />
              <p className="text-lg font-semibold text-white/80">Ready for movie night?</p>
              <p className="text-sm text-white/50 mt-1">
                {partnerOnline ? "Share your screen to start watching!" : "Waiting for your partner to join..."}
              </p>
            </div>
          )}

          {/* Sync notification */}
          {syncNotif && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 glass-dark rounded-full px-4 py-2 animate-fade-in-up z-20">
              <p className="text-sm text-white font-medium">{syncNotif}</p>
            </div>
          )}

          {/* Floating reactions */}
          {floatingReactions.map((r) => (
            <div
              key={r.id}
              className="absolute bottom-24 animate-float-up text-4xl pointer-events-none z-30"
              style={{ left: `${r.x}%` }}
            >
              {r.emoji}
            </div>
          ))}

          {/* Video call PIP */}
          {isInCall && (
            <div className="absolute top-4 right-4 flex gap-2 z-20">
              <div className="w-40 h-28 rounded-2xl overflow-hidden border border-white/20 bg-black/50">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                  data-testid="remote-video"
                />
              </div>
              <div className="w-28 h-20 rounded-xl overflow-hidden border border-white/10 bg-black/30">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover mirror"
                  data-testid="local-video"
                />
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 glass-dark rounded-full px-4 py-3 flex items-center gap-3 z-20">
            <Button
              data-testid="screen-share-button"
              variant="ghost"
              size="sm"
              onClick={isSharing ? stopScreenShare : startScreenShare}
              disabled={!partnerOnline}
              className={`rounded-full ${
                isSharing ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              {isSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
            </Button>

            <div className="w-px h-6 bg-white/20" />

            {!isInCall ? (
              <>
                <Button
                  data-testid="video-call-start"
                  variant="ghost"
                  size="sm"
                  onClick={() => startCall("video")}
                  disabled={!partnerOnline}
                  className="rounded-full text-white/70 hover:text-white hover:bg-white/10"
                >
                  <Video className="w-5 h-5" />
                </Button>
                <Button
                  data-testid="voice-call-start"
                  variant="ghost"
                  size="sm"
                  onClick={() => startCall("audio")}
                  disabled={!partnerOnline}
                  className="rounded-full text-white/70 hover:text-white hover:bg-white/10"
                >
                  <Phone className="w-5 h-5" />
                </Button>
              </>
            ) : (
              <>
                {callType === "video" && (
                  <Button
                    data-testid="toggle-video-btn"
                    variant="ghost"
                    size="sm"
                    onClick={toggleVideo}
                    className={`rounded-full ${
                      !localVideoEnabled ? "bg-red-500/20 text-red-400" : "text-white/70 hover:text-white"
                    } hover:bg-white/10`}
                  >
                    {localVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                  </Button>
                )}
                <Button
                  data-testid="toggle-audio-btn"
                  variant="ghost"
                  size="sm"
                  onClick={toggleAudio}
                  className={`rounded-full ${
                    !localAudioEnabled ? "bg-red-500/20 text-red-400" : "text-white/70 hover:text-white"
                  } hover:bg-white/10`}
                >
                  {localAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </Button>
                <Button
                  data-testid="end-call-btn"
                  variant="ghost"
                  size="sm"
                  onClick={endCall}
                  className="rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30"
                >
                  <PhoneOff className="w-5 h-5" />
                </Button>
              </>
            )}

            <div className="w-px h-6 bg-white/20" />

            <Button
              data-testid="sync-play-btn"
              variant="ghost"
              size="sm"
              onClick={() => sendSync("play")}
              disabled={!partnerOnline}
              className="rounded-full text-white/70 hover:text-emerald-400 hover:bg-white/10"
            >
              <Play className="w-5 h-5" />
            </Button>
            <Button
              data-testid="sync-pause-btn"
              variant="ghost"
              size="sm"
              onClick={() => sendSync("pause")}
              disabled={!partnerOnline}
              className="rounded-full text-white/70 hover:text-amber-400 hover:bg-white/10"
            >
              <Pause className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Chat Sidebar */}
        <div
          className={`${
            showChat ? "w-80 lg:w-96" : "w-0"
          } flex-shrink-0 transition-all duration-300 overflow-hidden border-l border-white/10 relative`}
        >
          <div className="h-full glass-dark flex flex-col w-80 lg:w-96">
            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-[#BDE0FE]" />
              <span className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Chat</span>
            </div>
            <Chat
              messages={messages}
              onSend={sendMessage}
              onReaction={sendReaction}
              onTyping={sendTyping}
              onRead={sendReadReceipt}
              userId={user?.id}
              isPartnerTyping={isPartnerTyping}
              partnerLastReadId={partnerLastReadId}
              partnerName={partnerName}
              isDark={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
