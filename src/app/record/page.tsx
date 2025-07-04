
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


type RecordingStatus = "idle" | "recording" | "reviewing" | "transcribing" | "naming" | "completed";
type AiAction = "expand" | "summarize" | "expand-as-project" | "extract-tasks" | "transcribe";

const RECORDING_TIME_LIMIT_SECONDS = 600; // 10 minutes

const motivationalQuotes = [
  "Your ideas, amplified.",
  "Capture brilliance. Instantly.",
  "Unlock your mind's potential.",
  "Thoughts made tangible.",
  "The future of note-taking is here.",
  "From thought to masterpiece.",
  "Ideas, unchained.",
  "Never lose an 'aha!' moment again.",
  "Beyond notes. It's intelligence.",
  "Stop forgetting. Start creating.",
  "Turn fleeting thoughts into fully-formed concepts.",
  "Your brain, supercharged by AI.",
  "Transform spoken words into expanded wisdom.",
  "The ultimate tool for creators, innovators, and thinkers.",
  "Don't just save ideas, grow them.",
  "What if your notes could write themselves?",
  "Discover the true power of your voice.",
  "The secret weapon for your next breakthrough.",
  "Experience notes like never before.",
];

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
  const [idleQuote, setIdleQuote] = useState(motivationalQuotes[0]);
  const router = useRouter();

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
  }, [user]);

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
  }, []);

  const deductCredit = useCallback(async () => {
    if (!user || !settings) return;
    const newSettings = { ...settings, aiCredits: settings.aiCredits - 1 };
    await saveSettings(newSettings, user.uid);
    setSettings(newSettings);
  }, [user, settings]);
  
  const handleProcessRecording = useCallback(async () => {
    if (!user || !settings) {
        toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in to process recordings." });
        resetToIdle();
        return;
    }
    if (!recordedAudio) {
        toast({ variant: "destructive", title: "No Recording Found", description: "Could not find the audio to process." });
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
          title: "Processing Error",
          description: "Could not process the audio. Please try again.",
        });
        resetToIdle();
      } finally {
        log("handleProcessRecording: Cleaning up media recorder references.");
        if (mediaRecorderRef.current?.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
      }
  }, [resetToIdle, toast, log, settings, user, recordedAudio, deductCredit]);

  const onStop = useCallback(async () => {
    log("onStop: Recording stopped, entering review phase.");

    if (audioChunksRef.current.length === 0) {
        log("onStop: No audio chunks recorded. Resetting.");
        toast({ variant: "destructive", title: "No audio recorded", description: "The recording was empty. Please try again." });
        resetToIdle();
        return;
    }

    const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
    const audioDataUri = await blobToDataUri(audioBlob);

    setRecordedAudio({ blob: audioBlob, dataUri: audioDataUri });
    setRecordingStatus("reviewing");
    audioChunksRef.current = [];
  }, [log, resetToIdle, toast]);

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
        title: "Microphone Access Denied",
        description: "Please allow microphone access in your browser settings to record audio.",
      });
      resetToIdle();
    }
  }, [onStop, resetToIdle, toast, log]);

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

  const handleShare = async (recording: Recording) => {
    const shareData = {
      title: recording.name,
      text: recording.transcription,
    };
    if (navigator.share && typeof navigator.share === 'function') {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if (err instanceof DOMException && (err.name === 'AbortError' || err.name === 'NotAllowedError')) {
          if (err.name === 'NotAllowedError') {
            navigator.clipboard.writeText(recording.transcription).then(() => {
                toast({
                    title: "Sharing Permission Denied",
                    description: "We couldn't open the share dialog. The note has been copied to your clipboard instead.",
                });
            });
          }
          return;
        }
        
        log("Share failed:", err);
        console.error("Share failed:", err);
        toast({
          variant: "destructive",
          title: "Sharing failed",
          description: "Could not share the note. An unexpected error occurred.",
        });
      }
    } else {
      navigator.clipboard.writeText(recording.transcription).then(() => {
        toast({
            title: "Sharing not supported",
            description: "This browser doesn't support sharing. The note has been copied to your clipboard instead.",
        });
      });
    }
  };

  const handleSaveToCloud = async (recording: Recording) => {
    try {
      await saveRecordingToDB(recording);
      toast({ title: "Saved to Cloud!", description: "Your note has been saved to the database." });
    } catch (error) {
      log("handleSaveToCloud error:", error);
      toast({ variant: "destructive", title: "Save Failed", description: "Could not save to the database." });
    }
  };

  const handleDiscardLastRecording = async () => {
    if (!lastRecording || !user) return;
    try {
      await deleteRecording(lastRecording.id, user.uid);
      toast({
        title: "Note Discarded",
        description: "The recording has been successfully deleted.",
      });
    } catch (error) {
      log("Discard error:", error);
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: "Could not discard the note. Please try again.",
      });
    } finally {
      resetToIdle();
    }
  };

  const getStatusText = () => {
    switch(recordingStatus) {
      case 'idle': return idleQuote;
      case 'recording': return "Recording your brilliance...";
      case 'reviewing': return "Review Your Note";
      case 'transcribing': return "Transcribing...";
      case 'naming': return "Creating Title...";
      case 'completed': return "Success!";
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
            toast({ title: "Note expanded and saved!" });
        })
        .catch(err => {
            log("Expansion failed:", err);
            toast({ variant: "destructive", title: "Expansion Failed", description: "Could not expand the note." });
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
        toast({ variant: "destructive", title: "No AI Credits", description: "You're out of AI credits. Upgrade to Pro for unlimited use." });
        return;
    }
    setCreditConfirmation({ action });
  };


  const handleExpandClick = (recording: Recording) => {
      if (recording.expandedTranscription) {
        setConfirmationAction({
            action: () => handleAiActionClick(() => proceedWithExpand(recording)),
            title: "Overwrite Expanded Note?",
            description: "An expanded version of this note already exists. Generating a new version will overwrite the existing one. Are you sure you want to continue?",
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
            toast({ title: "Note summarized and saved!" });
        })
        .catch(err => {
            log("Summarization failed:", err);
            toast({ variant: "destructive", title: "Summarization Failed", description: "Could not summarize the note." });
            setNoteForAi(null);
        })
        .finally(() => setIsProcessingAi(false));
  };
  
  const handleSummarizeClick = (recording: Recording) => {
    if (recording.summary) {
        setConfirmationAction({
            action: () => handleAiActionClick(() => proceedWithSummarize(recording)),
            title: "Overwrite Summary?",
            description: "This note already has a summary. Generating a new one will overwrite the existing summary. Are you sure you want to continue?",
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
            toast({ title: "Project plan generated and saved!" });
        })
        .catch(err => {
            log("Project plan generation failed:", err);
            toast({ variant: "destructive", title: "Project Plan Failed", description: "Could not generate a project plan." });
            setNoteForAi(null);
        })
        .finally(() => setIsProcessingAi(false));
  };

  const handleExpandAsProjectClick = (recording: Recording) => {
      if (recording.projectPlan) {
        setConfirmationAction({
            action: () => handleAiActionClick(() => proceedWithExpandAsProject(recording)),
            title: "Overwrite Project Plan?",
            description: "A project plan for this note already exists. Generating a new version will overwrite the existing one. Are you sure you want to continue?",
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
            toast({ title: "Action items extracted and saved!" });
        })
        .catch(err => {
            log("Task extraction failed:", err);
            toast({ variant: "destructive", title: "Task Extraction Failed", description: "Could not extract action items." });
            setNoteForAi(null);
        })
        .finally(() => setIsProcessingAi(false));
  };
  
  const handleExtractTasksClick = (recording: Recording) => {
    if (recording.actionItems) {
        setConfirmationAction({
            action: () => handleAiActionClick(() => proceedWithExtractTasks(recording)),
            title: "Overwrite Action Items?",
            description: "An action item list for this note already exists. Generating a new one will overwrite the existing list. Are you sure you want to continue?",
        });
    } else {
        handleAiActionClick(() => proceedWithExtractTasks(recording));
    }
  };


  const handleCopyToClipboard = (text: string | null, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
        setCopiedStates(prev => ({...prev, [id]: true}));
        toast({ title: "Copied to clipboard!", className: "bg-accent text-accent-foreground border-accent" });
        setTimeout(() => setCopiedStates(prev => ({...prev, [id]: false})), 2000);
    });
  };

  const handleSaveTranscription = async () => {
    if (!lastRecording || !user) return;
    if (editableTranscription === lastRecording.transcription) {
        toast({ title: "No changes to save." });
        return;
    }

    setConfirmationAction({
        action: async () => {
            setIsSaving(true);
            try {
                const updatedRec: Recording = { ...lastRecording, transcription: editableTranscription };
                const savedRecording = await updateRecording(updatedRec, user.uid);
                setLastRecording(savedRecording);
                toast({ title: "Transcription updated!" });
            } catch (error) {
                log("Update Failed:", error);
                toast({ variant: "destructive", title: "Update Failed", description: "Could not save your changes." });
            } finally {
                setIsSaving(false);
            }
        },
        title: "Overwrite Transcription?",
        description: "This will save your changes and overwrite the previous transcription. Are you sure?",
    });
  };


  const getAiActionTitle = () => {
    switch (aiAction) {
        case 'expand': return 'Expanded Note';
        case 'summarize': return 'Summarized Note';
        case 'expand-as-project': return 'Project Plan';
        case 'extract-tasks': return 'Action Items';
        default: return 'AI Result';
    }
  }
  
  const getAiActionDescription = () => {
      return `This is an AI-generated ${aiAction?.replace(/-/g, ' ')} of your original note. The result has been automatically saved.`;
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
                    <p className="text-lg">{recordingStatus === 'transcribing' ? 'Transcribing your genius...' : 'Finding the perfect title...'}</p>
                </div>
            ) : recordingStatus === 'completed' && lastRecording ? (
              <div className="w-full max-w-2xl mx-auto">
                <Card className="w-full bg-card/80 border-border backdrop-blur-sm shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-2xl text-primary">{lastRecording.name}</CardTitle>
                        <CardDescription>
                            Your note is saved. You can now edit the transcription or use AI actions.
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
                                <Label htmlFor="transcription-editor" className="font-semibold">Transcription</Label>
                                <Button variant="outline" size="sm" onClick={handleSaveTranscription} disabled={isSaving || editableTranscription === lastRecording.transcription}>
                                    {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
                                    Save
                                </Button>
                            </div>
                            <Textarea
                                id="transcription-editor"
                                value={editableTranscription}
                                onChange={(e) => setEditableTranscription(e.target.value)}
                                className="h-40 border-primary/30 focus-visible:ring-primary/50 resize-none"
                                placeholder="Your transcription appears here..."
                            />
                        </div>
                        <div className="space-y-4">
                            <h3 className="font-semibold text-left">
                                AI Actions
                                {!settings.isPro && ` (${settings.aiCredits} Credit${settings.aiCredits !== 1 ? 's' : ''} remaining)`}
                            </h3>
                           <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="w-full">
                                      <Button className="w-full" variant="outline" onClick={() => lastRecording && handleSummarizeClick(lastRecording)} disabled={!settings.isPro && settings.aiCredits < 1}>
                                          <Sparkles /> Summarize
                                      </Button>
                                    </div>
                                  </TooltipTrigger>
                                  {!settings.isPro && <TooltipContent><p>{settings.aiCredits < 1 ? "No credits left" : "Costs 1 AI Credit"}</p></TooltipContent>}
                                </Tooltip>
                              </TooltipProvider>
                              
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                     <div className="w-full">
                                      <Button className="w-full" variant="outline" onClick={() => lastRecording && handleExpandClick(lastRecording)} disabled={!settings.isPro && settings.aiCredits < 1}>
                                          <BrainCircuit /> Expand
                                      </Button>
                                    </div>
                                  </TooltipTrigger>
                                  {!settings.isPro && <TooltipContent><p>{settings.aiCredits < 1 ? "No credits left" : "Costs 1 AI Credit"}</p></TooltipContent>}
                                </Tooltip>
                              </TooltipProvider>

                               <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                     <div className="w-full">
                                      <Button className="w-full" variant="outline" onClick={() => lastRecording && handleExpandAsProjectClick(lastRecording)} disabled={!settings.isPro && settings.aiCredits < 1}>
                                          <FolderKanban /> As Project
                                      </Button>
                                    </div>
                                  </TooltipTrigger>
                                  {!settings.isPro && <TooltipContent><p>{settings.aiCredits < 1 ? "No credits left" : "Costs 1 AI Credit"}</p></TooltipContent>}
                                </Tooltip>
                              </TooltipProvider>

                               <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                     <div className="w-full">
                                      <Button className="w-full" variant="outline" onClick={() => lastRecording && handleExtractTasksClick(lastRecording)} disabled={!settings.isPro && settings.aiCredits < 1}>
                                          <ListTodo /> Get Tasks
                                      </Button>
                                    </div>
                                  </TooltipTrigger>
                                  {!settings.isPro && <TooltipContent><p>{settings.aiCredits < 1 ? "No credits left" : "Costs 1 AI Credit"}</p></TooltipContent>}
                                </Tooltip>
                              </TooltipProvider>
                           </div>
                           <div className="grid grid-cols-2 gap-2">
                                <Button variant="outline" onClick={() => handleShare(lastRecording)}>
                                    <Share2 /> Share Note
                                </Button>
                                <Button variant="outline" onClick={() => router.push('/history')}>
                                    <History /> View History
                                </Button>
                           </div>
                        </div>
                    </CardContent>
                    <CardFooter className="pt-4">
                        <div className="grid grid-cols-2 gap-2 w-full">
                            <Button variant="outline" className="border-destructive/50 text-destructive hover:border-destructive hover:bg-destructive/10 hover:text-destructive" onClick={handleDiscardLastRecording}>
                                <Trash2 /> Discard
                            </Button>
                            <Button onClick={resetToIdle}>
                                <PlusCircle /> Record Another
                            </Button>
                        </div>
                    </CardFooter>
                </Card>
              </div>
            ) : recordingStatus === 'reviewing' && recordedAudio ? (
                <div className="w-full max-w-md mx-auto">
                    <Card className="w-full bg-card/80 border-border backdrop-blur-sm shadow-lg">
                        <CardHeader>
                            <CardTitle>Review Recording</CardTitle>
                            <CardDescription>Listen to your note before processing it.</CardDescription>
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
                        <CardFooter className="grid grid-cols-2 gap-4">
                            <Button variant="outline" onClick={resetToIdle}>
                                <Trash2 className="mr-2 h-4 w-4" /> Discard
                            </Button>
                            <Button onClick={() => handleAiActionClick(handleProcessRecording)}>
                                <Send className="mr-2 h-4 w-4" /> Transcribe
                                {!settings.isPro && ` (1 Credit)`}
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
                          {recordingStatus === 'recording' && "Tap the mic to stop recording"}
                          {recordingStatus === 'idle' && "Tap the mic to start recording"}
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
                            <p className="ml-4">{getAiActionTitle()}...</p>
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
                                        <TooltipContent><p>Copy</p></TooltipContent>
                                    </Tooltip>
                                 </TooltipProvider>
                            </div>
                        </div>
                    )}
                </div>
                {aiResult && !isProcessingAi && (
                    <DialogFooter className="pt-4 border-t">
                        <Button variant="outline" onClick={() => setNoteForAi(null)}>Close</Button>
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
                        <SheetTitle>Console Logs</SheetTitle>
                        <SheetDescription>
                            Live output from the recording and transcription process.
                        </SheetDescription>
                    </SheetHeader>
                    <ScrollArea className="h-[calc(100%-4rem)] w-full rounded-md border p-2 bg-muted/50 mt-4">
                        <pre className="p-2 text-xs font-mono whitespace-pre-wrap break-words">
                            {logs.length > 0 ? (
                                logs.join('\n')
                            ) : (
                                "No logs yet. Start a recording to see output."
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
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => {
                    confirmationAction?.action();
                    setConfirmationAction(null);
                }}>
                    Overwrite
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!creditConfirmation} onOpenChange={(open) => !open && setCreditConfirmation(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm AI Action</AlertDialogTitle>
                <AlertDialogDescription>
                    This action will cost 1 AI credit. You have {settings.aiCredits} credit{settings.aiCredits !== 1 ? 's' : ''} remaining. Do you want to proceed?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => {
                    creditConfirmation?.action();
                    setCreditConfirmation(null);
                }}>
                    Proceed
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
