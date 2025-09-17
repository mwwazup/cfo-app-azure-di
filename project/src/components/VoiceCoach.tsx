import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Loader2, Power } from "lucide-react";
import { supabase } from "../config/supabaseClient";

export default function VoiceCoach() {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const [isHolding, setIsHolding] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [status, setStatus] = useState<"disabled"|"idle"|"connecting"|"live">("disabled");
  const [error, setError] = useState<string | null>(null);

  // Helper: fetch ephemeral session from your Supabase Edge Function
  async function getRealtimeSession() {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    
    if (!token) {
      throw new Error("Not authenticated");
    }

    const res = await fetch("https://inczgmmgpnabtxciezio.functions.supabase.co/realtime-token", { 
      method: "POST",
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Failed to get realtime session: ${error}`);
    }
    
    return await res.json(); // contains client_secret.value and config
  }

  async function connect() {
    if (status === 'live' || status === 'connecting') return;
    
    setStatus("connecting");
    setError(null);

    try {
      const session = await getRealtimeSession();
      const EPHEMERAL_KEY = session?.client_secret?.value; // OpenAI ephemeral key

      // Create PeerConnection with error handling
      const pc = new RTCPeerConnection();
      pcRef.current = pc;
      
      // Add connection state monitoring
      pc.onconnectionstatechange = () => {
        console.log('Connection state:', pc.connectionState);
        if (pc.connectionState === 'failed') {
          setError('Connection failed');
          setStatus('idle');
        }
      };

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
    } catch (err) {
      console.error("Connection failed:", err);
      setError(err instanceof Error ? err.message : 'Connection failed');
      setStatus("idle");
    }
  }

  function startTalking() {
    if (!isEnabled || !micStreamRef.current) return;
    micStreamRef.current.getAudioTracks().forEach(t => (t.enabled = true));
    setIsHolding(true);
  }

  function stopTalking() {
    if (!micStreamRef.current) return;
    micStreamRef.current.getAudioTracks().forEach(t => (t.enabled = false));
    setIsHolding(false);
  }

  async function toggleVoiceCoach() {
    if (isEnabled) {
      // Turn off
      setStatus("disabled");
      setIsEnabled(false);
      setIsHolding(false);
      
      // Stop all tracks
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => {
          track.stop();
        });
      }
      
      // Close peer connection
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      
      micStreamRef.current = null;
    } else {
      // Turn on
      setIsEnabled(true);
      setStatus("idle");
      // Don't auto-connect, let user manually connect when ready
    }
  }

  useEffect(() => {
    // Remove auto-connect on enable to prevent double-click issues
    return () => {
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(t => t.stop());
        micStreamRef.current = null;
      }
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
    if (status === "disabled") return "bg-gray-300 hover:bg-gray-400";
    return "bg-gray-500 hover:bg-gray-600";
  };
  
  const getStatusColor = () => {
    if (status === "live") return "bg-green-500";
    if (status === "connecting") return "bg-yellow-500";
    return "bg-gray-400";
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="relative group">
        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
          {status === "connecting" && "Connecting to voice coach..."}
          {status === "idle" && "Voice coach unavailable"}
          {status === "disabled" && "Voice coach is turned off"}
          {status === "live" && !isHolding && "Hold to talk to your AI coach"}
          {status === "live" && isHolding && "Release to let coach respond"}
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="absolute bottom-full right-0 mb-16 px-3 py-2 bg-red-500 text-white text-sm rounded-lg max-w-xs">
            {error}
            <button 
              onClick={() => setError(null)}
              className="ml-2 text-red-200 hover:text-white"
            >
              ×
            </button>
          </div>
        )}
        
        <div className="flex items-center gap-3">
          {/* Toggle Switch */}
          <button
            onClick={toggleVoiceCoach}
            className={`w-12 h-6 rounded-full p-1 flex items-center transition-colors duration-200 ${isEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
            aria-label={isEnabled ? "Turn off voice coach" : "Turn on voice coach"}
            title={isEnabled ? "Turn off voice coach" : "Turn on voice coach"}
          >
            <div className={`w-4 h-4 rounded-full bg-white transform transition-transform duration-200 ${isEnabled ? 'translate-x-6' : 'translate-x-0'}`}>
              <Power className="w-3 h-3 mx-auto text-gray-600" />
            </div>
          </button>
          
          {/* Status Indicator */}
          <div className={`w-2 h-2 rounded-full ${getStatusColor()} ${isEnabled ? 'animate-pulse' : ''}`}></div>
          
          {/* Main Button */}
          <button
            onMouseDown={status === "live" ? startTalking : undefined}
            onMouseUp={status === "live" ? stopTalking : undefined}
            onTouchStart={status === "live" ? startTalking : undefined}
            onTouchEnd={status === "live" ? stopTalking : undefined}
            onClick={status === "idle" && isEnabled ? connect : undefined}
            className={`w-16 h-16 rounded-full shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95 ${getButtonColor()} text-white flex items-center justify-center`}
            disabled={!isEnabled}
            aria-pressed={isHolding}
            title={
              !isEnabled ? "Turn on voice coach first" :
              status === "idle" ? "Click to connect to voice coach" :
              status === "connecting" ? "Connecting..." :
              status === "live" ? "Hold to talk to your AI coach" :
              "Voice coach unavailable"
            }
          >
            {getButtonIcon()}
          </button>
        </div>
      </div>
    </div>
  );
}
