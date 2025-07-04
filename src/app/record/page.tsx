
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mic, Loader2, Share2, History, PlusCircle, Cloud, Terminal, Sparkles, BrainCircuit, Trash2, Play, Send, Pause, Save, Copy, Check, FolderKanban, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { transcribeVoiceNote } from "@/ai/flows/transcribe-voice-note";
import { nameTranscription } from "@/ai/flows/name-transcription-flow";
import { expandNote } from "@/ai/flows/expand-note-flow";
import { summarizeNote } from "@/ai/flows/summarize-note-flow";
import { expandAsProject } from "@/ai/flows/expand-as-project-flow";
import { extractTasks } from "@/ai/flows/extract-tasks-flow";
import { getSettings, saveRecording, saveRecordingToDB, applyDeletions, AppSettings, deleteRecording, updateRecording, saveSettings } from "@/lib/storage";
import type { Recording } from "@/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';
import { useLanguage } from "@/hooks/use-language";


type RecordingStatus = "idle" | "recording" | "reviewing" | "transcribing" | "naming" | "completed";
type AiAction = "expand" | "summarize" | "expand-as-project" | "extract-tasks" | "transcribe";

const RECORDING_TIME_LIMIT_SECONDS = 600; // 10 minutes

const createMarkup = (markdownText: string | null | undefined) => {
    if (!markdownText) return { __html: '' };
    return { __html: DOMPurify.sanitize(marked(markdownText) as string) };
};

function blobToDataUri(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

export default function Home() {
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>("idle");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [lastRecording, setLastRecording] = useState<Recording | null>(null);
  const [recordedAudio, setRecordedAudio] = useState<{ blob: Blob; dataUri: string } | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const { user } = useAuth();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [idleQuote, setIdleQuote] = useState('');
  const router = useRouter();
  const { t } = useLanguage();
  const [canShareFiles, setCanShareFiles] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // State for custom audio player
  const audioPlayerRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  // State for AI actions
  const [aiAction, setAiAction] = useState<AiAction | null>(null);
  const [isProcessingAi, setIsProcessingAi] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [noteForAi, setNoteForAi] = useState<Recording | null>(null);
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const [confirmationAction, setConfirmationAction] = useState<{ action: () => void; title: string; description: string; } | null>(null);
  const [creditConfirmation, setCreditConfirmation] = useState<{ action: () => void } | null>(null);


  // State for editing transcription
  const [editableTranscription, setEditableTranscription] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Check for file sharing capabilities
    const dummyFile = new File([""], "dummy.txt", { type: "text/plain" });
    if (navigator.canShare && navigator.canShare({ files: [dummyFile] })) {
        setCanShareFiles(true);
    }
    
    const motivationalQuotes = [
        t('record_motivation_1'), t('record_motivation_2'), t('record_motivation_3'),
        t('record_motivation_4'), t('record_motivation_5'), t('record_motivation_6'),
        t('record_motivation_7'), t('record_motivation_8'), t('record_motivation_9'),
        t('record_motivation_10'), t('record_motivation_11'), t('record_motivation_12'),
        t('record_motivation_13'), t('record_motivation_14'), t('record_motivation_15'),
        t('record_motivation_16'), t('record_motivation_17'), t('record_motivation_18'),
        t('record_motivation_19'),
    ];
    setIdleQuote(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);

    const handleSettingsChange = async () => {
      if (user) {
        setSettings(await getSettings(user.uid));
      }
    };
    
    if (user) {
      getSettings(user.uid).then(setSettings);
      applyDeletions(user.uid);
    }
    window.addEventListener('storage', handleSettingsChange);

    return () => {
      window.removeEventListener('storage', handleSettingsChange);
    };
  }, [user, t]);

  const log = useCallback((...args: any[]) => {
    const message = args.map(arg => {
      if (typeof arg === 'object' && arg !== null) {
        try {
          return JSON.stringify(arg, null, 2);
        } catch (e) {
          return '[Unserializable Object]';
        }
      }
      return String(arg);
    }).join(' ');
    
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prevLogs => [`[${timestamp}] ${message}`, ...prevLogs]);
  }, []);
  
  const resetToIdle = useCallback(() => {
    const motivationalQuotes = [
        t('record_motivation_1'), t('record_motivation_2'), t('record_motivation_3'),
        t('record_motivation_4'), t('record_motivation_5'), t('record_motivation_6'),
        t('record_motivation_7'), t('record_motivation_8'), t('record_motivation_9'),
        t('record_motivation_10'), t('record_motivation_11'), t('record_motivation_12'),
        t('record_motivation_13'), t('record_motivation_14'), t('record_motivation_15'),
        t('record_motivation_16'), t('record_motivation_17'), t('record_motivation_18'),
        t('record_motivation_19'),
    ];

    setRecordingStatus("idle");
    setElapsedTime(0);
    setLastRecording(null);
    setRecordedAudio(null);
    setEditableTranscription('');
    // Reset audio player state
    setIsPlaying(false);
    setAudioProgress(0);
    setAudioDuration(0);
    if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.src = "";
    }
    setIdleQuote(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
  }, [t]);

  const deductCredit = useCallback(async () => {
    if (!user || !settings) return;
    const newSettings = { ...settings, aiCredits: settings.aiCredits - 1 };
    await saveSettings(newSettings, user.uid);
    setSettings(newSettings);
  }, [user, settings]);

  const handleSaveAudioOnly = async () => {
    if (!user || !recordedAudio) return;

    try {
        const name = `${t('record_audio_note_prefix')} - ${new Date().toLocaleString()}`;
        await saveRecording({ name, transcription: '', audioDataUri: recordedAudio.dataUri }, user.uid);
        toast({ title: t('record_audio_note_saved'), description: t('record_save_audio_only_success') });
        resetToIdle();
    } catch (error) {
        log("Error saving audio only:", error);
        toast({ variant: 'destructive', title: t('record_save_audio_only_fail_title'), description: t('record_save_audio_only_fail_desc') });
    }
  };
  
  const handleProcessRecording = useCallback(async () => {
    if (!user || !settings) {
        toast({ variant: "destructive", title: t('auth_fail_title'), description: t('record_auth_error') });
        resetToIdle();
        return;
    }
    if (!recordedAudio) {
        toast({ variant: "destructive", title: t('record_no_recording_error_title'), description: t('record_no_recording_error_desc') });
        resetToIdle();
        return;
    }
    
    log("handleProcessRecording: Process started.");
    setRecordingStatus("transcribing");
    
    try {
        if (!settings.isPro) await deductCredit();
        const audioDataUri = recordedAudio.dataUri;
        log("handleProcessRecording: Calling transcribeVoiceNote...");
        const transcribeResult = await transcribeVoiceNote({ audioDataUri, aiModel: settings.aiModel });
        log("handleProcessRecording: Transcription received:", transcribeResult);
        if (!transcribeResult || !transcribeResult.transcription) {
          throw new Error("Transcription failed to produce output.");
        }
        
        setRecordingStatus("naming");
        log("handleProcessRecording: Status set to 'naming'.");

        const { transcription } = transcribeResult;
        
        log("handleProcessRecording: Calling nameTranscription...");
        const nameResult = await nameTranscription({ transcription, aiModel: settings.aiModel });
        log("handleProcessRecording: Name received:", nameResult);
        if (!nameResult || !nameResult.name) {
            throw new Error("Naming failed to produce output.");
        }
        const { name } = nameResult;

        const recordingData = {
          name,
          transcription,
          audioDataUri,
        };
        log("handleProcessRecording: Calling saveRecording with data:", recordingData);
        const newRecording = await saveRecording(recordingData, user.uid);
        log("handleProcessRecording: Recording saved:", newRecording);
        
        setLastRecording(newRecording);
        setEditableTranscription(newRecording.transcription);
        setRecordingStatus("completed");
        log("handleProcessRecording: UI state updated. Process complete.");

      } catch (error) {
        log("Processing error:", error);
        toast({
          variant: "destructive",
          title: t('record_processing_fail_title'),
          description: t('record_processing_fail_desc'),
        });
        resetToIdle();
      } finally {
        log("handleProcessRecording: Cleaning up media recorder references.");
        if (mediaRecorderRef.current?.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
      }
  }, [resetToIdle, toast, log, settings, user, recordedAudio, deductCredit, t]);

  const onStop = useCallback(async () => {
    log("onStop: Recording stopped, entering review phase.");

    if (audioChunksRef.current.length === 0) {
        log("onStop: No audio chunks recorded. Resetting.");
        toast({ variant: "destructive", title: t('record_empty_title'), description: t('record_empty_desc') });
        resetToIdle();
        return;
    }

    const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
    const audioDataUri = await blobToDataUri(audioBlob);

    setRecordedAudio({ blob: audioBlob, dataUri: audioDataUri });
    setRecordingStatus("reviewing");
    audioChunksRef.current = [];
  }, [log, resetToIdle, toast, t]);

  const requestStopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingStatus === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, [recordingStatus]);

  useEffect(() => {
    if (recordingStatus === "recording") {
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => {
          const newTime = prev + 1;
          if (newTime >= RECORDING_TIME_LIMIT_SECONDS) {
            requestStopRecording();
          }
          return newTime;
        });
      }, 1000);
    } else if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [recordingStatus, requestStopRecording]);

  const startRecording = useCallback(async () => {
    setLogs([]);
    setElapsedTime(0);
    setRecordedAudio(null);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = onStop;
      mediaRecorderRef.current.start();
      
      setRecordingStatus("recording");
    } catch (error) {
      log("Failed to get microphone access:", error);
      toast({
        variant: "destructive",
        title: t('record_mic_denied_title'),
        description: t('record_mic_denied_desc'),
      });
      resetToIdle();
    }
  }, [onStop, resetToIdle, toast, log, t]);

  useEffect(() => {
    if (recordingStatus !== 'recording' || !streamRef.current) {
      return;
    }
    const stream = streamRef.current;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    source.connect(analyser);

    analyser.fftSize = 2048;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    const computedStyle = getComputedStyle(document.documentElement);
    const primaryColor = `hsl(${computedStyle.getPropertyValue('--primary')})`;
    const backgroundColor = `hsl(${computedStyle.getPropertyValue('--background')})`;

    let animationFrameId: number;

    const draw = () => {
      animationFrameId = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      canvasCtx.fillStyle = backgroundColor;
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = primaryColor;
      canvasCtx.beginPath();

      const sliceWidth = canvas.width * 1.0 / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * canvas.height / 2;
        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      source.disconnect();
      if (audioContext.state !== 'closed') {
        audioContext.close();
      }
      const context = canvas.getContext('2d');
      context?.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [recordingStatus]);

  const shareContent = async (shareData: ShareData) => {
    if (navigator.share && typeof navigator.share === 'function') {
      // Check if we can share the data
      if (navigator.canShare && navigator.canShare(shareData)) {
        try {
          await navigator.share(shareData);
          return;
        } catch (err) {
           if (err instanceof DOMException && (err.name === 'AbortError' || err.name === 'NotAllowedError')) {
            if (err.name === 'NotAllowedError' && shareData.text) {
                handleCopyToClipboard(shareData.text, 'share-fallback');
                toast({
                    title: t('record_share_denied_title'),
                    description: t('record_share_denied_desc'),
                });
            }
            return;
          }
          console.error("Share failed:", err);
          toast({
            variant: "destructive",
            title: t('record_share_fail_title'),
            description: t('record_share_fail_desc'),
          });
          return;
        }
      }
    }

    // Fallback for browsers that don't support sharing, or can't share the specific data type
    if (shareData.text) {
        handleCopyToClipboard(shareData.text, 'share-fallback');
        toast({
            title: t('record_share_unsupported_title'),
            description: t('record_share_unsupported_desc'),
        });
    } else {
        toast({
            variant: "destructive",
            title: t('record_share_unsupported_file_title'),
            description: t('record_share_unsupported_file_desc'),
        });
    }
  };


  const handleShare = async (recording: Recording) => {
    await shareContent({
      title: recording.name,
      text: recording.transcription,
    });
  };

  const handleShareAudio = async () => {
    if (!recordedAudio) return;
    try {
        const fileName = `Idea Saver Note - ${new Date().toLocaleString()}.webm`;
        const file = new File([recordedAudio.blob], fileName, { type: 'audio/webm' });
        await shareContent({
            title: fileName,
            files: [file]
        });
    } catch (error) {
        log("Error preparing audio file for sharing:", error);
        toast({
            variant: "destructive",
            title: t('record_share_audio_fail_title'),
            description: t('record_share_audio_fail_desc'),
        });
    }
  };


  const handleSaveToCloud = async (recording: Recording) => {
    try {
      await saveRecordingToDB(recording);
      toast({ title: t('record_save_cloud_success_title'), description: t('record_save_cloud_success_desc') });
    } catch (error) {
      log("handleSaveToCloud error:", error);
      toast({ variant: "destructive", title: t('record_save_cloud_fail_title'), description: t('record_save_cloud_fail_desc') });
    }
  };

  const handleDiscardLastRecording = async () => {
    if (!lastRecording || !user) return;
    try {
      await deleteRecording(lastRecording.id, user.uid);
      toast({
        title: t('record_discard_success_title'),
        description: t('record_discard_success_desc'),
      });
    } catch (error) {
      log("Discard error:", error);
      toast({
        variant: "destructive",
        title: t('record_discard_fail_title'),
        description: t('record_discard_fail_desc'),
      });
    } finally {
      resetToIdle();
    }
  };

  const getStatusText = () => {
    switch(recordingStatus) {
      case 'idle': return idleQuote;
      case 'recording': return t('record_status_recording');
      case 'reviewing': return t('record_status_review');
      case 'transcribing': return t('record_status_transcribing');
      case 'naming': return t('record_status_naming');
      case 'completed': return t('record_status_completed');
      default: return "";
    }
  }

  // --- Custom Audio Player Logic ---
  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds === 0) return "00:00";
    const date = new Date(seconds * 1000);
    const mm = date.getUTCMinutes().toString().padStart(2, '0');
    const ss = date.getUTCSeconds().toString().padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const togglePlayPause = () => {
    if (audioPlayerRef.current) {
        if (isPlaying) {
            audioPlayerRef.current.pause();
        } else {
            audioPlayerRef.current.play();
        }
        setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioPlayerRef.current) {
        setAudioProgress(audioPlayerRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioPlayerRef.current) {
        setAudioDuration(audioPlayerRef.current.duration);
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioPlayerRef.current) {
        audioPlayerRef.current.currentTime = value[0];
        setAudioProgress(value[0]);
    }
  };

  // --- AI Action Handlers ---
  const proceedWithExpand = (recording: Recording) => {
    if (!user || !settings) return;
    setNoteForAi(recording);
    setAiAction('expand');
    setAiResult(null);
    setIsProcessingAi(true);
    if (!settings.isPro) deductCredit();

    expandNote({ transcription: recording.transcription, aiModel: settings.aiModel })
        .then(async (result) => {
            const updatedRec: Recording = { ...recording, expandedTranscription: result.expandedDocument };
            const savedRecording = await updateRecording(updatedRec, user.uid);
            setLastRecording(savedRecording);
            setAiResult(result.expandedDocument);
            toast({ title: t('ai_expand_success') });
        })
        .catch(err => {
            log("Expansion failed:", err);
            toast({ variant: "destructive", title: t('ai_expand_fail_title'), description: t('ai_expand_fail') });
            setNoteForAi(null);
        })
        .finally(() => setIsProcessingAi(false));
  };

  const handleAiActionClick = (action: () => void) => {
    if (!settings) return;
    if (settings.isPro) {
        action();
        return;
    }
    if (settings.aiCredits < 1) {
        toast({ variant: "destructive", title: t('ai_no_credits_error_title'), description: t('ai_no_credits_error') });
        return;
    }
    setCreditConfirmation({ action });
  };


  const handleExpandClick = (recording: Recording) => {
      if (recording.expandedTranscription) {
        setConfirmationAction({
            action: () => handleAiActionClick(() => proceedWithExpand(recording)),
            title: t('record_overwrite_expand_title'),
            description: t('record_overwrite_expand_desc'),
        });
      } else {
          handleAiActionClick(() => proceedWithExpand(recording));
      }
  };

  const proceedWithSummarize = (recording: Recording) => {
    if (!user || !settings) return;
    setNoteForAi(recording);
    setAiAction('summarize');
    setAiResult(null);
    setIsProcessingAi(true);
    if (!settings.isPro) deductCredit();

    summarizeNote({ transcription: recording.transcription, aiModel: settings.aiModel })
        .then(async (result) => {
            const updatedRec: Recording = { ...recording, summary: result.summary };
            const savedRecording = await updateRecording(updatedRec, user.uid);
            setLastRecording(savedRecording);
            setAiResult(result.summary);
            toast({ title: t('ai_summarize_success') });
        })
        .catch(err => {
            log("Summarization failed:", err);
            toast({ variant: "destructive", title: t('ai_summarize_fail_title'), description: t('ai_summarize_fail') });
            setNoteForAi(null);
        })
        .finally(() => setIsProcessingAi(false));
  };
  
  const handleSummarizeClick = (recording: Recording) => {
    if (recording.summary) {
        setConfirmationAction({
            action: () => handleAiActionClick(() => proceedWithSummarize(recording)),
            title: t('record_overwrite_summary_title'),
            description: t('record_overwrite_summary_desc'),
        });
    } else {
        handleAiActionClick(() => proceedWithSummarize(recording));
    }
  };
  
  const proceedWithExpandAsProject = (recording: Recording) => {
    if (!user || !settings) return;
    setNoteForAi(recording);
    setAiAction('expand-as-project');
    setAiResult(null);
    setIsProcessingAi(true);
    if (!settings.isPro) deductCredit();

    expandAsProject({ transcription: recording.transcription, aiModel: settings.aiModel })
        .then(async (result) => {
            const updatedRec: Recording = { ...recording, projectPlan: result.projectPlan };
            const savedRecording = await updateRecording(updatedRec, user.uid);
            setLastRecording(savedRecording);
            setAiResult(result.projectPlan);
            toast({ title: t('ai_project_plan_success') });
        })
        .catch(err => {
            log("Project plan generation failed:", err);
            toast({ variant: "destructive", title: t('ai_project_plan_fail_title'), description: t('ai_project_plan_fail') });
            setNoteForAi(null);
        })
        .finally(() => setIsProcessingAi(false));
  };

  const handleExpandAsProjectClick = (recording: Recording) => {
      if (recording.projectPlan) {
        setConfirmationAction({
            action: () => handleAiActionClick(() => proceedWithExpandAsProject(recording)),
            title: t('record_overwrite_project_plan_title'),
            description: t('record_overwrite_project_plan_desc'),
        });
      } else {
          handleAiActionClick(() => proceedWithExpandAsProject(recording));
      }
  };

  const proceedWithExtractTasks = (recording: Recording) => {
    if (!user || !settings) return;
    setNoteForAi(recording);
    setAiAction('extract-tasks');
    setAiResult(null);
    setIsProcessingAi(true);
    if (!settings.isPro) deductCredit();

    extractTasks({ transcription: recording.transcription, aiModel: settings.aiModel })
        .then(async (result) => {
            const updatedRec: Recording = { ...recording, actionItems: result.tasks };
            const savedRecording = await updateRecording(updatedRec, user.uid);
            setLastRecording(savedRecording);
            setAiResult(result.tasks);
            toast({ title: t('ai_extract_tasks_success') });
        })
        .catch(err => {
            log("Task extraction failed:", err);
            toast({ variant: "destructive", title: t('ai_extract_tasks_fail_title'), description: t('ai_extract_tasks_fail') });
            setNoteForAi(null);
        })
        .finally(() => setIsProcessingAi(false));
  };
  
  const handleExtractTasksClick = (recording: Recording) => {
    if (recording.actionItems) {
        setConfirmationAction({
            action: () => handleAiActionClick(() => proceedWithExtractTasks(recording)),
            title: t('record_overwrite_tasks_title'),
            description: t('record_overwrite_tasks_desc'),
        });
    } else {
        handleAiActionClick(() => proceedWithExtractTasks(recording));
    }
  };


  const handleCopyToClipboard = (text: string | null, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
        setCopiedStates(prev => ({...prev, [id]: true}));
        toast({ title: t('ai_copied_toast'), className: "bg-accent text-accent-foreground border-accent" });
        setTimeout(() => setCopiedStates(prev => ({...prev, [id]: false})), 2000);
    });
  };

  const handleSaveTranscription = async () => {
    if (!lastRecording || !user) return;
    if (editableTranscription === lastRecording.transcription) {
        toast({ title: t('record_no_changes_to_save') });
        return;
    }

    setConfirmationAction({
        action: async () => {
            setIsSaving(true);
            try {
                const updatedRec: Recording = { ...lastRecording, transcription: editableTranscription };
                const savedRecording = await updateRecording(updatedRec, user.uid);
                setLastRecording(savedRecording);
                toast({ title: t('ai_update_success') });
            } catch (error) {
                log("Update Failed:", error);
                toast({ variant: "destructive", title: t('ai_update_fail_title'), description: t('ai_update_fail') });
            } finally {
                setIsSaving(false);
            }
        },
        title: t('record_overwrite_transcription_title'),
        description: t('record_overwrite_transcription_desc'),
    });
  };


  const getAiActionTitle = () => {
    switch (aiAction) {
        case 'expand': return t('ai_node_expanded_title');
        case 'summarize': return t('ai_node_summarized_title');
        case 'expand-as-project': return t('ai_node_project_plan_title');
        case 'extract-tasks': return t('ai_node_action_items_title');
        default: return t('ai_result_title');
    }
  }
  
  const getAiActionDescription = () => {
    if (!aiAction) return '';
    const actionKey = `ai_action_${aiAction}`;
    const actionText = t(actionKey as any, {});
    return t('ai_result_dialog_desc', { action: actionText });
  }

  if (!settings) {
    return (
        <div className="flex justify-center items-center h-full p-4">
            <div className="flex items-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <p className="ml-3">Loading...</p>
            </div>
        </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-between p-4 text-center">
        <div className="h-16 flex items-center justify-center">
             <h1 className="text-2xl font-light whitespace-pre-line">{getStatusText()}</h1>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center w-full">
            {(recordingStatus === 'transcribing' || recordingStatus === 'naming') ? (
                 <div className="flex flex-col items-center justify-center gap-4 text-primary">
                    <Loader2 className="w-16 h-16 animate-spin"/>
                    <p className="text-lg">{recordingStatus === 'transcribing' ? t('record_status_transcribing') : t('record_status_naming')}</p>
                </div>
            ) : recordingStatus === 'completed' && lastRecording ? (
              <div className="w-full max-w-2xl mx-auto">
                <Card className="w-full bg-card/80 border-border backdrop-blur-sm shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-2xl text-primary">{lastRecording.name}</CardTitle>
                        <CardDescription>
                            {t('record_completed_title')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {lastRecording.audioDataUri && (
                            <>
                                <audio
                                    ref={audioPlayerRef}
                                    src={lastRecording.audioDataUri}
                                    onLoadedMetadata={handleLoadedMetadata}
                                    onTimeUpdate={handleTimeUpdate}
                                    onEnded={() => setIsPlaying(false)}
                                    className="hidden"
                                />
                                <div className="flex items-center gap-4 p-2 rounded-lg bg-muted/50 border">
                                    <Button variant="ghost" size="icon" onClick={togglePlayPause}>
                                        {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                                    </Button>
                                    <div className="flex-1 flex items-center gap-2">
                                        <span className="text-sm font-mono text-muted-foreground w-12">{formatTime(audioProgress)}</span>
                                        <Slider
                                            value={[audioProgress]}
                                            max={audioDuration}
                                            step={0.1}
                                            onValueChange={handleSeek}
                                            className="w-full"
                                        />
                                        <span className="text-sm font-mono text-muted-foreground w-12">{formatTime(audioDuration)}</span>
                                    </div>
                                </div>
                            </>
                        )}
                        <div className="space-y-2 text-left">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="transcription-editor" className="font-semibold">{t('record_transcription_label')}</Label>
                                <Button variant="outline" size="sm" onClick={handleSaveTranscription} disabled={isSaving || editableTranscription === lastRecording.transcription}>
                                    {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
                                    {t('record_save_button')}
                                </Button>
                            </div>
                            <Textarea
                                id="transcription-editor"
                                value={editableTranscription}
                                onChange={(e) => setEditableTranscription(e.target.value)}
                                className="h-40 border-primary/30 focus-visible:ring-primary/50 resize-none"
                                placeholder={t('record_transcription_placeholder')}
                            />
                        </div>
                        <div className="space-y-4">
                            <h3 className="font-semibold text-left">
                                {t('record_ai_actions_label')}
                                {!settings.isPro && ` (${t('record_credits_remaining', { credits: settings.aiCredits, plural: settings.aiCredits !== 1 ? 's' : '' })})`}
                            </h3>
                           <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="w-full">
                                      <Button className="w-full" variant="outline" onClick={() => lastRecording && handleSummarizeClick(lastRecording)} disabled={!settings.isPro && settings.aiCredits < 1}>
                                          <Sparkles /> {t('record_summarize_button')}
                                      </Button>
                                    </div>
                                  </TooltipTrigger>
                                  {!settings.isPro && <TooltipContent><p>{settings.aiCredits < 1 ? t('record_credits_no_credits') : t('record_credits_no_pro')}</p></TooltipContent>}
                                </Tooltip>
                              </TooltipProvider>
                              
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                     <div className="w-full">
                                      <Button className="w-full" variant="outline" onClick={() => lastRecording && handleExpandClick(lastRecording)} disabled={!settings.isPro && settings.aiCredits < 1}>
                                          <BrainCircuit /> {t('record_expand_button')}
                                      </Button>
                                    </div>
                                  </TooltipTrigger>
                                  {!settings.isPro && <TooltipContent><p>{settings.aiCredits < 1 ? t('record_credits_no_credits') : t('record_credits_no_pro')}</p></TooltipContent>}
                                </Tooltip>
                              </TooltipProvider>

                               <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                     <div className="w-full">
                                      <Button className="w-full" variant="outline" onClick={() => lastRecording && handleExpandAsProjectClick(lastRecording)} disabled={!settings.isPro && settings.aiCredits < 1}>
                                          <FolderKanban /> {t('record_project_plan_button')}
                                      </Button>
                                    </div>
                                  </TooltipTrigger>
                                  {!settings.isPro && <TooltipContent><p>{settings.aiCredits < 1 ? t('record_credits_no_credits') : t('record_credits_no_pro')}</p></TooltipContent>}
                                </Tooltip>
                              </TooltipProvider>

                               <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                     <div className="w-full">
                                      <Button className="w-full" variant="outline" onClick={() => lastRecording && handleExtractTasksClick(lastRecording)} disabled={!settings.isPro && settings.aiCredits < 1}>
                                          <ListTodo /> {t('record_get_tasks_button')}
                                      </Button>
                                    </div>
                                  </TooltipTrigger>
                                  {!settings.isPro && <TooltipContent><p>{settings.aiCredits < 1 ? t('record_credits_no_credits') : t('record_credits_no_pro')}</p></TooltipContent>}
                                </Tooltip>
                              </TooltipProvider>
                           </div>
                           <div className="grid grid-cols-2 gap-2">
                                <Button variant="outline" onClick={() => handleShare(lastRecording)}>
                                    <Share2 /> {t('record_share_note_button')}
                                </Button>
                                <Button variant="outline" onClick={() => router.push('/history')}>
                                    <History /> {t('record_view_history_button')}
                                </Button>
                           </div>
                        </div>
                    </CardContent>
                    <CardFooter className="pt-4">
                        <div className="grid grid-cols-2 gap-2 w-full">
                            <Button variant="outline" className="border-destructive/50 text-destructive hover:border-destructive hover:bg-destructive/10 hover:text-destructive" onClick={handleDiscardLastRecording}>
                                <Trash2 /> {t('record_discard_button')}
                            </Button>
                            <Button onClick={resetToIdle}>
                                <PlusCircle /> {t('record_record_another_button')}
                            </Button>
                        </div>
                    </CardFooter>
                </Card>
              </div>
            ) : recordingStatus === 'reviewing' && recordedAudio ? (
                <div className="w-full max-w-md mx-auto">
                    <Card className="w-full bg-card/80 border-border backdrop-blur-sm shadow-lg">
                        <CardHeader>
                            <CardTitle>{t('record_review_title')}</CardTitle>
                            <CardDescription>{t('record_review_desc')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <audio
                                ref={audioPlayerRef}
                                src={recordedAudio.dataUri}
                                onLoadedMetadata={handleLoadedMetadata}
                                onTimeUpdate={handleTimeUpdate}
                                onEnded={() => setIsPlaying(false)}
                                className="hidden"
                            />
                            <div className="flex items-center gap-4 p-2 rounded-lg bg-muted/50 border">
                                <Button variant="ghost" size="icon" onClick={togglePlayPause}>
                                    {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                                </Button>
                                <div className="flex-1 flex items-center gap-2">
                                    <span className="text-sm font-mono text-muted-foreground w-12">{formatTime(audioProgress)}</span>
                                    <Slider
                                        value={[audioProgress]}
                                        max={audioDuration}
                                        step={0.1}
                                        onValueChange={handleSeek}
                                        className="w-full"
                                    />
                                    <span className="text-sm font-mono text-muted-foreground w-12">{formatTime(audioDuration)}</span>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-2">
                           <div className="grid grid-cols-2 gap-2 w-full">
                                <Button variant="secondary" onClick={handleSaveAudioOnly}>
                                    <Save /> {t('record_save_audio_only')}
                                </Button>
                                <Button onClick={() => handleAiActionClick(handleProcessRecording)} disabled={!settings.isPro && settings.aiCredits < 1}>
                                    <Send /> {!settings.isPro ? t('record_transcribe_with_credit') : t('record_transcribe_button')}
                                </Button>
                           </div>
                           {canShareFiles && (
                               <Button variant="outline" className="w-full" onClick={handleShareAudio}>
                                   <Share2 /> {t('record_share_audio_button')}
                               </Button>
                           )}
                           <Button variant="outline" className="w-full border-destructive/50 text-destructive hover:border-destructive hover:bg-destructive/10 hover:text-destructive" onClick={resetToIdle}>
                                <Trash2 /> {t('record_discard_button')}
                           </Button>
                        </CardFooter>
                    </Card>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center gap-8">
                     <div className="h-28 w-full max-w-sm flex items-center justify-center">
                        {recordingStatus === 'recording' ? (
                            <canvas ref={canvasRef} width="300" height="100" />
                        ) : (
                             <p className="text-7xl font-mono tracking-tighter text-foreground/90">
                                {new Date(elapsedTime * 1000).toISOString().slice(14, 19)}
                             </p>
                        )}
                    </div>
                    {recordingStatus === 'recording' && (
                         <p className="text-2xl font-mono tracking-tighter text-foreground/70 -mt-4">
                            {new Date(elapsedTime * 1000).toISOString().slice(14, 19)}
                         </p>
                    )}
                    <div className="h-24">
                        {recordingStatus === 'idle' && (
                            <Button onClick={startRecording} className="w-24 h-24 rounded-full bg-primary/10 border-2 border-primary text-primary shadow-lg hover:bg-primary/20">
                                <Mic className="w-10 h-10"/>
                            </Button>
                        )}
                        {(recordingStatus === 'recording') && (
                            <Button onClick={requestStopRecording} className="relative w-24 h-24 rounded-full bg-primary/10 border-2 border-primary text-primary shadow-lg">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/50 opacity-75"></span>
                                <Mic className="w-10 h-10"/>
                            </Button>
                        )}
                    </div>
                    <div className="flex flex-col items-center justify-center h-10">
                      <p className="text-foreground/70">
                          {recordingStatus === 'recording' && t('record_tap_to_stop')}
                          {recordingStatus === 'idle' && t('record_tap_to_start')}
                      </p>
                    </div>
                </div>
            )}
        </div>
        
        <Dialog open={!!noteForAi} onOpenChange={(open) => {if (!open) setNoteForAi(null)}}>
            <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>
                        {getAiActionTitle()}: {noteForAi?.name}
                    </DialogTitle>
                    <DialogDescription>
                       {getAiActionDescription()}
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 flex-1 min-h-0">
                    {isProcessingAi ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="ml-4">{t('ai_processing_title', { action: getAiActionTitle() })}</p>
                        </div>
                    ) : aiResult && (
                        <div className="relative h-full">
                            <ScrollArea className="h-full rounded-md border p-4 bg-muted/50 pr-12">
                                <div className="prose prose-sm sm:prose-base max-w-none whitespace-pre-wrap dark:prose-invert" dangerouslySetInnerHTML={createMarkup(aiResult)}></div>
                            </ScrollArea>
                             <div className="absolute top-2 right-2">
                                 <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 bg-background/50 hover:bg-background"
                                            onClick={() => handleCopyToClipboard(aiResult, 'ai-result-dialog')}
                                        >
                                            {copiedStates['ai-result-dialog'] ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                        </Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p>{t('ai_copy_tooltip')}</p></TooltipContent>
                                    </Tooltip>
                                 </TooltipProvider>
                            </div>
                        </div>
                    )}
                </div>
                {aiResult && !isProcessingAi && (
                    <DialogFooter className="pt-4 border-t">
                        <Button variant="outline" onClick={() => setNoteForAi(null)}>{t('ai_close_button')}</Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>

        <div className="fixed bottom-4 right-4 z-50">
            <Sheet>
                <SheetTrigger asChild>
                    <Button variant="outline" size="icon" className="rounded-full shadow-lg">
                        <Terminal className="h-5 w-5" />
                    </Button>
                </SheetTrigger>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>{t('record_console_logs_title')}</SheetTitle>
                        <SheetDescription>
                            {t('record_console_logs_desc')}
                        </SheetDescription>
                    </SheetHeader>
                    <ScrollArea className="h-[calc(100%-4rem)] w-full rounded-md border p-2 bg-muted/50 mt-4">
                        <pre className="p-2 text-xs font-mono whitespace-pre-wrap break-words">
                            {logs.length > 0 ? (
                                logs.join('\n')
                            ) : (
                                t('record_console_logs_empty')
                            )}
                        </pre>
                    </ScrollArea>
                </SheetContent>
            </Sheet>
        </div>

        <AlertDialog open={!!confirmationAction} onOpenChange={(open) => !open && setConfirmationAction(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{confirmationAction?.title}</AlertDialogTitle>
                <AlertDialogDescription>
                  {confirmationAction?.description}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('history_cancel_button')}</AlertDialogCancel>
                <AlertDialogAction onClick={() => {
                    confirmationAction?.action();
                    setConfirmationAction(null);
                }}>
                    {t('record_overwrite_button')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!creditConfirmation} onOpenChange={(open) => !open && setCreditConfirmation(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('ai_confirmation_title')}</AlertDialogTitle>
                <AlertDialogDescription>
                    {t('ai_confirmation_desc', { credits: settings.aiCredits, plural: settings.aiCredits !== 1 ? 's' : '' })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('history_cancel_button')}</AlertDialogCancel>
                <AlertDialogAction onClick={() => {
                    creditConfirmation?.action();
                    setCreditConfirmation(null);
                }}>
                    {t('ai_confirmation_button')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
