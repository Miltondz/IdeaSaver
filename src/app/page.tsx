"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mic, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { transcribeVoiceNote } from "@/ai/flows/transcribe-voice-note";
import { nameTranscription } from "@/ai/flows/name-transcription-flow";
import { saveRecording } from "@/lib/storage";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type RecordingStatus = "idle" | "recording" | "confirm_stop" | "transcribing" | "naming";

const RECORDING_TIME_LIMIT_SECONDS = 600; // 10 minutes

export default function Home() {
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>("idle");
  const [elapsedTime, setElapsedTime] = useState(0);
  const router = useRouter();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const resetToIdle = () => {
    setRecordingStatus("idle");
    setElapsedTime(0);
  };
  
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
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [recordingStatus]);
  
  const onStop = async () => {
    setRecordingStatus("transcribing");
    const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      const audioDataUri = reader.result as string;
      try {
        const transcribeResult = await transcribeVoiceNote({ audioDataUri });
        if (!transcribeResult || !transcribeResult.transcription) {
          throw new Error("Transcription failed to produce output.");
        }
        
        setRecordingStatus("naming");
        const { transcription } = transcribeResult;
        
        const nameResult = await nameTranscription({ transcription });
        if (!nameResult || !nameResult.name) {
            throw new Error("Naming failed to produce a title.");
        }

        await saveRecording({
          name: nameResult.name,
          transcription,
          audioDataUri,
        });

        toast({
          title: "Note Saved!",
          description: `Your note "${nameResult.name}" has been saved.`,
          className: "bg-accent text-accent-foreground border-accent",
        });
        router.push("/history");

      } catch (error) {
        console.error("Processing error:", error);
        toast({
          variant: "destructive",
          title: "Processing Error",
          description: "Could not process the audio. Please try again.",
        });
        resetToIdle();
      } finally {
        mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
        audioChunksRef.current = [];
      }
    };
  }

  const startRecording = async () => {
    setElapsedTime(0);
    setRecordingStatus("recording");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = onStop;
      mediaRecorderRef.current.start();

    } catch (error) {
      console.error("Failed to get microphone access:", error);
      toast({
        variant: "destructive",
        title: "Microphone Access Denied",
        description: "Please allow microphone access in your browser settings to record audio.",
      });
      resetToIdle();
    }
  };

  const requestStopRecording = () => {
    if (mediaRecorderRef.current && recordingStatus === "recording") {
      setRecordingStatus("confirm_stop");
    }
  };

  const handleConfirmStop = () => {
      if (mediaRecorderRef.current) {
          mediaRecorderRef.current.stop();
      }
  };

  const resumeRecording = () => {
      setRecordingStatus("recording");
  }

  const getStatusText = () => {
    switch(recordingStatus) {
      case 'idle': return "Each word matters.\nMake a note of them";
      case 'recording':
      case 'confirm_stop':
        return "Audio Capture";
      case 'transcribing': return "Transcribing...";
      case 'naming': return "Creating Title...";
      default: return "";
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-between text-center p-4 pt-16 pb-8">
        <div className="h-16 flex items-center justify-center">
             <h1 className="text-2xl font-light whitespace-pre-line">{getStatusText()}</h1>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center w-full">
            {(recordingStatus === 'transcribing' || recordingStatus === 'naming') ? (
                 <div className="flex flex-col items-center justify-center gap-4 text-primary">
                    <Loader2 className="w-16 h-16 animate-spin"/>
                    <p className="text-lg">{recordingStatus === 'transcribing' ? 'Transcribing your genius...' : 'Finding the perfect title...'}</p>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center gap-8">
                    <p className="text-7xl font-mono tracking-tighter text-white/90">{formatTime(elapsedTime)}</p>
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
                    <p className="text-white/70 mt-4 h-5">
                        {recordingStatus === 'recording' && "Tap the mic to stop recording"}
                        {recordingStatus === 'idle' && "Tap the mic to start recording"}
                    </p>
                </div>
            )}
        </div>
        
        <AlertDialog open={recordingStatus === 'confirm_stop'} onOpenChange={(open) => !open && resumeRecording()}>
             <AlertDialogContent className="bg-card border-border text-foreground">
                <AlertDialogHeader>
                    <AlertDialogTitle>End recording?</AlertDialogTitle>
                    <AlertDialogDescription className="text-muted-foreground">
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
