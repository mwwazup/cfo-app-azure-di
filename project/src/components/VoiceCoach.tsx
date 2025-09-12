import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";

export default function VoiceCoach() {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const [isHolding, setIsHolding] = useState(false);
  const [status, setStatus] = useState<"idle"|"connecting"|"live">("idle");

  // Helper: fetch ephemeral session from your Supabase Edge Function
  async function getRealtimeSession() {
    const res = await fetch("https://inczgmmgpnabtxciezio.functions.supabase.co/realtime-token", { method: "POST" });
    if (!res.ok) throw new Error("Failed to get realtime session");
    return await res.json(); // contains client_secret.value and config
  }

  async function connect() {
    setStatus("connecting");

    const session = await getRealtimeSession();
    const EPHEMERAL_KEY = session?.client_secret?.value; // OpenAI ephemeral key

    // Create PeerConnection
    const pc = new RTCPeerConnection();
    pcRef.current = pc;

    // Play remote audio (the coach's voice)
    const audioEl = document.createElement("audio");
    audioEl.autoplay = true;
    pc.ontrack = (ev) => {
      audioEl.srcObject = ev.streams[0];
    };

    // Data channel (optional: transcripts/events)
    const dc = pc.createDataChannel("oai-events");
    dc.onmessage = () => {
      // You can display partial transcripts here if you want
      // console.log("Realtime event:", evt.data);
    };

    // Get mic
    micStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioTrack = micStreamRef.current.getTracks()[0];
    audioTrack.enabled = false; // push-to-talk (start muted)
    pc.addTrack(audioTrack, micStreamRef.current);

    // Create local offer
    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: false,
    });
    await pc.setLocalDescription(offer);

    // Send SDP to OpenAI Realtime over WebRTC
    const sdpResponse = await fetch("https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${EPHEMERAL_KEY}`,
        "Content-Type": "application/sdp",
      },
      body: offer.sdp,
    });

    const answer = {
      type: "answer" as const,
      sdp: await sdpResponse.text(),
    };
    await pc.setRemoteDescription(answer);
    setStatus("live");
  }

  function startTalking() {
    if (!micStreamRef.current) return;
    micStreamRef.current.getAudioTracks().forEach(t => (t.enabled = true));
    setIsHolding(true);
  }

  function stopTalking() {
    if (!micStreamRef.current) return;
    micStreamRef.current.getAudioTracks().forEach(t => (t.enabled = false));
    setIsHolding(false);
  }

  useEffect(() => {
    // Connect on mount
    connect().catch((e) => {
      console.error(e);
      setStatus("idle");
    });
    return () => {
      pcRef.current?.close();
      micStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const getButtonIcon = () => {
    if (status === "connecting") return <Loader2 className="h-6 w-6 animate-spin" />;
    if (isHolding) return <Mic className="h-6 w-6" />;
    return <MicOff className="h-6 w-6" />;
  };

  const getButtonColor = () => {
    if (status === "connecting") return "bg-yellow-500 hover:bg-yellow-600";
    if (isHolding) return "bg-red-500 hover:bg-red-600";
    if (status === "live") return "bg-green-500 hover:bg-green-600";
    return "bg-gray-500 hover:bg-gray-600";
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="relative group">
        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
          {status === "connecting" && "Connecting to voice coach..."}
          {status === "idle" && "Voice coach unavailable"}
          {status === "live" && !isHolding && "Hold to talk to your AI coach"}
          {status === "live" && isHolding && "Release to let coach respond"}
        </div>
        
        {/* Main Button */}
        <button
          onMouseDown={startTalking}
          onMouseUp={stopTalking}
          onTouchStart={startTalking}
          onTouchEnd={stopTalking}
          className={`w-16 h-16 rounded-full shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95 ${getButtonColor()} text-white flex items-center justify-center`}
          disabled={status === "idle"}
          aria-pressed={isHolding}
          title={status === "live" ? "Voice Coach - Hold to talk" : "Voice Coach"}
        >
          {getButtonIcon()}
        </button>
        
        {/* Status indicator */}
        <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
          status === "live" ? "bg-green-400" : 
          status === "connecting" ? "bg-yellow-400" : 
          "bg-gray-400"
        }`} />
      </div>
    </div>
  );
}
