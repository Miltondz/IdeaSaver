'use client';

import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { Trash2, PlayCircle, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { getRecordings, deleteRecording as deleteRecordingFromStorage } from "@/lib/storage";
import type { Recording } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function HistoryPage() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setRecordings(getRecordings());
  }, []);

  const handleDelete = (id: string) => {
    deleteRecordingFromStorage(id);
    setRecordings(getRecordings());
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
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
