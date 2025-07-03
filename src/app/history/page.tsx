
'use client';

import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { Trash2, FileText, Share2, BrainCircuit, Send, Loader2, Copy, Check, Cloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { getRecordings, deleteRecording as deleteRecordingFromStorage, getSettings, updateRecording, saveRecordingToDB } from "@/lib/storage";
import type { Recording } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { expandNote } from "@/ai/flows/expand-note-flow";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


export default function HistoryPage() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  const [noteToExpand, setNoteToExpand] = useState<Recording | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();
  const [settings, setSettings] = useState(getSettings());

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

  useEffect(() => {
    setIsMounted(true);
    refreshRecordings();
    const handleSettingsChange = () => setSettings(getSettings());
    window.addEventListener('storage', handleSettingsChange);
    return () => window.removeEventListener('storage', handleSettingsChange);
  }, []);
  
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
    if (!recording.transcription) return;
    const shareData = {
      title: recording.name,
      text: recording.transcription,
    };

    if (navigator.share && typeof navigator.share === 'function') {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // Silently ignore AbortError (user canceled) and NotAllowedError (permission denied)
        if (err instanceof DOMException && (err.name === 'AbortError' || err.name === 'NotAllowedError')) {
          // If permission was denied, let's offer the fallback which is to copy to clipboard.
          if (err.name === 'NotAllowedError') {
              handleCopyToClipboard(recording.transcription);
              toast({
                  title: "Sharing Permission Denied",
                  description: "We couldn't open the share dialog. The note has been copied to your clipboard instead.",
              });
          }
          return; // Exit the function gracefully for both AbortError and NotAllowedError
        }
        
        // For any other unexpected errors
        console.error("Share failed:", err);
        toast({
          variant: "destructive",
          title: "Sharing failed",
          description: "An unexpected error occurred while trying to share the note.",
        });
      }
    } else {
        // Fallback for browsers that do not support the Web Share API
        handleCopyToClipboard(recording.transcription);
        toast({
            title: "Sharing not supported",
            description: "This browser doesn't support sharing. The note has been copied to your clipboard instead.",
        });
    }
  };


  const handleExpandClick = (recording: Recording) => {
    setNoteToExpand(recording);
    setExpandedNote(null);
    setIsExpanding(true);
    expandNote({ transcription: recording.transcription, aiModel: settings.aiModel, aiApiKey: settings.aiApiKey })
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

  const handleSaveExpandedToCloud = async () => {
    if (!noteToExpand || !expandedNote) return;
    try {
      const updatedRec = {
        ...noteToExpand,
        expandedTranscription: expandedNote,
      };
      await updateRecording(updatedRec);
      refreshRecordings();
      toast({ title: "Expanded note saved!", description: "The expanded version has been saved locally and to the cloud." });
    } catch (error) {
      toast({ variant: "destructive", title: "Save Failed", description: "Could not save the expanded note." });
    }
  };

  const handleSaveToCloud = async (recording: Recording) => {
    try {
      await saveRecordingToDB(recording);
      toast({ title: "Saved to Cloud!", description: "Your note has been saved to the database." });
    } catch (error) {
      toast({ variant: "destructive", title: "Save Failed", description: "Could not save to the database." });
    }
  };

  if (!isMounted) {
    return (
        <div className="flex justify-center items-center h-full p-4">
            <div className="flex items-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <p className="ml-3">Loading history...</p>
            </div>
        </div>
    );
  }

  return (
    <div className="container mx-auto p-4 pt-8 flex h-full flex-col">
      <h1 className="text-3xl font-bold mb-6 text-center">Recording History</h1>
      {recordings.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
            <Card className="w-full max-w-sm text-center p-8">
              <CardHeader>
                <CardTitle>No Recordings Yet</CardTitle>
                <CardDescription>No recordings yet! Tap 'Record' to capture your first idea.</CardDescription>
              </CardHeader>
            </Card>
        </div>
      ) : (
        <ScrollArea className="flex-1 -mx-4">
          <div className="px-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                <CardFooter className="flex justify-between items-center">
                    <div className="flex gap-1">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedRecording(rec)}>
                                    <FileText className="h-4 w-4" />
                                </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>View Details</p></TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleShare(rec)}>
                                    <Share2 className="h-4 w-4" />
                                </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Share Note</p></TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleExpandClick(rec)}>
                                        <BrainCircuit className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Expand with AI</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
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
                    {selectedRecording.audioDataUri ? (
                      <audio controls className="w-full" src={selectedRecording.audioDataUri}></audio>
                    ) : (
                      <div className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-md border">
                        Audio playback is not available for this note.
                      </div>
                    )}
                </div>
                <div className="flex flex-col gap-2">
                    <h3 className="font-semibold">Transcription</h3>
                    <ScrollArea className="h-40 rounded-md border p-4 bg-muted/50">
                        <p className="text-foreground/90 whitespace-pre-wrap">{selectedRecording.transcription}</p>
                    </ScrollArea>
                </div>
                {selectedRecording.expandedTranscription && (
                  <div className="flex flex-col gap-2">
                    <h3 className="font-semibold">Expanded Note</h3>
                    <ScrollArea className="h-40 rounded-md border p-4 bg-muted/50">
                      <div className="prose prose-sm sm:prose-base max-w-none whitespace-pre-wrap dark:prose-invert" dangerouslySetInnerHTML={{ __html: selectedRecording.expandedTranscription }}></div>
                    </ScrollArea>
                  </div>
                )}
              </div>
               <DialogFooter className="flex-wrap justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => handleShare(selectedRecording)}>
                        <Share2 className="mr-2 h-4 w-4" /> Share
                    </Button>
                    {settings.dbIntegrationEnabled && (
                        <Button variant="outline" onClick={() => handleSaveToCloud(selectedRecording)}>
                        <Cloud className="mr-2 h-4 w-4" /> Save to Cloud
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => handleExpandClick(selectedRecording)}>
                        <BrainCircuit className="mr-2 h-4 w-4" /> Expand Note
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
                            <div className="prose prose-sm sm:prose-base max-w-none whitespace-pre-wrap dark:prose-invert" dangerouslySetInnerHTML={{ __html: expandedNote }}></div>
                        </ScrollArea>
                        <div className="absolute top-2 right-2 flex gap-1">
                            {settings.dbIntegrationEnabled && (
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 bg-background/50 hover:bg-background"
                                    onClick={handleSaveExpandedToCloud}
                                >
                                    <Cloud className="h-4 w-4" />
                                </Button>
                            )}
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 bg-background/50 hover:bg-background"
                                onClick={() => handleCopyToClipboard(expandedNote)}
                            >
                                {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </DialogContent>
    </Dialog>

    </div>
  );
}
