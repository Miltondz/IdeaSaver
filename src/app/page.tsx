"use client";

import { useState, useRef } from "react";
import { Mic, Square, Download, Mail, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { transcribeVoiceNote } from "@/ai/flows/transcribe-voice-note";

type RecordingStatus = "idle" | "recording" | "processing" | "finished";

export default function Home() {
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>("idle");
  const [transcription, setTranscription] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const handleStop = async (stream: MediaStream) => {
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
        setRecordingStatus("idle");
      }
    };
    stream.getTracks().forEach(track => track.stop());
  };

  const startRecording = async () => {
    setTranscription("");
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

      mediaRecorderRef.current.onstop = () => handleStop(stream);
      mediaRecorderRef.current.start();
    } catch (error) {
      console.error("Failed to get microphone access:", error);
      toast({
        variant: "destructive",
        title: "Microphone Access Denied",
        description: "Please allow microphone access in your browser settings to record audio.",
      });
      setRecordingStatus("idle");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingStatus === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

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

  const handleClear = () => {
    setTranscription("");
    setRecordingStatus("idle");
  };

  const renderRecordButton = () => {
    if (recordingStatus === "recording") {
      return (
        <Button
          size="lg"
          className="h-16 w-full max-w-xs text-xl rounded-full shadow-lg transition-transform transform hover:scale-105"
          variant="destructive"
          onClick={stopRecording}
        >
          <Square className="mr-2 h-6 w-6" /> Stop
        </Button>
      );
    }
    if (recordingStatus === "processing") {
      return (
        <Button
          size="lg"
          className="h-16 w-full max-w-xs text-xl rounded-full shadow-lg"
          variant="secondary"
          disabled
        >
          <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Processing...
        </Button>
      );
    }
    return (
      <Button
        size="lg"
        className="h-16 w-full max-w-xs text-xl rounded-full shadow-lg transition-transform transform hover:scale-105"
        variant="default"
        onClick={startRecording}
      >
        <Mic className="mr-2 h-6 w-6" /> Record
      </Button>
    );
  };

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4 sm:p-8">
      <div className="w-full max-w-2xl">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold font-headline text-foreground">VoiceNote Scribbler</h1>
          <p className="text-muted-foreground mt-2 text-lg">Your ideas, captured and transcribed instantly.</p>
        </header>

        <Card className="w-full shadow-xl rounded-2xl">
          <CardHeader>
            <CardTitle className="text-2xl font-headline text-center" aria-live="polite">
              {
                {
                  idle: "Ready to Capture",
                  recording: "Recording in Progress...",
                  processing: "Analyzing Your Note...",
                  finished: "Your Note is Ready"
                }[recordingStatus]
              }
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center space-y-6 min-h-[120px]">
            {renderRecordButton()}
            {recordingStatus === 'recording' && (
                <div className="flex items-center space-x-2 text-destructive">
                    <div className="w-3 h-3 rounded-full bg-destructive animate-pulse"></div>
                    <span className="font-medium">Live</span>
                </div>
            )}
          </CardContent>
          
          {(transcription || recordingStatus === 'processing') && (
            <CardFooter className="flex flex-col gap-4 pt-4">
              {recordingStatus === 'processing' ? (
                <div className="w-full text-center p-8 text-muted-foreground">
                  <p className="animate-pulse">Hold on, we're transcribing your genius thoughts...</p>
                </div>
              ) : (
                <>
                  <Textarea
                    placeholder="Your transcribed text will appear here..."
                    value={transcription}
                    onChange={(e) => setTranscription(e.target.value)}
                    className="min-h-[200px] text-base rounded-xl"
                    aria-label="Transcribed text"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
                    <Button onClick={handleSaveToFile}><Download className="mr-2 h-4 w-4" /> Save File</Button>
                    <Button onClick={handleShareByEmail}><Mail className="mr-2 h-4 w-4" /> Share Email</Button>
                    <Button variant="outline" onClick={handleClear}><Trash2 className="mr-2 h-4 w-4" /> Clear</Button>
                  </div>
                </>
              )}
            </CardFooter>
          )}
        </Card>
        <footer className="text-center mt-8 text-sm text-muted-foreground">
          <p>Click "Record" to start. Recordings are processed on-device and sent for transcription.</p>
        </footer>
      </div>
    </main>
  );
}
