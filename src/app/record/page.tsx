
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Mic, Loader2, Share2, History, PlusCircle, Cloud, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { transcribeVoiceNote } from "@/ai/flows/transcribe-voice-note";
import { nameTranscription } from "@/ai/flows/name-transcription-flow";
import { getSettings, saveRecording, saveRecordingToDB } from "@/lib/storage";
import type { Recording } from "@/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";


type RecordingStatus = "idle" | "recording" | "confirm_stop" | "transcribing" | "naming" | "completed";

const RECORDING_TIME_LIMIT_SECONDS = 600; // 10 minutes

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
  const [logs, setLogs] = useState<string[]>([]);
  const [settings, setSettings] = useState(getSettings());

  const router = useRouter();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  
  useEffect(() => {
    const handleSettingsChange = () => setSettings(getSettings());
    setSettings(getSettings());
    window.addEventListener('storage', handleSettingsChange);
    return () => {
        window.removeEventListener('storage', handleSettingsChange);
        if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
        if (audioContextRef.current && audioContextRef.current.state !== "closed") {
            audioContextRef.current.close();
        }
    };
  }, []);
  
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
  
  const cleanupVisualizer = useCallback(() => {
    if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
    }
    const canvas = canvasRef.current;
    if (canvas) {
        const context = canvas.getContext('2d');
        context?.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  const resetToIdle = useCallback(() => {
    cleanupVisualizer();
    setRecordingStatus("idle");
    setElapsedTime(0);
    setLastRecording(null);
  }, [cleanupVisualizer]);
  
  const onStop = useCallback(async () => {
    log("onStop: Process started.");
    cleanupVisualizer();
    setRecordingStatus("transcribing");
    const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
    
    try {
        const audioDataUri = await blobToDataUri(audioBlob);
        log("onStop: Audio converted to Data URI.");

        log("onStop: Calling transcribeVoiceNote...");
        const transcribeResult = await transcribeVoiceNote({ audioDataUri, aiModel: settings.aiModel, aiApiKey: settings.aiApiKey });
        log("onStop: Transcription received:", transcribeResult);
        if (!transcribeResult || !transcribeResult.transcription) {
          throw new Error("Transcription failed to produce output.");
        }
        
        setRecordingStatus("naming");
        log("onStop: Status set to 'naming'.");

        const { transcription } = transcribeResult;
        
        log("onStop: Calling nameTranscription...");
        const nameResult = await nameTranscription({ transcription, aiModel: settings.aiModel, aiApiKey: settings.aiApiKey });
        log("onStop: Name received:", nameResult);
        if (!nameResult || !nameResult.name) {
            throw new Error("Naming failed to produce output.");
        }
        const { name } = nameResult;

        const recordingData = {
          name,
          transcription,
          audioDataUri,
        };
        log("onStop: Calling saveRecording with data:", recordingData);
        const newRecording = await saveRecording(recordingData);
        log("onStop: Recording saved:", newRecording);
        
        setLastRecording(newRecording);
        setRecordingStatus("completed");
        log("onStop: UI state updated. Process complete.");

      } catch (error) {
        log("Processing error:", error);
        toast({
          variant: "destructive",
          title: "Processing Error",
          description: "Could not process the audio. Please try again.",
        });
        resetToIdle();
      } finally {
        log("onStop: Cleaning up media recorder.");
        if (mediaRecorderRef.current?.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
        audioChunksRef.current = [];
      }
  }, [resetToIdle, toast, log, settings.aiModel, settings.aiApiKey, cleanupVisualizer]);

  const requestStopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingStatus === "recording") {
      setRecordingStatus("confirm_stop");
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
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setRecordingStatus("recording");
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = onStop;
      mediaRecorderRef.current.start();
      
      // Setup visualizer
      const canvas = canvasRef.current;
      if (!canvas) return;

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      analyser.fftSize = 2048;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      const canvasCtx = canvas.getContext('2d');
      if (!canvasCtx) return;

      const computedStyle = getComputedStyle(document.documentElement);
      const primaryColor = `hsl(${computedStyle.getPropertyValue('--primary')})`;
      const backgroundColor = `hsl(${computedStyle.getPropertyValue('--background')})`;

      const draw = () => {
        animationFrameIdRef.current = requestAnimationFrame(draw);
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

  const handleConfirmStop = () => {
      if (mediaRecorderRef.current) {
          mediaRecorderRef.current.stop();
      }
  };

  const resumeRecording = () => {
      setRecordingStatus("recording");
  };

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
      const { audioDataUri, ...dataToSave } = recording;
      await saveRecordingToDB(dataToSave);
      toast({ title: "Saved to Cloud!", description: "Your note has been saved to the database." });
    } catch (error) {
      log("handleSaveToCloud error:", error);
      toast({ variant: "destructive", title: "Save Failed", description: "Could not save to the database." });
    }
  };


  const getStatusText = () => {
    switch(recordingStatus) {
      case 'idle': return "Each word matters.\nMake a note of them";
      case 'recording':
      case 'confirm_stop':
        return "Audio Capture";
      case 'transcribing': return "Transcribing...";
      case 'naming': return "Creating Title...";
      case 'completed': return "Success!";
      default: return "";
    }
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
              <div className="w-full max-w-md mx-auto">
                <Card className="w-full bg-card/80 border-border backdrop-blur-sm shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-2xl text-primary">{lastRecording.name}</CardTitle>
                        <CardDescription>Your note has been successfully saved locally.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <ScrollArea className="h-32 rounded-md border p-4 bg-muted/50 text-left">
                            <p className="text-foreground/90 whitespace-pre-wrap">{lastRecording.transcription}</p>
                        </ScrollArea>
                        <div className="flex flex-col gap-2">
                            <Button variant="outline" onClick={() => handleShare(lastRecording)}>
                                <Share2 className="mr-2 h-4 w-4" /> Share
                            </Button>
                            {settings.dbIntegrationEnabled && !settings.autoSendToDB && (
                                <Button variant="outline" onClick={() => handleSaveToCloud(lastRecording!)}>
                                    <Cloud className="mr-2 h-4 w-4" /> Save to Cloud
                                </Button>
                            )}
                            <Button variant="outline" onClick={() => router.push('/history')}>
                                <History className="mr-2 h-4 w-4" /> View History
                            </Button>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" onClick={resetToIdle}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Record Another
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
                        {(recordingStatus === 'recording' || recordingStatus === 'confirm_stop') && (
                            <Button onClick={requestStopRecording} className="relative w-24 h-24 rounded-full bg-primary/10 border-2 border-primary text-primary shadow-lg">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/50 opacity-75"></span>
                                <Mic className="w-10 h-10"/>
                            </Button>
                        )}
                    </div>
                    <p className="text-foreground/70 mt-4 h-5">
                        {recordingStatus === 'recording' && "Tap the mic to stop recording"}
                        {recordingStatus === 'idle' && "Tap the mic to start recording"}
                    </p>
                </div>
            )}
        </div>
        
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

        <AlertDialog open={recordingStatus === 'confirm_stop'} onOpenChange={(open) => !open && resumeRecording()}>
             <AlertDialogContent className="bg-card border-border text-foreground">
                <AlertDialogHeader>
                    <AlertDialogTitle>End recording?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Do you want to stop and save your recording? You can also cancel to continue recording.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={resumeRecording}>Continue Recording</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmStop}>Stop and Save</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
