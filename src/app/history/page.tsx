'use client';

import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { Trash2, FileText, Share2, BrainCircuit, Send, Loader2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { getRecordings, deleteRecording as deleteRecordingFromStorage } from "@/lib/storage";
import type { Recording } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { expandNote } from "@/ai/flows/expand-note-flow";


export default function HistoryPage() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  const [noteToExpand, setNoteToExpand] = useState<Recording | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsMounted(true);
    getRecordings()
      .then(setRecordings)
      .catch(() => {
        toast({
          variant: "destructive",
          title: "Failed to load history",
          description: "Could not fetch your recordings from the database. Please check your connection.",
        });
      });
  }, [toast]);
  
  const refreshRecordings = () => {
    getRecordings()
      .then(setRecordings)
      .catch(() => {
        toast({
          variant: "destructive",
          title: "Failed to refresh history",
          description: "Could not fetch recordings. Please try again.",
        });
      });
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteRecordingFromStorage(id);
      refreshRecordings();
      setSelectedRecording(null);
      toast({
        title: "Recording Deleted",
        description: "The recording has been permanently deleted.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: "Could not delete the recording. Please try again.",
      });
    }
  };
  
  const handleShare = async (recording: Recording) => {
    const shareData = {
      title: recording.name,
      text: recording.transcription,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error("Share failed:", err);
        toast({
          variant: "destructive",
          title: "Sharing failed",
          description: "Could not share the note. Permission may have been denied or the action was cancelled.",
        });
      }
    } else {
      const emailBody = `Check out this note: "${recording.name}"\n\n${recording.transcription}`;
      window.location.href = `mailto:?subject=${encodeURIComponent(recording.name)}&body=${encodeURIComponent(emailBody)}`;
    }
  };

  const handleExpandClick = (recording: Recording) => {
    setNoteToExpand(recording);
    setExpandedNote(null);
    setIsExpanding(true);
    expandNote({ transcription: recording.transcription })
      .then(result => {
        setExpandedNote(result.expandedDocument);
      })
      .catch(err => {
        console.error("Expansion failed:", err);
        toast({ variant: "destructive", title: "Expansion Failed", description: "Could not expand the note." });
        setNoteToExpand(null);
      })
      .finally(() => {
        setIsExpanding(false);
      });
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
        setIsCopied(true);
        toast({ title: "Copied to clipboard!", className: "bg-accent text-accent-foreground border-accent" });
        setTimeout(() => setIsCopied(false), 2000);
    });
  };

  if (!isMounted) {
    return (
        <div className="flex justify-center items-center h-full">
            <p>Loading history...</p>
        </div>
    );
  }

  return (
    <div className="container mx-auto p-4 pt-8">
      <h1 className="text-3xl font-bold mb-6 text-center">Recording History</h1>
      {recordings.length === 0 ? (
        <p className="text-center text-muted-foreground mt-12">You have no recordings yet. Tap the mic to start!</p>
      ) : (
        <ScrollArea className="h-[calc(100vh-12rem)]">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recordings.map((rec) => (
              <Card key={rec.id} className="bg-card/80 border-border backdrop-blur-sm flex flex-col">
                <CardHeader>
                  <CardTitle className="truncate">{rec.name}</CardTitle>
                  <CardDescription>
                    {formatDistanceToNow(new Date(rec.date), { addSuffix: true })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-muted-foreground line-clamp-3">{rec.transcription}</p>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedRecording(rec)}>
                    <FileText className="mr-2 h-4 w-4" /> View
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="icon" className="h-8 w-8">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete this recording and its transcription.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(rec.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardFooter>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      <Dialog open={!!selectedRecording} onOpenChange={(open) => !open && setSelectedRecording(null)}>
        <DialogContent className="max-w-2xl">
          {selectedRecording && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedRecording.name}</DialogTitle>
                <DialogDescription>
                  Recorded {formatDistanceToNow(new Date(selectedRecording.date), { addSuffix: true })}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="flex flex-col gap-2">
                    <h3 className="font-semibold">Audio</h3>
                    <audio controls className="w-full" src={selectedRecording.audioDataUri}></audio>
                </div>
                <div className="flex flex-col gap-2">
                    <h3 className="font-semibold">Transcription</h3>
                    <ScrollArea className="h-64 rounded-md border p-4 bg-muted/50">
                        <p className="text-foreground/90 whitespace-pre-wrap">{selectedRecording.transcription}</p>
                    </ScrollArea>
                </div>
              </div>
               <DialogFooter className="flex-wrap justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => handleShare(selectedRecording)}>
                      <Share2 className="mr-2 h-4 w-4" /> Share
                  </Button>
                  <Button variant="outline" onClick={() => handleExpandClick(selectedRecording)}>
                      <BrainCircuit className="mr-2 h-4 w-4" /> Expand
                  </Button>
                  <Button variant="outline" disabled>
                      <Send className="mr-2 h-4 w-4" /> Create Trello Task
                  </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      <Dialog open={!!noteToExpand} onOpenChange={(open) => {if (!open) setNoteToExpand(null)}}>
        <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
            <DialogHeader>
                <DialogTitle>Expanded Note: {noteToExpand?.name}</DialogTitle>
                <DialogDescription>
                    This is an AI-generated expansion of your original note.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 flex-1 min-h-0">
                {isExpanding ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="ml-4">Expanding your idea...</p>
                    </div>
                ) : expandedNote && (
                    <div className="relative h-full">
                        <ScrollArea className="h-full rounded-md border p-4 bg-muted/50">
                            <div className="whitespace-pre-wrap">{expandedNote}</div>
                        </ScrollArea>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="absolute top-2 right-2 h-8 w-8 bg-background/50 hover:bg-background"
                            onClick={() => handleCopyToClipboard(expandedNote)}
                        >
                            {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                    </div>
                )}
            </div>
        </DialogContent>
    </Dialog>

    </div>
  );
}
