
'use client';

import { useState, useEffect, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { Trash2, FileText, Share2, BrainCircuit, Send, Loader2, Copy, Check, Save, Sparkles, FolderKanban, ListTodo } from "lucide-react";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { getRecordings, deleteRecording as deleteRecordingFromStorage, getSettings, updateRecording, AppSettings, saveSettings } from "@/lib/storage";
import type { Recording } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { expandNote } from "@/ai/flows/expand-note-flow";
import { summarizeNote } from "@/ai/flows/summarize-note-flow";
import { expandAsProject } from "@/ai/flows/expand-as-project-flow";
import { extractTasks } from "@/ai/flows/extract-tasks-flow";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';


const createMarkup = (markdownText: string | null | undefined) => {
    if (!markdownText) return { __html: '' };
    return { __html: DOMPurify.sanitize(marked(markdownText) as string) };
};

export default function HistoryPage() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const { user } = useAuth();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  
  // AI Action State
  const [aiAction, setAiAction] = useState<'expand' | 'summarize' | 'expand-as-project' | 'extract-tasks' | null>(null);
  const [isProcessingAi, setIsProcessingAi] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [noteForAi, setNoteForAi] = useState<Recording | null>(null);
  const [confirmationAction, setConfirmationAction] = useState<{ action: () => void; title: string; description: string; } | null>(null);
  const [creditConfirmation, setCreditConfirmation] = useState<{ action: () => void } | null>(null);

  // State for editing transcription
  const [editableTranscription, setEditableTranscription] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      getSettings(user.uid).then(setSettings);
    }
    const handleSettingsChange = async () => {
      if (user) {
        setSettings(await getSettings(user.uid));
      }
    };
    window.addEventListener('storage', handleSettingsChange);
    return () => window.removeEventListener('storage', handleSettingsChange);
  }, [user]);

  const deductCredit = useCallback(async () => {
    if (!user || !settings) return;
    const newSettings = { ...settings, aiCredits: settings.aiCredits - 1 };
    await saveSettings(newSettings, user.uid);
    setSettings(newSettings);
  }, [user, settings]);

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


  const refreshRecordings = useCallback(() => {
    if (!user) return;
    setIsLoading(true);
    getRecordings(user.uid)
      .then(setRecordings)
      .catch(() => {
        toast({
          variant: "destructive",
          title: "Failed to refresh history",
          description: "Could not fetch recordings. Please try again.",
        });
      })
      .finally(() => setIsLoading(false));
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      refreshRecordings();
    }
  }, [user, refreshRecordings]);


  useEffect(() => {
    if (selectedRecording) {
      setEditableTranscription(selectedRecording.transcription);
    }
  }, [selectedRecording]);
  
  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      await deleteRecordingFromStorage(id, user.uid);
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
  
  const handleCopyToClipboard = (text: string | null, id: string) => {
    if (!text) return;
    const cleanText = text.replace(/<[^>]*>?/gm, '');
    navigator.clipboard.writeText(cleanText).then(() => {
        setCopiedStates(prev => ({...prev, [id]: true}));
        toast({ title: "Copied to clipboard!", className: "bg-accent text-accent-foreground border-accent" });
        setTimeout(() => setCopiedStates(prev => ({...prev, [id]: false})), 2000);
    });
  };

  const shareContent = async (shareData: { title: string, text: string }) => {
    if (navigator.share && typeof navigator.share === 'function') {
      try {
        await navigator.share(shareData);
      } catch (err) {
         if (err instanceof DOMException && (err.name === 'AbortError' || err.name === 'NotAllowedError')) {
          if (err.name === 'NotAllowedError') {
              handleCopyToClipboard(shareData.text, 'share-fallback');
              toast({
                  title: "Sharing Permission Denied",
                  description: "We couldn't open the share dialog. The note has been copied to your clipboard instead.",
              });
          }
          return;
        }
        
        console.error("Share failed:", err);
        toast({
          variant: "destructive",
          title: "Sharing failed",
          description: "An unexpected error occurred while trying to share the note.",
        });
      }
    } else {
        handleCopyToClipboard(shareData.text, 'share-fallback');
        toast({
            title: "Sharing not supported",
            description: "This browser doesn't support sharing. The note has been copied to your clipboard instead.",
        });
    }
  };

  const handleSimpleShare = async (recording: Recording | null) => {
    if (!recording) return;
    const textToShare = (recording.summary || recording.transcription).replace(/<[^>]*>?/gm, '');
    if (!textToShare) return;
    await shareContent({ title: recording.name, text: textToShare });
  }

  const handleShareAll = async (recording: Recording | null) => {
    if (!recording) return;

    const sections = [
        { title: 'Transcription', content: editableTranscription },
        { title: 'Summary', content: recording.summary },
        { title: 'Expanded Note', content: recording.expandedTranscription },
        { title: 'Project Plan', content: recording.projectPlan },
        { title: 'Action Items', content: recording.actionItems },
    ];

    const textToShare = sections
        .filter(section => section.content)
        .map(section => `## ${section.title}\n\n${section.content.replace(/<[^>]*>?/gm, '')}`)
        .join('\n\n---\n\n');

    if (!textToShare) {
      toast({
        variant: "destructive",
        title: "Nothing to share",
        description: "This note has no content to share.",
      });
      return;
    }
    await shareContent({ title: recording.name, text: textToShare });
  };
  
  const handleShareSection = async (title: string, text: string | undefined | null) => {
    if (!text) return;
    const cleanText = text.replace(/<[^>]*>?/gm, '');
    await shareContent({ title, text: cleanText });
  };

  const proceedWithExpand = (recording: Recording) => {
    if (!user || !settings) return;
    setNoteForAi(recording);
    setAiAction('expand');
    setAiResult(null);
    setIsProcessingAi(true);
    if (!settings.isPro) deductCredit();

    expandNote({ transcription: recording.transcription, aiModel: settings.aiModel })
      .then(async (result) => {
        const updatedRec = { ...recording, expandedTranscription: result.expandedDocument };
        await updateRecording(updatedRec, user.uid);
        refreshRecordings();
        setSelectedRecording(updatedRec); // Update the selected recording in the dialog
        setAiResult(result.expandedDocument);
        toast({ title: "Note expanded and saved!" });
      })
      .catch(err => {
        console.error("Expansion failed:", err);
        toast({ variant: "destructive", title: "Expansion Failed", description: "Could not expand the note." });
        setNoteForAi(null);
      })
      .finally(() => setIsProcessingAi(false));
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
        const updatedRec = { ...recording, summary: result.summary };
        await updateRecording(updatedRec, user.uid);
        refreshRecordings();
        setSelectedRecording(updatedRec); // Update the selected recording in the dialog
        setAiResult(result.summary);
        toast({ title: "Note summarized and saved!" });
      })
      .catch(err => {
        console.error("Summarization failed:", err);
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
        const updatedRec = { ...recording, projectPlan: result.projectPlan };
        await updateRecording(updatedRec, user.uid);
        refreshRecordings();
        setSelectedRecording(updatedRec); // Update the selected recording in the dialog
        setAiResult(result.projectPlan);
        toast({ title: "Project plan generated and saved!" });
      })
      .catch(err => {
        console.error("Project plan generation failed:", err);
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
            description: "A project plan for this note already exists. Generating a new one will overwrite the existing one. Are you sure you want to continue?",
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
        const updatedRec = { ...recording, actionItems: result.tasks };
        await updateRecording(updatedRec, user.uid);
        refreshRecordings();
        setSelectedRecording(updatedRec); // Update the selected recording in the dialog
        setAiResult(result.tasks);
        toast({ title: "Action items extracted and saved!" });
      })
      .catch(err => {
        console.error("Task extraction failed:", err);
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
            description: "An action item list for this note already exists. Generating a new one will overwrite it. Are you sure you want to continue?",
        });
    } else {
        handleAiActionClick(() => proceedWithExtractTasks(recording));
    }
  };

  const handleSaveTranscription = async () => {
    if (!selectedRecording || !user) return;
    if (editableTranscription === selectedRecording.transcription) {
      toast({ title: 'No changes to save.' });
      return;
    }

    setConfirmationAction({
      action: async () => {
        setIsSaving(true);
        try {
          const updatedRec: Recording = { ...selectedRecording, transcription: editableTranscription };
          await updateRecording(updatedRec, user.uid);
          
          refreshRecordings();
          setSelectedRecording(updatedRec);
          
          toast({ title: 'Transcription updated!' });
        } catch (error) {
          console.error('Update Failed:', error);
          toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not save your changes.' });
        } finally {
          setIsSaving(false);
        }
      },
      title: 'Overwrite Transcription?',
      description: 'This will save your changes and overwrite the previous transcription. Are you sure?',
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
  
  if (isLoading || !settings) {
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
                <CardDescription>
                  No notes yet! Tap 'Record' to capture your first idea.
                  {!settings.isPro && (
                    <>
                    <br /> and start your <Link href="/pricing" className="underline text-primary">7-day Pro Trial</Link>.
                    </>
                  )}
                </CardDescription>
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
                  <p className="text-muted-foreground line-clamp-3">{rec.summary || rec.transcription}</p>
                </CardContent>
                <CardFooter className="flex justify-between items-center">
                    <div className="flex gap-1 flex-wrap">
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
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleSimpleShare(rec)}>
                                    <Share2 className="h-4 w-4" />
                                </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Share Note</p></TooltipContent>
                            </Tooltip>
                             <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleSummarizeClick(rec)} disabled={!settings.isPro && settings.aiCredits < 1}>
                                        <Sparkles className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>{settings.isPro ? "Summarize with AI" : `Summarize with AI (${settings.aiCredits} credits left)`}</p></TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleExpandClick(rec)} disabled={!settings.isPro && settings.aiCredits < 1}>
                                        <BrainCircuit className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>{settings.isPro ? "Expand with AI" : `Expand with AI (${settings.aiCredits} credits left)`}</p></TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleExpandAsProjectClick(rec)} disabled={!settings.isPro && settings.aiCredits < 1}>
                                        <FolderKanban className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>{settings.isPro ? "Expand as Project" : `Expand as Project (${settings.aiCredits} credits left)`}</p></TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleExtractTasksClick(rec)} disabled={!settings.isPro && settings.aiCredits < 1}>
                                        <ListTodo className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>{settings.isPro ? "Extract Tasks" : `Extract Tasks (${settings.aiCredits} credits left)`}</p></TooltipContent>
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
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          {selectedRecording && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedRecording.name}</DialogTitle>
                <DialogDescription>
                  Recorded {formatDistanceToNow(new Date(selectedRecording.date), { addSuffix: true })}
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex-1 overflow-y-auto pr-6 -mr-6">
                <div className="space-y-4 py-4">
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

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Transcription</h3>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSaveTranscription}
                          disabled={isSaving || !selectedRecording || editableTranscription === selectedRecording.transcription}
                        >
                          {isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                          Save
                        </Button>
                         <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                               <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleShareSection(selectedRecording.name, editableTranscription)}>
                                  <Share2 className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Share Transcription</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => handleCopyToClipboard(editableTranscription, 'details-transcription')}
                              >
                                {copiedStates['details-transcription'] ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Copy</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                    <Textarea
                      value={editableTranscription}
                      onChange={(e) => setEditableTranscription(e.target.value)}
                      className="h-40 min-h-[160px] bg-muted/50 border-primary/20 focus-visible:ring-primary/50 resize-y"
                      placeholder="Your transcription appears here..."
                    />
                  </div>


                  {(selectedRecording.summary || selectedRecording.expandedTranscription || selectedRecording.projectPlan || selectedRecording.actionItems) && (
                    <Accordion type="multiple" className="w-full">
                      {selectedRecording.summary && (
                        <AccordionItem value="summary">
                          <AccordionTrigger className="font-semibold">Summary</AccordionTrigger>
                          <AccordionContent>
                            <div className="relative">
                              <p className="text-foreground/90 whitespace-pre-wrap bg-muted/50 rounded-md p-4 pr-24 border">{selectedRecording.summary}</p>
                              <div className="absolute top-2 right-2 flex items-center">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button size="icon" variant="ghost" className="h-8 w-8 bg-background/50 hover:bg-background" onClick={() => handleShareSection(`${selectedRecording.name} - Summary`, selectedRecording.summary)}>
                                              <Share2 className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Share Summary</p></TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 bg-background/50 hover:bg-background"
                                                onClick={() => handleCopyToClipboard(selectedRecording.summary, 'details-summary')}
                                            >
                                                {copiedStates['details-summary'] ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Copy</p></TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )}
                      {selectedRecording.expandedTranscription && (
                        <AccordionItem value="expanded">
                          <AccordionTrigger className="font-semibold">Expanded Note</AccordionTrigger>
                          <AccordionContent>
                            <div className="relative">
                              <div className="prose prose-sm sm:prose-base max-w-none whitespace-pre-wrap dark:prose-invert rounded-md border bg-muted/50 p-4 pr-24" dangerouslySetInnerHTML={createMarkup(selectedRecording.expandedTranscription)}></div>
                              <div className="absolute top-2 right-2 flex items-center">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button size="icon" variant="ghost" className="h-8 w-8 bg-background/50 hover:bg-background" onClick={() => handleShareSection(`${selectedRecording.name} - Expanded Note`, selectedRecording.expandedTranscription)}>
                                              <Share2 className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Share Expanded Note</p></TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 bg-background/50 hover:bg-background"
                                                onClick={() => handleCopyToClipboard(selectedRecording.expandedTranscription, 'details-expanded')}
                                            >
                                                {copiedStates['details-expanded'] ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Copy</p></TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )}
                      {selectedRecording.projectPlan && (
                        <AccordionItem value="project">
                          <AccordionTrigger className="font-semibold">Project Plan</AccordionTrigger>
                          <AccordionContent>
                            <div className="relative">
                              <div className="prose prose-sm sm:prose-base max-w-none whitespace-pre-wrap dark:prose-invert rounded-md border bg-muted/50 p-4 pr-24" dangerouslySetInnerHTML={createMarkup(selectedRecording.projectPlan)}></div>
                              <div className="absolute top-2 right-2 flex items-center">
                                 <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button size="icon" variant="ghost" className="h-8 w-8 bg-background/50 hover:bg-background" onClick={() => handleShareSection(`${selectedRecording.name} - Project Plan`, selectedRecording.projectPlan)}>
                                              <Share2 className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Share Project Plan</p></TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 bg-background/50 hover:bg-background"
                                                onClick={() => handleCopyToClipboard(selectedRecording.projectPlan, 'details-project')}
                                            >
                                                {copiedStates['details-project'] ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Copy</p></TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )}
                      {selectedRecording.actionItems && (
                        <AccordionItem value="tasks">
                          <AccordionTrigger className="font-semibold">Action Items</AccordionTrigger>
                          <AccordionContent>
                            <div className="relative">
                              <div className="prose prose-sm sm:prose-base max-w-none whitespace-pre-wrap dark:prose-invert rounded-md border bg-muted/50 p-4 pr-24" dangerouslySetInnerHTML={createMarkup(selectedRecording.actionItems)}></div>
                              <div className="absolute top-2 right-2 flex items-center">
                                 <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button size="icon" variant="ghost" className="h-8 w-8 bg-background/50 hover:bg-background" onClick={() => handleShareSection(`${selectedRecording.name} - Action Items`, selectedRecording.actionItems)}>
                                              <Share2 className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Share Action Items</p></TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 bg-background/50 hover:bg-background"
                                                onClick={() => handleCopyToClipboard(selectedRecording.actionItems, 'details-tasks')}
                                            >
                                                {copiedStates['details-tasks'] ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Copy</p></TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )}
                    </Accordion>
                  )}
                </div>
              </div>

               <DialogFooter className="flex-wrap justify-end gap-2 pt-4 border-t mt-auto">
                    <Button variant="outline" onClick={() => handleShareAll(selectedRecording)}>
                        <Share2 className="mr-2 h-4 w-4" /> Share All
                    </Button>
                     <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="inline-block">
                               <Button variant="outline" onClick={() => handleSummarizeClick(selectedRecording!)} disabled={!settings.isPro && settings.aiCredits < 1}>
                                  <Sparkles className="mr-2 h-4 w-4" /> Summarize
                              </Button>
                            </div>
                        </TooltipTrigger>
                        {!settings.isPro && <TooltipContent><p>Costs 1 AI Credit</p></TooltipContent>}
                      </Tooltip>
                    </TooltipProvider>
                     <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="inline-block">
                               <Button variant="outline" onClick={() => handleExpandClick(selectedRecording!)} disabled={!settings.isPro && settings.aiCredits < 1}>
                                  <BrainCircuit className="mr-2 h-4 w-4" /> Expand Note
                              </Button>
                            </div>
                        </TooltipTrigger>
                        {!settings.isPro && <TooltipContent><p>Costs 1 AI Credit</p></TooltipContent>}
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="inline-block">
                               <Button variant="outline" onClick={() => handleExpandAsProjectClick(selectedRecording!)} disabled={!settings.isPro && settings.aiCredits < 1}>
                                  <FolderKanban className="mr-2 h-4 w-4" /> As Project
                              </Button>
                            </div>
                        </TooltipTrigger>
                         {!settings.isPro && <TooltipContent><p>Costs 1 AI Credit</p></TooltipContent>}
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="inline-block">
                               <Button variant="outline" onClick={() => handleExtractTasksClick(selectedRecording!)} disabled={!settings.isPro && settings.aiCredits < 1}>
                                  <ListTodo className="mr-2 h-4 w-4" /> Get Tasks
                              </Button>
                            </div>
                        </TooltipTrigger>
                         {!settings.isPro && <TooltipContent><p>Costs 1 AI Credit</p></TooltipContent>}
                      </Tooltip>
                    </TooltipProvider>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      
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
