
'use client';

import { useState, useEffect, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { Trash2, FileText, Share2, BrainCircuit, Send, Loader2, Copy, Check, Save, Sparkles, FolderKanban, ListTodo } from "lucide-react";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { getRecordings, deleteRecording as deleteRecordingFromStorage, AppSettings, saveSettings, updateRecording } from "@/lib/storage";
import type { Recording } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { transcribeVoiceNote } from "@/ai/flows/transcribe-voice-note";
import { nameTranscription } from "@/ai/flows/name-transcription-flow";
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
import { useLanguage } from "@/hooks/use-language";
import { useNavigationLoader } from "@/hooks/use-navigation-loader";


const createMarkup = (markdownText: string | null | undefined) => {
    if (!markdownText) return { __html: '' };
    return { __html: DOMPurify.sanitize(marked(markdownText) as string) };
};

export default function HistoryPage() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const { user, settings, refreshSettings } = useAuth();
  const { t, language } = useLanguage();
  const [isShareApiAvailable, setIsShareApiAvailable] = useState(false);
  const { startNavigation, stopNavigation } = useNavigationLoader();
  
  // AI Action State
  const [aiAction, setAiAction] = useState<'expand' | 'summarize' | 'expand-as-project' | 'extract-tasks' | null>(null);
  const [isProcessingAi, setIsProcessingAi] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [noteForAi, setNoteForAi] = useState<Recording | null>(null);
  const [confirmationAction, setConfirmationAction] = useState<{ action: () => void; title: string; description: string; onCancel?: () => void; } | null>(null);
  const [creditConfirmation, setCreditConfirmation] = useState<{ action: () => void } | null>(null);

  // State for editing transcription
  const [editableTranscription, setEditableTranscription] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.share) {
        setIsShareApiAvailable(true);
    }
  }, []);
  
  const deductCredit = useCallback(async () => {
    if (!user || !settings) return;
    const newSettings = { ...settings, aiCredits: settings.aiCredits - 1 };
    await saveSettings(newSettings, user.uid);
    await refreshSettings();
  }, [user, settings, refreshSettings]);

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


  const refreshRecordings = useCallback(() => {
    if (!user) return;
    startNavigation();
    getRecordings(user.uid)
      .then(setRecordings)
      .catch(() => {
        toast({
          variant: "destructive",
          title: "Failed to refresh history",
          description: "Could not fetch recordings. Please try again.",
        });
      })
      .finally(() => {
        setIsDataLoaded(true);
        stopNavigation();
      });
  }, [user, toast, startNavigation, stopNavigation]);

  useEffect(() => {
    if (user) {
      refreshRecordings();
    } else {
      setIsDataLoaded(true);
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
        title: t('history_deleted_toast_title'),
        description: t('history_deleted_toast'),
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('history_delete_failed_toast_title'),
        description: t('history_delete_failed_toast'),
      });
    }
  };
  
  const handleCopyToClipboard = (text: string | null, id: string) => {
    if (!text) return;
    const cleanText = text.replace(/<[^>]*>?/gm, '');
    navigator.clipboard.writeText(cleanText).then(() => {
        setCopiedStates(prev => ({...prev, [id]: true}));
        toast({ title: t('ai_copied_toast'), className: "bg-accent text-accent-foreground border-accent" });
        setTimeout(() => setCopiedStates(prev => ({...prev, [id]: false})), 2000);
    });
  };

  const shareContent = async (shareData: ShareData) => {
    if (!navigator.share) {
      // Fallback for browsers that don't support the Share API
      if (shareData.text) {
        handleCopyToClipboard(shareData.text, 'share-fallback');
        toast({ title: t('record_share_unsupported_title'), description: t('record_share_unsupported_desc') });
      } else {
        toast({ variant: "destructive", title: t('record_share_unsupported_file_title'), description: t('record_share_unsupported_file_desc') });
      }
      return;
    }

    try {
      await navigator.share(shareData);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // User clicked cancel, this is not an error.
        return;
      }
      // For any other error, assume it's a failure and inform the user.
      console.error("Share API failed:", err);
      toast({
        variant: "destructive",
        title: t('record_share_fail_title'),
        description: t('record_share_fail_desc'),
      });
    }
  };
  
  const handleShareAudio = async (recording: Recording) => {
    if (!recording.audioDataUri) return;
    try {
        const blob = await (await fetch(recording.audioDataUri)).blob();
        const file = new File([blob], `${recording.name}.webm`, { type: 'audio/webm' });
        await shareContent({
            title: recording.name,
            files: [file]
        });
    } catch (error) {
        console.error("Error preparing audio file for sharing:", error);
        toast({
            variant: "destructive",
            title: t('record_share_audio_fail_title'),
            description: t('record_share_audio_fail_desc'),
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
        { title: t('history_transcription_heading'), content: editableTranscription },
        { title: t('history_summary_heading'), content: recording.summary },
        { title: t('history_expanded_note_heading'), content: recording.expandedTranscription },
        { title: t('history_project_plan_heading'), content: recording.projectPlan },
        { title: t('history_action_items_heading'), content: recording.actionItems },
    ];

    const textToShare = sections
        .filter(section => section.content)
        .map(section => `## ${section.title}\n\n${section.content.replace(/<[^>]*>?/gm, '')}`)
        .join('\n\n---\n\n');

    if (!textToShare) {
      toast({
        variant: "destructive",
        title: t('history_nothing_to_share_title'),
        description: t('history_nothing_to_share'),
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

  const proceedWithTranscribe = async (recording: Recording) => {
    if (!user || !settings || !recording.audioDataUri) return;
    setProcessingId(recording.id);
    setIsTranscribing(true);
    if (!settings.isPro) await deductCredit();

    try {
        const transcribeResult = await transcribeVoiceNote({ audioDataUri: recording.audioDataUri });
        const nameResult = await nameTranscription({ transcription: transcribeResult.transcription });

        const updatedRec = {
            ...recording,
            transcription: transcribeResult.transcription,
            name: nameResult.name,
        };

        await updateRecording(updatedRec, user.uid);
        refreshRecordings();
        setSelectedRecording(updatedRec);
        setEditableTranscription(updatedRec.transcription);
        toast({ title: t('ai_transcribe_success') });
    } catch (err) {
        console.error("Transcription from history failed:", err);
        toast({ variant: "destructive", title: t('ai_transcribe_fail_title'), description: t('ai_transcribe_fail') });
    } finally {
        setIsTranscribing(false);
        setProcessingId(null);
    }
  };

  const handleTranscribeFromHistory = (recording: Recording) => {
    handleAiActionClick(() => proceedWithTranscribe(recording));
  };

  const proceedWithExpand = (recording: Recording) => {
    if (!user || !settings) return;
    setNoteForAi(recording);
    setAiAction('expand');
    setAiResult(null);
    setIsProcessingAi(true);
    setProcessingId(recording.id);
    if (!settings.isPro) deductCredit();

    expandNote({ transcription: recording.transcription })
      .then(async (result) => {
        const updatedRec = { ...recording, expandedTranscription: result.expandedDocument };
        await updateRecording(updatedRec, user.uid);
        refreshRecordings();
        setSelectedRecording(updatedRec); // Update the selected recording in the dialog
        setAiResult(result.expandedDocument);
        toast({ title: t('ai_expand_success') });
      })
      .catch(err => {
        console.error("Expansion failed:", err);
        toast({ variant: "destructive", title: t('ai_expand_fail_title'), description: t('ai_expand_fail') });
        setNoteForAi(null);
      })
      .finally(() => {
        setIsProcessingAi(false);
        setProcessingId(null);
      });
  };

  const handleExpandClick = (recording: Recording) => {
    setProcessingId(recording.id);
    setAiAction('expand');
    if (recording.expandedTranscription) {
        setConfirmationAction({
            action: () => handleAiActionClick(() => proceedWithExpand(recording)),
            title: t('ai_overwrite_title', { feature: t('history_expanded_note_heading')}),
            description: t('ai_overwrite_desc'),
            onCancel: () => { setProcessingId(null); setAiAction(null); }
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
    setProcessingId(recording.id);
    if (!settings.isPro) deductCredit();
    
    summarizeNote({ transcription: recording.transcription })
      .then(async (result) => {
        const updatedRec = { ...recording, summary: result.summary };
        await updateRecording(updatedRec, user.uid);
        refreshRecordings();
        setSelectedRecording(updatedRec); // Update the selected recording in the dialog
        setAiResult(result.summary);
        toast({ title: t('ai_summarize_success') });
      })
      .catch(err => {
        console.error("Summarization failed:", err);
        toast({ variant: "destructive", title: t('ai_summarize_fail_title'), description: t('ai_summarize_fail') });
        setNoteForAi(null);
      })
      .finally(() => {
        setIsProcessingAi(false);
        setProcessingId(null);
      });
  };

  const handleSummarizeClick = (recording: Recording) => {
    setProcessingId(recording.id);
    setAiAction('summarize');
    if (recording.summary) {
        setConfirmationAction({
            action: () => handleAiActionClick(() => proceedWithSummarize(recording)),
            title: t('ai_overwrite_title', { feature: t('history_summary_heading')}),
            description: t('ai_overwrite_desc'),
            onCancel: () => { setProcessingId(null); setAiAction(null); }
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
    setProcessingId(recording.id);
    if (!settings.isPro) deductCredit();

    expandAsProject({ transcription: recording.transcription })
      .then(async (result) => {
        const updatedRec = { ...recording, projectPlan: result.projectPlan };
        await updateRecording(updatedRec, user.uid);
        refreshRecordings();
        setSelectedRecording(updatedRec); // Update the selected recording in the dialog
        setAiResult(result.projectPlan);
        toast({ title: t('ai_project_plan_success') });
      })
      .catch(err => {
        console.error("Project plan generation failed:", err);
        toast({ variant: "destructive", title: t('ai_project_plan_fail_title'), description: t('ai_project_plan_fail') });
        setNoteForAi(null);
      })
      .finally(() => {
        setIsProcessingAi(false);
        setProcessingId(null);
      });
  };

  const handleExpandAsProjectClick = (recording: Recording) => {
    setProcessingId(recording.id);
    setAiAction('expand-as-project');
    if (recording.projectPlan) {
        setConfirmationAction({
            action: () => handleAiActionClick(() => proceedWithExpandAsProject(recording)),
            title: t('ai_overwrite_title', { feature: t('history_project_plan_heading')}),
            description: t('ai_overwrite_desc'),
            onCancel: () => { setProcessingId(null); setAiAction(null); }
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
    setProcessingId(recording.id);
    if (!settings.isPro) deductCredit();

    extractTasks({ transcription: recording.transcription })
      .then(async (result) => {
        const updatedRec = { ...recording, actionItems: result.tasks };
        await updateRecording(updatedRec, user.uid);
        refreshRecordings();
        setSelectedRecording(updatedRec); // Update the selected recording in the dialog
        setAiResult(result.tasks);
        toast({ title: t('ai_extract_tasks_success') });
      })
      .catch(err => {
        console.error("Task extraction failed:", err);
        toast({ variant: "destructive", title: t('ai_extract_tasks_fail_title'), description: t('ai_extract_tasks_fail') });
        setNoteForAi(null);
      })
      .finally(() => {
        setIsProcessingAi(false);
        setProcessingId(null);
      });
  };

  const handleExtractTasksClick = (recording: Recording) => {
    setProcessingId(recording.id);
    setAiAction('extract-tasks');
    if (recording.actionItems) {
        setConfirmationAction({
            action: () => handleAiActionClick(() => proceedWithExtractTasks(recording)),
            title: t('ai_overwrite_title', { feature: t('history_action_items_heading')}),
            description: t('ai_overwrite_desc'),
            onCancel: () => { setProcessingId(null); setAiAction(null); }
        });
    } else {
        handleAiActionClick(() => proceedWithExtractTasks(recording));
    }
  };

  const handleSaveTranscription = async () => {
    if (!selectedRecording || !user) return;
    if (editableTranscription === selectedRecording.transcription) {
      toast({ title: t('record_no_changes_to_save') });
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
          
          toast({ title: t('ai_update_success') });
        } catch (error) {
          console.error('Update Failed:', error);
          toast({ variant: 'destructive', title: t('ai_update_fail_title'), description: t('ai_update_fail') });
        } finally {
          setIsSaving(false);
        }
      },
      title: t('ai_overwrite_title', { feature: t('history_transcription_heading')}),
      description: t('ai_overwrite_desc'),
      onCancel: () => setIsSaving(false),
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
  
  if (!isDataLoaded) {
    return null; // The global loader in AppShell will be visible
  }

  return (
    <div className="container mx-auto p-4 pt-8 flex h-full flex-col">
      <h1 className="text-3xl font-bold mb-6 text-center">{t('history_page_title')}</h1>
      {recordings.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
            <Card className="w-full max-w-sm text-center p-8 bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>{t('history_no_recordings')}</CardTitle>
                <CardDescription>
                  {t('history_no_recordings_desc')}
                  {settings && !settings.isPro && (
                    <>
                    <br /> {t('login_and')} <Link href="/pricing" className="underline text-primary">{t('history_no_recordings_pro_trial')}</Link>.
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
              <TooltipProvider key={rec.id}>
                <Card className="bg-card/80 border-border backdrop-blur-sm flex flex-col">
                  <CardHeader>
                    <CardTitle className="truncate">{rec.name}</CardTitle>
                    <CardDescription>
                      {t('history_recorded_ago', { timeAgo: formatDistanceToNow(new Date(rec.date), { addSuffix: true }) })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    {rec.transcription ? (
                      <p className="text-muted-foreground line-clamp-3">{rec.summary || rec.transcription}</p>
                    ) : (
                      <p className="text-muted-foreground italic">{t('history_audio_note_placeholder')}</p>
                    )}
                  </CardContent>
                  <CardFooter className="flex items-center gap-2">
                      <div className="flex-1 flex gap-1 flex-wrap">
                          <Tooltip>
                              <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedRecording(rec)}>
                                  <FileText className="h-4 w-4" />
                              </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>{t('history_view_details_tooltip')}</p></TooltipContent>
                          </Tooltip>
                           {rec.transcription && settings && (
                              <>
                                  <Tooltip>
                                      <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleSimpleShare(rec)}>
                                          <Share2 className="h-4 w-4" />
                                      </Button>
                                      </TooltipTrigger>
                                      <TooltipContent><p>{t('history_share_note_tooltip')}</p></TooltipContent>
                                  </Tooltip>
                                   <Tooltip>
                                      <TooltipTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleSummarizeClick(rec)} disabled={(!settings.isPro && settings.aiCredits < 1) || !!processingId}>
                                              {processingId === rec.id && aiAction === 'summarize' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                          </Button>
                                      </TooltipTrigger>
                                      <TooltipContent><p>{settings.isPro ? t('history_summarize_tooltip') : t('history_summarize_tooltip_credits', { credits: settings.aiCredits })}</p></TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                      <TooltipTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleExpandClick(rec)} disabled={(!settings.isPro && settings.aiCredits < 1) || !!processingId}>
                                              {processingId === rec.id && aiAction === 'expand' ? <Loader2 className="h-4 w-4 animate-spin" /> : <BrainCircuit className="h-4 w-4" />}
                                          </Button>
                                      </TooltipTrigger>
                                      <TooltipContent><p>{settings.isPro ? t('history_expand_tooltip') : t('history_expand_tooltip_credits', { credits: settings.aiCredits })}</p></TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                      <TooltipTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleExpandAsProjectClick(rec)} disabled={(!settings.isPro && settings.aiCredits < 1) || !!processingId}>
                                              {processingId === rec.id && aiAction === 'expand-as-project' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderKanban className="h-4 w-4" />}
                                          </Button>
                                      </TooltipTrigger>
                                      <TooltipContent><p>{settings.isPro ? t('history_project_plan_tooltip') : t('history_project_plan_tooltip_credits', { credits: settings.aiCredits })}</p></TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                      <TooltipTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleExtractTasksClick(rec)} disabled={(!settings.isPro && settings.aiCredits < 1) || !!processingId}>
                                              {processingId === rec.id && aiAction === 'extract-tasks' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListTodo className="h-4 w-4" />}
                                          </Button>
                                      </TooltipTrigger>
                                      <TooltipContent><p>{settings.isPro ? t('history_extract_tasks_tooltip') : t('history_extract_tasks_tooltip_credits', { credits: settings.aiCredits })}</p></TooltipContent>
                                  </Tooltip>
                              </>
                          )}
                      </div>
                      <AlertDialog>
                          <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="icon" className="h-8 w-8 flex-shrink-0">
                              <Trash2 className="h-4 w-4" />
                          </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                          <AlertDialogHeader>
                              <AlertDialogTitle>{t('history_delete_dialog_title')}</AlertDialogTitle>
                              <AlertDialogDescription>
                              {t('history_delete_dialog_desc')}
                              </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                              <AlertDialogCancel>{t('history_cancel_button')}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(rec.id)}>{t('history_delete_button')}</AlertDialogAction>
                          </AlertDialogFooter>
                          </AlertDialogContent>
                      </AlertDialog>
                  </CardFooter>
                </Card>
              </TooltipProvider>
            ))}
          </div>
        </ScrollArea>
      )}

      <Dialog open={!!selectedRecording} onOpenChange={(open) => !open && setSelectedRecording(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          {selectedRecording && settings && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedRecording.name}</DialogTitle>
                <DialogDescription>
                  {t('history_recorded_ago', { timeAgo: formatDistanceToNow(new Date(selectedRecording.date), { addSuffix: true }) })}
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex-1 overflow-y-auto min-h-0 pr-6 -mr-6">
                <div className="space-y-4 py-4">
                  <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                          <h3 className="font-semibold">Audio</h3>
                          {selectedRecording.audioDataUri && isShareApiAvailable && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleShareAudio(selectedRecording)}>
                                            <Share2 className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>{t('history_share_audio_tooltip')}</p></TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                          )}
                      </div>
                      {selectedRecording.audioDataUri ? (
                        <audio controls className="w-full" src={selectedRecording.audioDataUri}></audio>
                      ) : (
                        <div className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-md border">
                          {t('history_audio_playback_unavailable')}
                        </div>
                      )}
                  </div>

                  {selectedRecording.transcription ? (
                    <>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">{t('history_transcription_heading')}</h3>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleSaveTranscription}
                              disabled={isSaving || !selectedRecording || editableTranscription === selectedRecording.transcription}
                            >
                              {isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                              {t('record_save_button')}
                            </Button>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleShareSection(selectedRecording.name, editableTranscription)}>
                                      <Share2 className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>{t('history_share_note_tooltip')}</p></TooltipContent>
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
                              <AccordionTrigger className="font-semibold">{t('history_summary_heading')}</AccordionTrigger>
                              <AccordionContent>
                                <div className="relative">
                                  <p className="text-foreground/90 whitespace-pre-wrap bg-muted/50 rounded-md p-4 pr-24 border">{selectedRecording.summary}</p>
                                  <div className="absolute top-2 right-2 flex items-center">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button size="icon" variant="ghost" className="h-8 w-8 bg-background/50 hover:bg-background" onClick={() => handleShareSection(`${selectedRecording.name} - ${t('history_summary_heading')}`, selectedRecording.summary)}>
                                                  <Share2 className="h-4 w-4" />
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>{t('history_share_note_tooltip')}</p></TooltipContent>
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
                              <AccordionTrigger className="font-semibold">{t('history_expanded_note_heading')}</AccordionTrigger>
                              <AccordionContent>
                                <div className="relative">
                                  <div className="prose prose-sm sm:prose-base max-w-none whitespace-pre-wrap dark:prose-invert rounded-md border bg-muted/50 p-4 pr-24" dangerouslySetInnerHTML={createMarkup(selectedRecording.expandedTranscription)}></div>
                                  <div className="absolute top-2 right-2 flex items-center">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button size="icon" variant="ghost" className="h-8 w-8 bg-background/50 hover:bg-background" onClick={() => handleShareSection(`${selectedRecording.name} - ${t('history_expanded_note_heading')}`, selectedRecording.expandedTranscription)}>
                                                  <Share2 className="h-4 w-4" />
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>{t('history_share_note_tooltip')}</p></TooltipContent>
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
                              <AccordionTrigger className="font-semibold">{t('history_project_plan_heading')}</AccordionTrigger>
                              <AccordionContent>
                                <div className="relative">
                                  <div className="prose prose-sm sm:prose-base max-w-none whitespace-pre-wrap dark:prose-invert rounded-md border bg-muted/50 p-4 pr-24" dangerouslySetInnerHTML={createMarkup(selectedRecording.projectPlan)}></div>
                                  <div className="absolute top-2 right-2 flex items-center">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button size="icon" variant="ghost" className="h-8 w-8 bg-background/50 hover:bg-background" onClick={() => handleShareSection(`${selectedRecording.name} - ${t('history_project_plan_heading')}`, selectedRecording.projectPlan)}>
                                                  <Share2 className="h-4 w-4" />
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>{t('history_share_note_tooltip')}</p></TooltipContent>
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
                              <AccordionTrigger className="font-semibold">{t('history_action_items_heading')}</AccordionTrigger>
                              <AccordionContent>
                                <div className="relative">
                                  <div className="prose prose-sm sm:prose-base max-w-none whitespace-pre-wrap dark:prose-invert rounded-md border bg-muted/50 p-4 pr-24" dangerouslySetInnerHTML={createMarkup(selectedRecording.actionItems)}></div>
                                  <div className="absolute top-2 right-2 flex items-center">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button size="icon" variant="ghost" className="h-8 w-8 bg-background/50 hover:bg-background" onClick={() => handleShareSection(`${selectedRecording.name} - ${t('history_action_items_heading')}`, selectedRecording.actionItems)}>
                                                  <Share2 className="h-4 w-4" />
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>{t('history_share_note_tooltip')}</p></TooltipContent>
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
                    </>
                  ) : (
                     <Card className="my-4 text-center bg-card/80 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle>{t('history_ready_to_transcribe')}</CardTitle>
                            <CardDescription>{t('history_ready_to_transcribe_desc')}</CardDescription>
                        </CardHeader>
                        <CardFooter className="justify-center">
                            <Button onClick={() => handleTranscribeFromHistory(selectedRecording)} disabled={isTranscribing || (!settings.isPro && settings.aiCredits < 1)}>
                                {isTranscribing ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2" />}
                                {settings.isPro ? t('history_transcribe_with_ai') : t('history_transcribe_with_credit')}
                            </Button>
                        </CardFooter>
                    </Card>
                  )}
                </div>
              </div>

               <DialogFooter className="pt-4 border-t mt-auto">
                  {selectedRecording.transcription && (
                    <div className="w-full flex flex-col gap-2">
                      <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button className="w-full" variant="outline" onClick={() => handleSummarizeClick(selectedRecording!)} disabled={(!settings.isPro && settings.aiCredits < 1) || !!processingId}>
                                    {processingId === selectedRecording.id && aiAction === 'summarize' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                    {t('record_summarize_button')}
                                </Button>
                              </TooltipTrigger>
                              {!settings.isPro && <TooltipContent><p>Costs 1 AI Credit</p></TooltipContent>}
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                  <Button className="w-full" variant="outline" onClick={() => handleExpandClick(selectedRecording!)} disabled={(!settings.isPro && settings.aiCredits < 1) || !!processingId}>
                                      {processingId === selectedRecording.id && aiAction === 'expand' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BrainCircuit className="mr-2 h-4 w-4" />}
                                      {t('record_expand_button')}
                                  </Button>
                              </TooltipTrigger>
                              {!settings.isPro && <TooltipContent><p>Costs 1 AI Credit</p></TooltipContent>}
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                  <Button className="w-full" variant="outline" onClick={() => handleExpandAsProjectClick(selectedRecording!)} disabled={(!settings.isPro && settings.aiCredits < 1) || !!processingId}>
                                      {processingId === selectedRecording.id && aiAction === 'expand-as-project' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FolderKanban className="mr-2 h-4 w-4" />}
                                      {t('record_project_plan_button')}
                                  </Button>
                              </TooltipTrigger>
                              {!settings.isPro && <TooltipContent><p>Costs 1 AI Credit</p></TooltipContent>}
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                  <Button className="w-full" variant="outline" onClick={() => handleExtractTasksClick(selectedRecording!)} disabled={(!settings.isPro && settings.aiCredits < 1) || !!processingId}>
                                      {processingId === selectedRecording.id && aiAction === 'extract-tasks' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ListTodo className="mr-2 h-4 w-4" />}
                                      {t('record_get_tasks_button')}
                                  </Button>
                              </TooltipTrigger>
                              {!settings.isPro && <TooltipContent><p>Costs 1 AI Credit</p></TooltipContent>}
                            </Tooltip>
                          </TooltipProvider>
                      </div>
                      <Button variant="outline" className="w-full" onClick={() => handleShareAll(selectedRecording)}>
                          <Share2 className="mr-2 h-4 w-4" /> {t('history_share_all_button')}
                      </Button>
                    </div>
                  )}
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
                                    <TooltipContent><p>Copy</p></TooltipContent>
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

    <AlertDialog open={!!confirmationAction} onOpenChange={(open) => {if (!open) { confirmationAction?.onCancel?.(); setConfirmationAction(null); }}}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmationAction?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmationAction?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
                confirmationAction?.onCancel?.();
                setConfirmationAction(null);
            }}>{t('history_cancel_button')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
                confirmationAction?.action();
                setConfirmationAction(null);
            }}>
                {t('ai_overwrite_button')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={!!creditConfirmation} onOpenChange={(open) => !open && setCreditConfirmation(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>{t('ai_confirmation_title')}</AlertDialogTitle>
            <AlertDialogDescription>
                {t('ai_confirmation_desc', { credits: settings?.aiCredits ?? 0, plural: (settings?.aiCredits ?? 0) !== 1 ? 's' : '' })}
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
