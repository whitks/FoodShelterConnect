import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mic, Play, Square, Wifi, WifiOff } from 'lucide-react-native';

import Constants from 'expo-constants';
import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlaylist,
  useAudioStream,
} from 'expo-audio';
import type { AudioPlaylistStatus } from 'expo-audio';
import { File, Paths } from 'expo-file-system';

import { AppColors, AppRadius, AppShadows, AppSpacing, AppTypography } from '@/constants/theme';

// ─── Voice server endpoint ────────────────────────────────────────────────────
// Override with EXPO_PUBLIC_VOICE_SERVER_URL (e.g. ws://192.168.1.10:8765) in .env.
// The FastAPI voice server runs on port 8765 by default (backend/voice_agent/).
// On a physical phone, "localhost" is the phone itself, so in development we fall
// back to the Expo dev server's LAN host (same machine that runs uvicorn).
// Handles IPv6 hostUri forms like "[::1]:8081" (split(':')[0] would yield "[").
const DEV_HOST = (() => {
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return undefined;
  const s = hostUri.trim();
  if (!s) return undefined;
  if (s.startsWith('[')) {
    const end = s.indexOf(']');
    return end === -1 ? undefined : s.slice(1, end);
  }
  return s.split(':')[0] || undefined;
})();
const VOICE_SERVER =
  (process.env.EXPO_PUBLIC_VOICE_SERVER_URL as string | undefined) ??
  (Platform.OS !== 'web' && DEV_HOST ? `ws://${DEV_HOST}:8765` : 'ws://localhost:8765');

type AgentType = 'v1' | 'v3';
type Mode = 'donor' | 'shelter';
type Status = 'disconnected' | 'connecting' | 'connected' | 'speaking' | 'error';
type WaveState = 'idle' | 'listening' | 'speaking';

interface LogEntry {
  time: string;
  text: string;
}

const BAR_COUNT = 13;
const MIC_SAMPLE_RATE = 16000; // what the voice server expects (PCM16 mono)
const TTS_SAMPLE_RATE = 24000; // what the voice server sends back

const MODES: Record<Mode, { label: string; labelHi: string; hint: string }> = {
  donor: { label: 'Donor', labelHi: 'दान', hint: 'Donate surplus food by voice' },
  shelter: { label: 'Shelter', labelHi: 'शेल्टर', hint: 'Shelter food coordination' },
};

/**
 * Voice donation agent screen (web + native).
 *
 * Implements the WebSocket protocol of the FastAPI voice server
 * (backend/voice_agent/server):
 *   - client → server: raw PCM16 mono, 16 kHz mic bytes (binary frames)
 *   - server → client: binary PCM16 mono, 24 kHz TTS audio + JSON text frames:
 *       {type:'log', message} | {type:'interruption'} | {type:'cost', stt, tts, total}
 *   - client may send {"type":"stop"} to end the session.
 *
 * Web:  browser Web Audio (getUserMedia / AudioContext / ScriptProcessorNode).
 *       Run `npx expo start --web`.
 * Native: expo-audio `useAudioStream` (continuous PCM16 mic stream) + `AudioPlaylist`
 *       fed with small WAV files built from the server's 24 kHz PCM TTS chunks.
 *       Both work in Expo Go — no dev build required.
 */
export default function VoiceScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';

  const [mode, setMode] = useState<Mode>('donor');
  const [agentType, setAgentType] = useState<AgentType>('v1');
  const [status, setStatus] = useState<Status>('disconnected');
  const [wave, setWave] = useState<WaveState>('idle');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [costStt, setCostStt] = useState(0);
  const [costTts, setCostTts] = useState(0);
  const [costTotal, setCostTotal] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const isMountedRef = useRef(true);
  const ttsPlaylistDirtyRef = useRef(false);

  // ── Web-only audio refs (browser Web Audio) ────────────────────────────────
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const playbackQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef(false);

  // ── Native-only refs (expo-audio) ─────────────────────────────────────────
  const ttsChunksRef = useRef<Uint8Array[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ttsFileCounterRef = useRef(0);
  const ttsFilesRef = useRef<string[]>([]);
  const ttsPlayedCountRef = useRef(0);

  const scrollRef = useRef<ScrollView>(null);

  const addLog = useCallback((text: string) => {
    const t = new Date().toLocaleTimeString('hi-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setLogs(prev => [...prev.slice(-199), { time: t, text }]);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: false });
  }, [logs]);

  // ── Native: real-time PCM16 mic stream (Expo Go compatible) ───────────────
  const handleMicBuffer = useCallback(
    (buffer: { data: ArrayBuffer; sampleRate: number; channels: number }) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      try {
        // Server expects PCM16 mono @ 16 kHz — resample/downmix defensively.
        ws.send(toServerPcm(buffer.data, buffer.sampleRate, buffer.channels));
      } catch (err) {
        addLog(`Mic send error: ${String(err)}`);
      }
    },
    [addLog],
  );

  const audioStream = useAudioStream({
    sampleRate: MIC_SAMPLE_RATE,
    channels: 1,
    encoding: 'int16',
    onBuffer: handleMicBuffer,
  });

  // ── Native: gapless TTS playback via a playlist of tiny WAV files ─────────
  const playlist = useAudioPlaylist({ loop: 'none' });

  const deleteTtsFiles = useCallback((from: number, to?: number) => {
    const files = ttsFilesRef.current;
    const end = Math.min(to ?? files.length, files.length);
    for (let i = Math.max(0, from); i < end; i++) {
      const uri = files[i];
      if (!uri) continue;
      try {
        new File(uri).delete();
      } catch {
        /* best effort */
      }
    }
    // Do NOT slice the array in partial mode: the playlist reports track indices
    // in playlist space, so the array must stay index-aligned with the playlist,
    // otherwise a later trackChanged would delete the *currently playing* file
    // (offset drift). Only a full cleanup (to === undefined, on stop/unmount)
    // resets the list, which is safe because the playlist is cleared first.
    if (to === undefined) ttsFilesRef.current = [];
  }, []);

  const stopNativeTts = useCallback(() => {
    try {
      playlist.pause();
      playlist.clear();
    } catch {
      /* ignore */
    }
    ttsChunksRef.current = [];
    ttsPlayedCountRef.current = 0;
    ttsPlaylistDirtyRef.current = false;
  }, [playlist]);

  const flushNativeTts = useCallback(() => {
    const chunks = ttsChunksRef.current;
    if (chunks.length === 0) return;
    let total = 0;
    for (const c of chunks) total += c.byteLength;
    if (total === 0) {
      ttsChunksRef.current = [];
      return;
    }

    const pcm = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) {
      pcm.set(c, off);
      off += c.byteLength;
    }
    ttsChunksRef.current = [];

    const wav = buildWavBytes(pcm, TTS_SAMPLE_RATE);
    const file = new File(Paths.cache, `voice-tts-${ttsFileCounterRef.current++}.wav`);
    try {
      file.create({ overwrite: true });
      file.write(wav);
    } catch (err) {
      addLog(`TTS file error: ${String(err)}`);
      // Remove the partially-created file so the cache dir doesn't accumulate
      // untracked WAVs (they'd never be cleaned up by deleteTtsFiles).
      try {
        new File(file.uri).delete();
      } catch {
        /* ignore */
      }
      return;
    }

    try {
      ttsFilesRef.current.push(file.uri);
      playlist.add(file.uri);
      if (!playlist.playing) playlist.play();
    } catch (err) {
      addLog(`TTS play error: ${String(err)}`);
    }
  }, [addLog, playlist]);

  const startFlushTimer = useCallback(() => {
    if (flushTimerRef.current) return;
    flushTimerRef.current = setInterval(() => flushNativeTts(), 300);
  }, [flushNativeTts]);

  const stopFlushTimer = useCallback(() => {
    if (flushTimerRef.current) {
      clearInterval(flushTimerRef.current);
      flushTimerRef.current = null;
    }
  }, []);

  // Native: subscribe to playback events — cleanup played WAV files and keep
  // the speaking/listening UI in sync (event callbacks, so no setState-in-effect).
  useEffect(() => {
    if (isWeb) return;
    const unsubStatus = playlist.addListener('playlistStatusUpdate', (s: AudioPlaylistStatus) => {
      if (s.playing) {
        setStatus(prev => (prev === 'speaking' || prev === 'connected' ? 'speaking' : prev));
        setWave('speaking');
      } else if (s.didJustFinish || ttsPlaylistDirtyRef.current) {
        setStatus(prev => (prev === 'speaking' ? 'connected' : prev));
        setWave('listening');
        ttsPlaylistDirtyRef.current = false;
      }
    });
    const unsubTrack = playlist.addListener(
      'trackChanged',
      ({ currentIndex }: { previousIndex: number; currentIndex: number }) => {
        if (currentIndex > ttsPlayedCountRef.current) {
          deleteTtsFiles(ttsPlayedCountRef.current, currentIndex);
          ttsPlayedCountRef.current = currentIndex;
        }
      },
    );
    return () => {
      try {
        unsubStatus.remove();
        unsubTrack.remove();
      } catch {
        /* already removed */
      }
    };
  }, [playlist, isWeb, deleteTtsFiles]);

  // ── Web-only audio helpers (browser Web Audio API) ─────────────────────────
  const stopPlayback = useCallback(() => {
    isPlayingRef.current = false;
    playbackQueueRef.current = [];
  }, []);

  const playAudio = useCallback(async (pcmBytes: ArrayBuffer) => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext({ sampleRate: TTS_SAMPLE_RATE });
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') await ctx.resume();

      const pcmData = new Int16Array(pcmBytes);
      const floatData = new Float32Array(pcmData.length);
      for (let i = 0; i < pcmData.length; i++) {
        floatData[i] = pcmData[i] / 32768;
      }

      const buffer = ctx.createBuffer(1, floatData.length, TTS_SAMPLE_RATE);
      buffer.getChannelData(0).set(floatData);
      playbackQueueRef.current.push(buffer);

      if (!isPlayingRef.current) {
        isPlayingRef.current = true;
        const playNext = () => {
          if (!isPlayingRef.current || playbackQueueRef.current.length === 0) {
            isPlayingRef.current = false;
            return;
          }
          if (!audioCtxRef.current) return;
          const nextBuf = playbackQueueRef.current.shift()!;
          const source = audioCtxRef.current.createBufferSource();
          source.buffer = nextBuf;
          source.connect(audioCtxRef.current.destination);
          source.onended = playNext;
          source.start();
        };
        playNext();
      }
    } catch (err) {
      console.error('playback error:', err);
    }
  }, []);

  const startMicWeb = useCallback(
    async (ws: WebSocket) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const ctx = new AudioContext({ sampleRate: MIC_SAMPLE_RATE });
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        sourceRef.current = source;

        const processor = ctx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;
        let micChunks = 0;
        processor.onaudioprocess = e => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const input = e.inputBuffer.getChannelData(0);
          const output = e.outputBuffer.getChannelData(0);
          output.fill(0);
          const pcm = new Int16Array(input.length);
          for (let i = 0; i < input.length; i++) {
            const s = Math.max(-1, Math.min(1, input[i]));
            pcm[i] = s < 0 ? s * 32768 : s * 32767;
          }
          ws.send(pcm.buffer);
          micChunks++;
          if (micChunks === 1 || micChunks % 30 === 0) {
            addLog(`MIC Sent chunk #${micChunks} (${pcm.byteLength}B)`);
          }
        };
        source.connect(processor);
        processor.connect(ctx.destination);
        addLog('Microphone active');
      } catch (err) {
        addLog(`Mic error: ${String(err)}`);
        setStatus('error');
      }
    },
    [addLog],
  );

  const stopMicWeb = useCallback(() => {
    if (processorRef.current && sourceRef.current) {
      processorRef.current.disconnect();
      sourceRef.current.disconnect();
      processorRef.current = null;
      sourceRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    stopPlayback();
  }, [stopPlayback]);

  // ── Native microphone (expo-audio AudioStream, works in Expo Go) ───────────
  const startMicNative = useCallback(async () => {
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        addLog('Mic permission denied — enable it in your phone Settings');
        setStatus('error');
        return;
      }
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      if (!isMountedRef.current) return;
      if (audioStream.stream.isStreaming) audioStream.stream.stop();
      await audioStream.stream.start();
      addLog(`Microphone active (PCM16 ${MIC_SAMPLE_RATE} Hz)`);
    } catch (err) {
      addLog(`Mic error: ${String(err)}`);
      setStatus('error');
    }
  }, [addLog, audioStream]);

  const stopMicNative = useCallback(() => {
    try {
      if (audioStream.stream.isStreaming) audioStream.stream.stop();
    } catch {
      /* ignore */
    }
    setAudioModeAsync({ allowsRecording: false }).catch(() => {});
  }, [audioStream]);

  // ── Connection lifecycle ───────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (wsRef.current) return;
    setStatus('connecting');
    setWave('listening');
    addLog(`Connecting to ${VOICE_SERVER}/ws/${agentType}...`);

    let ws: WebSocket;
    try {
      ws = new WebSocket(`${VOICE_SERVER}/ws/${agentType}?mode=${mode}`);
    } catch (err) {
      addLog(`WebSocket error: ${String(err)}`);
      setStatus('error');
      setWave('idle');
      return;
    }
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
      addLog('WebSocket connected');
      if (isWeb) {
        startMicWeb(ws);
      } else {
        startMicNative();
        startFlushTimer();
      }
    };

    ws.onmessage = e => {
      // Ignore frames that arrive after disconnect()/close() — the socket can
      // deliver already-queued messages after teardown, which would otherwise
      // re-run flushNativeTts and play audio (plus leak WAV files) post-stop.
      if (wsRef.current !== ws) return;
      if (e.data instanceof ArrayBuffer) {
        if (isWeb) {
          setWave('speaking');
          setStatus('speaking');
          playAudio(e.data);
        } else {
          setStatus('speaking');
          setWave('speaking');
          ttsPlaylistDirtyRef.current = true;
          ttsChunksRef.current.push(new Uint8Array(e.data));
          // Flush promptly once ~0.5s of audio has accumulated for lower latency.
          const buffered = ttsChunksRef.current.reduce((n, c) => n + c.byteLength, 0);
          if (buffered >= TTS_SAMPLE_RATE * 2 * 0.5) flushNativeTts();
        }
      } else {
        try {
          const msg = JSON.parse(String(e.data)) as {
            type?: string;
            message?: string;
            stt?: number;
            tts?: number;
            total?: number;
          };
          if (msg.type === 'log') {
            addLog(msg.message ?? '');
          } else if (msg.type === 'interruption') {
            addLog('Interruption');
            if (isWeb) {
              stopPlayback();
              setStatus('connected');
              setWave('listening');
            } else {
              stopNativeTts();
              setStatus('connected');
              setWave('listening');
            }
          } else if (msg.type === 'cost') {
            setCostStt(msg.stt ?? 0);
            setCostTts(msg.tts ?? 0);
            setCostTotal(msg.total ?? 0);
          }
        } catch {
          /* ignore malformed frames */
        }
      }
    };

    ws.onerror = () => {
      addLog('WebSocket error');
      setStatus('error');
      setWave('idle');
    };

    ws.onclose = () => {
      addLog('Disconnected');
      setStatus('disconnected');
      setWave('idle');
      wsRef.current = null;
      stopFlushTimer();
      if (isWeb) {
        stopMicWeb();
      } else {
        stopMicNative();
        stopNativeTts();
        deleteTtsFiles(0);
        ttsFileCounterRef.current = 0;
      }
    };
  }, [
    agentType,
    mode,
    isWeb,
    addLog,
    startMicWeb,
    startMicNative,
    stopMicWeb,
    stopMicNative,
    startFlushTimer,
    stopFlushTimer,
    stopNativeTts,
    playAudio,
    stopPlayback,
    flushNativeTts,
    deleteTtsFiles,
  ]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      try {
        wsRef.current.send(JSON.stringify({ type: 'stop' }));
      } catch {
        /* socket already CLOSING/CLOSED — still run local teardown below */
      }
      wsRef.current.close();
      wsRef.current = null;
    }
    stopFlushTimer();
    if (isWeb) {
      stopMicWeb();
    } else {
      stopMicNative();
      stopNativeTts();
      deleteTtsFiles(0);
      ttsFileCounterRef.current = 0;
    }
    setStatus('disconnected');
    setWave('idle');
    setCostStt(0);
    setCostTts(0);
    setCostTotal(0);
    addLog('Disconnected');
  }, [isWeb, addLog, stopMicWeb, stopMicNative, stopNativeTts, stopFlushTimer, deleteTtsFiles]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopFlushTimer();
      if (wsRef.current) {
        try {
          wsRef.current.send(JSON.stringify({ type: 'stop' }));
        } catch {
          /* ignore */
        }
        wsRef.current.close();
        wsRef.current = null;
      }
      if (isWeb) {
        stopMicWeb();
      } else {
        stopMicNative();
        stopNativeTts();
        deleteTtsFiles(0);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusInfo = (() => {
    if (status === 'connecting') return { text: 'Connecting…', color: AppColors.warning };
    if (status === 'connected') return { text: 'Listening', color: AppColors.success };
    if (status === 'speaking') return { text: 'Speaking', color: AppColors.info };
    if (status === 'error') return { text: 'Error', color: AppColors.danger };
    return { text: 'Standby', color: AppColors.textMuted };
  })();

  const connected = status !== 'disconnected';

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <Header mode={mode} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Mode selector */}
        <View style={styles.modeRow}>
          {(Object.keys(MODES) as Mode[]).map(m => {
            const active = m === mode;
            return (
              <TouchableOpacity
                key={m}
                style={[styles.modeChip, active && styles.modeChipActive]}
                activeOpacity={0.8}
                disabled={connected}
                onPress={() => setMode(m)}>
                <Text style={[styles.modeChipHi, active && styles.modeChipHiActive]}>
                  {MODES[m].labelHi}
                </Text>
                <Text style={[styles.modeChipLabel, active && styles.modeChipLabelActive]}>
                  {MODES[m].label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Agent engine */}
        <View style={styles.engineCard}>
          <Text style={styles.sectionLabel}>Voice Pipeline</Text>
          <View style={styles.engineRow}>
            <EngineOption
              label="v1 — Sarvam STT"
              sub="Streaming · Saaras v3"
              active={agentType === 'v1'}
              disabled={connected}
              onPress={() => setAgentType('v1')}
            />
            <EngineOption
              label="v3 — Groq Whisper"
              sub="Batch · whisper-large-v3-turbo"
              active={agentType === 'v3'}
              disabled={connected}
              onPress={() => setAgentType('v3')}
            />
          </View>
          <Text style={styles.engineNote}>TTS: Sarvam Bulbul v3 · LLM: Groq llama-3.3-70b</Text>
        </View>

        {/* Waveform + status */}
        <View style={styles.statusCard}>
          <View style={styles.waveform}>
            {Array.from({ length: BAR_COUNT }, (_, i) => {
              const isActive =
                wave === 'speaking'
                  ? true
                  : wave === 'listening'
                    ? i % 3 !== 0
                    : false;
              return (
                <View
                  key={i}
                  style={[
                    styles.bar,
                    {
                      height: wave === 'idle' ? 8 : 14 + ((i * 7) % 18),
                      backgroundColor: isActive
                        ? wave === 'speaking'
                          ? AppColors.secondary
                          : AppColors.teal
                        : AppColors.border,
                    },
                  ]}
                />
              );
            })}
          </View>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.text}
            </Text>
            {connected ? (
              <Wifi size={14} color={AppColors.success} />
            ) : (
              <WifiOff size={14} color={AppColors.textMuted} />
            )}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          {status === 'disconnected' ? (
            <TouchableOpacity style={styles.startButton} activeOpacity={0.85} onPress={connect}>
              <Play size={18} color={AppColors.textWhite} fill={AppColors.textWhite} />
              <Text style={styles.startButtonText}>Start Voice Agent</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.stopButton} activeOpacity={0.85} onPress={disconnect}>
              <Square size={16} color={AppColors.textWhite} fill={AppColors.textWhite} />
              <Text style={styles.startButtonText}>Stop Agent</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Activity log */}
        <View style={styles.logCard}>
          <View style={styles.logHeader}>
            <Text style={styles.sectionLabel}>Activity Log</Text>
            {logs.length > 0 && (
              <View style={styles.logCountBadge}>
                <Text style={styles.logCountText}>{logs.length} entries</Text>
              </View>
            )}
          </View>
          <ScrollView
            ref={scrollRef}
            style={styles.logPanel}
            nestedScrollEnabled
            showsVerticalScrollIndicator>
            {logs.length === 0 ? (
              <Text style={styles.logEmpty}>
                Works on web AND native. Select mode & engine, then press Start
              </Text>
            ) : (
              logs.map((log, i) => (
                <View key={i} style={styles.logLine}>
                  <Text style={styles.logTime}>{log.time}</Text>
                  <Text style={styles.logMsg} numberOfLines={3}>
                    {log.text}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
        </View>

        {/* Cost panel */}
        <View style={styles.costCard}>
          <Text style={styles.sectionLabel}>
            API Pricing <Text style={styles.costEngine}>— v{agentType}</Text>
          </Text>
          <CostRow
            label={agentType === 'v1' ? 'Sarvam STT (Saaras v3)' : 'Groq Whisper STT'}
            rate={agentType === 'v1' ? '₹30/hr' : '$0.04/hr'}
            cost={costStt}
          />
          <CostRow label="Sarvam TTS (Bulbul v3)" rate="₹30/10K chars" cost={costTts} />
          <CostRow label="Groq LLM (llama-3.3-70b)" rate="Free tier" cost={0} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₹{costTotal.toFixed(3)}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/**
 * Converts any incoming PCM16 buffer to PCM16 mono @ 16 kHz (server format).
 * Handles differing sample rates (linear resample) and channel downmix.
 */
function toServerPcm(data: ArrayBuffer, fromRate: number, channels: number): ArrayBuffer {
  if (fromRate === MIC_SAMPLE_RATE && channels === 1) return data;

  const input = new Int16Array(data);
  const floatLen = Math.floor(input.length / Math.max(1, channels));
  const float = new Float32Array(floatLen);

  if (channels === 1) {
    for (let i = 0; i < floatLen; i++) float[i] = input[i] / 32768;
  } else {
    for (let i = 0; i < floatLen; i++) {
      let s = 0;
      for (let c = 0; c < channels; c++) s += input[i * channels + c] / 32768;
      float[i] = s / channels;
    }
  }

  let out = float;
  if (fromRate !== MIC_SAMPLE_RATE && fromRate > 0) {
    const ratio = MIC_SAMPLE_RATE / fromRate;
    const outLen = Math.max(1, Math.round(float.length * ratio));
    out = new Float32Array(outLen);
    for (let i = 0; i < outLen; i++) {
      const pos = i / ratio;
      const i0 = Math.floor(pos);
      const i1 = Math.min(float.length - 1, i0 + 1);
      const frac = pos - i0;
      out[i] = float[i0] * (1 - frac) + float[i1] * frac;
    }
  }

  const pcm = new Int16Array(out.length);
  for (let i = 0; i < out.length; i++) {
    const s = Math.max(-1, Math.min(1, out[i]));
    pcm[i] = s < 0 ? s * 32768 : s * 32767;
  }
  return pcm.buffer;
}

/** Wraps raw PCM16 bytes in a minimal valid WAV container for playback. */
function buildWavBytes(pcm: Uint8Array, sampleRate: number): Uint8Array {
  const channels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;
  const dataSize = pcm.byteLength;

  const header = new ArrayBuffer(44);
  const dv = new DataView(header);

  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) dv.setUint8(offset + i, s.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  dv.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  dv.setUint32(16, 16, true);
  dv.setUint16(20, 1, true); // PCM
  dv.setUint16(22, channels, true);
  dv.setUint32(24, sampleRate, true);
  dv.setUint32(28, byteRate, true);
  dv.setUint16(32, blockAlign, true);
  dv.setUint16(34, bitsPerSample, true);
  writeStr(36, 'data');
  dv.setUint32(40, dataSize, true);

  const out = new Uint8Array(44 + dataSize);
  out.set(new Uint8Array(header), 0);
  out.set(pcm, 44);
  return out;
}

function Header({ mode }: { mode: Mode }) {
  return (
    <View style={styles.header}>
      <View style={styles.micBadge}>
        <Mic size={18} color={AppColors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.headerTitle}>
          FoodBridge <Text style={styles.headerHi}>वॉइस</Text>
        </Text>
        <Text style={styles.headerSub}>{VOICE_SERVER}</Text>
      </View>
      <Text style={styles.headerMode}>{MODES[mode].label}</Text>
    </View>
  );
}

function EngineOption({
  label,
  sub,
  active,
  disabled,
  onPress,
}: {
  label: string;
  sub: string;
  active: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.engineOption, active && styles.engineOptionActive]}
      activeOpacity={0.8}
      disabled={disabled}
      onPress={onPress}>
      <Text style={[styles.engineLabel, active && styles.engineLabelActive]}>{label}</Text>
      <Text style={styles.engineSub}>{sub}</Text>
    </TouchableOpacity>
  );
}

function CostRow({ label, rate, cost }: { label: string; rate: string; cost: number }) {
  return (
    <View style={styles.costRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.costLabel}>{label}</Text>
        <Text style={styles.costRate}>{rate}</Text>
      </View>
      <Text style={styles.costValue}>₹{cost.toFixed(3)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.bg,
  },
  scrollContent: {
    padding: AppSpacing.lg,
    paddingBottom: 120,
    gap: AppSpacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.md,
    paddingHorizontal: AppSpacing.lg,
    paddingBottom: AppSpacing.sm,
  },
  micBadge: {
    width: 38,
    height: 38,
    borderRadius: AppRadius.md,
    backgroundColor: AppColors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...AppTypography.h3,
    color: AppColors.textPrimary,
  },
  headerHi: {
    color: AppColors.accent,
  },
  headerSub: {
    ...AppTypography.caption,
    color: AppColors.textMuted,
    marginTop: 1,
  },
  headerMode: {
    ...AppTypography.label,
    color: AppColors.textSecondary,
  },
  modeRow: {
    flexDirection: 'row',
    gap: AppSpacing.sm,
  },
  modeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AppSpacing.sm,
    paddingVertical: AppSpacing.md,
    borderRadius: AppRadius.md,
    backgroundColor: AppColors.card,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  modeChipActive: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  modeChipHi: {
    ...AppTypography.h4,
    color: AppColors.textSecondary,
  },
  modeChipHiActive: {
    color: AppColors.secondary,
  },
  modeChipLabel: {
    ...AppTypography.bodyBold,
    color: AppColors.textSecondary,
  },
  modeChipLabelActive: {
    color: AppColors.textWhite,
  },
  engineCard: {
    backgroundColor: AppColors.card,
    borderRadius: AppRadius.lg,
    padding: AppSpacing.lg,
    gap: AppSpacing.sm,
    ...AppShadows.sm,
  },
  engineRow: {
    flexDirection: 'row',
    gap: AppSpacing.sm,
  },
  engineOption: {
    flex: 1,
    paddingVertical: AppSpacing.md,
    paddingHorizontal: AppSpacing.md,
    borderRadius: AppRadius.md,
    backgroundColor: AppColors.cardAlt,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  engineOptionActive: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  engineLabel: {
    ...AppTypography.bodyBold,
    color: AppColors.textPrimary,
  },
  engineLabelActive: {
    color: AppColors.textWhite,
  },
  engineSub: {
    ...AppTypography.caption,
    color: AppColors.textSecondary,
    marginTop: 2,
  },
  engineNote: {
    ...AppTypography.caption,
    color: AppColors.textMuted,
  },
  statusCard: {
    backgroundColor: AppColors.card,
    borderRadius: AppRadius.lg,
    padding: AppSpacing.lg,
    alignItems: 'center',
    gap: AppSpacing.lg,
    ...AppShadows.sm,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 44,
  },
  bar: {
    width: 5,
    borderRadius: 3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    ...AppTypography.bodyBold,
  },
  actionsRow: {
    alignItems: 'center',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AppSpacing.sm,
    backgroundColor: AppColors.success,
    borderRadius: AppRadius.pill,
    paddingVertical: AppSpacing.lg,
    paddingHorizontal: AppSpacing.xxxl,
    width: '100%',
    ...AppShadows.md,
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AppSpacing.sm,
    backgroundColor: AppColors.danger,
    borderRadius: AppRadius.pill,
    paddingVertical: AppSpacing.lg,
    paddingHorizontal: AppSpacing.xxxl,
    width: '100%',
    ...AppShadows.md,
  },
  startButtonText: {
    ...AppTypography.bodyBold,
    color: AppColors.textWhite,
  },
  logCard: {
    backgroundColor: AppColors.card,
    borderRadius: AppRadius.lg,
    padding: AppSpacing.lg,
    gap: AppSpacing.sm,
    ...AppShadows.sm,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logCountBadge: {
    backgroundColor: AppColors.cardAlt,
    borderRadius: AppRadius.pill,
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: 2,
  },
  logCountText: {
    ...AppTypography.micro,
    color: AppColors.textSecondary,
  },
  logPanel: {
    maxHeight: 180,
  },
  logEmpty: {
    ...AppTypography.body,
    color: AppColors.textMuted,
    paddingVertical: AppSpacing.xl,
    textAlign: 'center',
  },
  logLine: {
    flexDirection: 'row',
    gap: AppSpacing.sm,
    paddingVertical: 3,
  },
  logTime: {
    ...AppTypography.micro,
    color: AppColors.textMuted,
    fontFamily: 'monospace',
    minWidth: 66,
  },
  logMsg: {
    ...AppTypography.body,
    color: AppColors.textPrimary,
    flex: 1,
  },
  sectionLabel: {
    ...AppTypography.label,
    color: AppColors.textSecondary,
    textTransform: 'uppercase',
  },
  costCard: {
    backgroundColor: AppColors.card,
    borderRadius: AppRadius.lg,
    padding: AppSpacing.lg,
    gap: AppSpacing.sm,
    ...AppShadows.sm,
  },
  costEngine: {
    textTransform: 'none',
    fontWeight: '400',
    color: AppColors.textMuted,
  },
  costRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: AppSpacing.xs,
  },
  costLabel: {
    ...AppTypography.body,
    color: AppColors.textPrimary,
  },
  costRate: {
    ...AppTypography.caption,
    color: AppColors.textMuted,
  },
  costValue: {
    ...AppTypography.bodyBold,
    color: AppColors.textPrimary,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
    paddingTop: AppSpacing.sm,
    marginTop: AppSpacing.xs,
  },
  totalLabel: {
    ...AppTypography.h4,
    color: AppColors.textPrimary,
  },
  totalValue: {
    ...AppTypography.h4,
    color: AppColors.success,
  },
});