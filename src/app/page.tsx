"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, History, Settings, Download, Mail, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { transcribeVoiceNote } from "@/ai/flows/transcribe-voice-note";
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

type RecordingStatus = "idle" | "recording" | "confirm_stop" | "processing" | "finished";

export default function Home() {
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>("idle");
  const [transcription, setTranscription] = useState("");
  const [elapsedTime, setElapsedTime] = useState(0);

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

  useEffect(() => {
    if (recordingStatus === "recording") {
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
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
  
  const resetToIdle = () => {
    setTranscription("");
    setRecordingStatus("idle");
    setElapsedTime(0);
  };
  
  const onStop = async () => {
    setRecordingStatus("processing");
    const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      const base64Audio = reader.result as string;
      try {
        const result = await transcribeVoiceNote({ audioDataUri: base64Audio });
        if (result && result.transcription) {
          setTranscription(result.transcription);
          setRecordingStatus("finished");
          toast({
            title: "Success! Note Transcribed",
            className: "bg-accent text-accent-foreground border-accent",
          });
        } else {
          throw new Error("Transcription failed to produce output.");
        }
      } catch (error) {
        console.error("Transcription error:", error);
        toast({
          variant: "destructive",
          title: "Transcription Error",
          description: "Could not transcribe the audio. Please try again.",
        });
        resetToIdle();
      } finally {
        mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
        audioChunksRef.current = [];
      }
    };
  }

  const startRecording = async () => {
    setTranscription("");
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

  const handleSaveToFile = () => {
    if (!transcription) return;
    const blob = new Blob([transcription], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "VoiceNote.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Note Saved", description: "Your note has been downloaded as a .txt file." });
  };

  const handleShareByEmail = () => {
    if (!transcription) return;
    const subject = "My Voice Note";
    const body = transcription;
    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
  };

  return (
    <div className="h-screen w-full flex flex-col bg-background text-white font-body overflow-hidden">
        <main className="flex-1 flex flex-col items-center justify-between text-center p-4 pt-16 pb-32">
            <div className="h-16 flex items-center justify-center">
                 {recordingStatus === 'idle' && <h1 className="text-2xl font-light">Each word matters.<br/>Make a note of them</h1>}
                 {(recordingStatus === 'recording' || recordingStatus === 'confirm_stop') && <h1 className="text-2xl font-light">Audio Capture</h1>}
                 {recordingStatus === 'finished' && <h1 className="text-2xl font-light">Transcription Ready</h1>}
                 {recordingStatus === 'processing' && <h1 className="text-2xl font-light">Processing...</h1>}
            </div>

            <div className="flex-1 flex flex-col items-center justify-center w-full">
                {recordingStatus === 'processing' ? (
                     <div className="flex flex-col items-center justify-center gap-4 text-primary">
                        <Loader2 className="w-16 h-16 animate-spin"/>
                        <p className="text-lg">Transcribing your genius...</p>
                    </div>
                ) : recordingStatus === 'finished' ? (
                    <div className="w-full max-w-2xl flex flex-col gap-4 px-4">
                        <Textarea
                            value={transcription}
                            onChange={(e) => setTranscription(e.target.value)}
                            className="bg-black/20 border-white/20 min-h-[250px] text-base rounded-xl"
                            aria-label="Transcribed text"
                        />
                         <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
                            <Button onClick={handleSaveToFile} variant="secondary"><Download className="mr-2 h-4 w-4" /> Save</Button>
                            <Button onClick={handleShareByEmail} variant="secondary"><Mail className="mr-2 h-4 w-4" /> Email</Button>
                            <Button variant="destructive" onClick={resetToIdle}><Trash2 className="mr-2 h-4 w-4" /> Clear</Button>
                        </div>
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
        </main>

        <footer className="w-full max-w-md mx-auto fixed bottom-0 left-0 right-0 h-24 bg-black/30 backdrop-blur-lg rounded-t-[32px] flex justify-around items-center">
            <Button variant="ghost" className="text-white/50 hover:text-white rounded-full flex-col h-auto p-2 gap-1">
                <History className="w-7 h-7"/>
                <span className="text-xs">History</span>
            </Button>
            <Button variant="ghost" className="rounded-full flex-col h-auto p-2 gap-1">
                <div className="p-3 bg-primary/20 rounded-full">
                    <Mic className="w-7 h-7 text-primary"/>
                </div>
                <span className="text-xs text-primary">Record</span>
            </Button>
            <Button variant="ghost" className="text-white/50 hover:text-white rounded-full flex-col h-auto p-2 gap-1">
                <Settings className="w-7 h-7"/>
                <span className="text-xs">Settings</span>
            </Button>
        </footer>
        
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
