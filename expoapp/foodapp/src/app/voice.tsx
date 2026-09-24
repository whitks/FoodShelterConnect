import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mic, MicOff, Play, Square, Wifi, WifiOff } from 'lucide-react-native';

import { AppColors, AppRadius, AppShadows, AppSpacing, AppTypography } from '@/constants/theme';

// ─── Voice server endpoint ────────────────────────────────────────────────────
// Override with EXPO_PUBLIC_VOICE_SERVER_URL (e.g. wss://your-domain) in .env.
// The FastAPI voice server runs on port 8765 by default (backend/voice_agent/).
const VOICE_SERVER =
  (process.env.EXPO_PUBLIC_VOICE_SERVER_URL as string | undefined) ?? 'ws://localhost:8765';

type AgentType = 'v1' | 'v3';
type Mode = 'donor' | 'shelter';
type Status = 'disconnected' | 'connecting' | 'connected' | 'speaking' | 'error';
type WaveState = 'idle' | 'listening' | 'speaking';

interface LogEntry {
  time: string;
  text: string;
}

const BAR_COUNT = 13;

const MODES: Record<Mode, { label: string; labelHi: string; hint: string }> = {
  donor: { label: 'Donor', labelHi: 'दान', hint: 'Donate surplus food by voice' },
  shelter: { label: 'Shelter', labelHi: 'शेल्टर', hint: 'Shelter food coordination' },
};

/**
 * Web-first voice donation agent screen.
 *
 * Implements the exact WebSocket protocol of the FastAPI voice server
 * (backend/voice_agent/server):
 *   - client → server: raw PCM16 mono, 16 kHz mic bytes (binary frames)
 *   - server → client: binary PCM16 mono, 24 kHz TTS audio + JSON text frames:
 *       {type:'log', message} | {type:'interruption'} | {type:'cost', stt, tts, total}
 *   - client may send {"type":"stop"} to end the session.
 *
 * Web Audio (getUserMedia / AudioContext / ScriptProcessorNode) is only
 * available on the web build — run `npx expo start --web`. On iOS/Android this
 * screen shows an info card instead (live PCM streaming needs a dev build).
 */
export default function VoiceScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('donor');
  const [agentType, setAgentType] = useState<AgentType>('v1');
  const [status, setStatus] = useState<Status>('disconnected');
  const [wave, setWave] = useState<WaveState>('idle');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [costStt, setCostStt] = useState(0);
  const [costTts, setCostTts] = useState(0);
  const [costTotal, setCostTotal] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const playbackQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef(false);
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

  const stopPlayback = useCallback(() => {
    isPlayingRef.current = false;
    playbackQueueRef.current = [];
  }, []);

  const playAudio = useCallback(async (pcmBytes: ArrayBuffer) => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext({ sampleRate: 24000 });
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') await ctx.resume();

      const pcmData = new Int16Array(pcmBytes);
      const floatData = new Float32Array(pcmData.length);
      for (let i = 0; i < pcmData.length; i++) {
        floatData[i] = pcmData[i] / 32768;
      }

      const buffer = ctx.createBuffer(1, floatData.length, 24000);
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

  const startMic = useCallback(
    async (ws: WebSocket) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const ctx = new AudioContext({ sampleRate: 16000 });
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

  const stopMic = useCallback(() => {
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

  const connect = useCallback(() => {
    if (wsRef.current) return;
    setStatus('connecting');
    setWave('listening');
    addLog(`Connecting to ${VOICE_SERVER}/ws/${agentType}...`);

    const ws = new WebSocket(`${VOICE_SERVER}/ws/${agentType}?mode=${mode}`);
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
      addLog('WebSocket connected');
      startMic(ws);
    };

    ws.onmessage = e => {
      if (e.data instanceof ArrayBuffer) {
        setWave('speaking');
        setStatus('speaking');
        playAudio(e.data);
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
            stopPlayback();
            setStatus('connected');
            setWave('listening');
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
      stopMic();
    };
  }, [agentType, mode, addLog, startMic, stopMic, playAudio, stopPlayback]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'stop' }));
      wsRef.current.close();
      wsRef.current = null;
    }
    stopMic();
    setStatus('disconnected');
    setWave('idle');
    setCostStt(0);
    setCostTts(0);
    setCostTotal(0);
    addLog('Disconnected');
  }, [addLog, stopMic]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        try {
          wsRef.current.send(JSON.stringify({ type: 'stop' }));
        } catch {
          /* ignore */
        }
        wsRef.current.close();
        wsRef.current = null;
      }
      stopMic();
    };
  }, [stopMic]);

  const isWeb = Platform.OS === 'web';

  const statusInfo = (() => {
    if (status === 'connecting') return { text: 'Connecting…', color: AppColors.warning };
    if (status === 'connected') return { text: 'Listening', color: AppColors.success };
    if (status === 'speaking') return { text: 'Speaking', color: AppColors.info };
    if (status === 'error') return { text: 'Error', color: AppColors.danger };
    return { text: 'Standby', color: AppColors.textMuted };
  })();

  if (!isWeb) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
        <Header mode={mode} />
        <View style={styles.nativeCard}>
          <MicOff size={28} color={AppColors.textSecondary} />
          <Text style={styles.nativeTitle}>Voice agent is web-only</Text>
          <Text style={styles.nativeBody}>
            Live mic streaming uses the browser Web Audio API, which is not available in Expo Go.
            Run the web build to use the voice donation agent:
          </Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeText}>npx expo start --web</Text>
          </View>
          <Text style={styles.nativeBody}>
            Then open the app in a browser and connect to the voice server
            ({VOICE_SERVER.replace(/^ws:\/\//, 'http://')}).
          </Text>
        </View>
      </View>
    );
  }

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
              <Text style={styles.logEmpty}>Select mode & engine, then press Start</Text>
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
            API Pricing{' '}
            <Text style={styles.costEngine}>— v{agentType}</Text>
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
  nativeCard: {
    margin: AppSpacing.lg,
    backgroundColor: AppColors.card,
    borderRadius: AppRadius.lg,
    padding: AppSpacing.xxl,
    alignItems: 'center',
    gap: AppSpacing.md,
    ...AppShadows.md,
  },
  nativeTitle: {
    ...AppTypography.h3,
    color: AppColors.textPrimary,
  },
  nativeBody: {
    ...AppTypography.body,
    color: AppColors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  codeBox: {
    backgroundColor: AppColors.primary,
    borderRadius: AppRadius.md,
    paddingVertical: AppSpacing.md,
    paddingHorizontal: AppSpacing.lg,
  },
  codeText: {
    ...AppTypography.bodyBold,
    color: AppColors.secondary,
    fontFamily: 'monospace',
  },
});