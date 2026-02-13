import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Sparkles, FileText, Volume2, VolumeX, Download, Library, RefreshCw, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Document, Song } from "@shared/schema";

const generateFormSchema = z.object({
  content: z.string().min(10, "Please enter at least 10 characters of lesson content"),
  documentId: z.string().optional(),
  musicalStyle: z.enum(["traditional", "highlife", "afrobeat", "palm-wine"]),
  complexity: z.enum(["simple", "moderate", "advanced"]),
});

type GenerateFormValues = z.infer<typeof generateFormSchema>;

export default function Generate() {
  const { toast } = useToast();
  const [generatedSong, setGeneratedSong] = useState<Song | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioStatus, setAudioStatus] = useState<"idle" | "running" | "success">("idle");


  const { data: documents, isLoading: documentsLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const form = useForm<GenerateFormValues>({
    resolver: zodResolver(generateFormSchema),
    defaultValues: {
      content: "",
      documentId: undefined,
      musicalStyle: "traditional",
      complexity: "simple",
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (values: GenerateFormValues) => {
      const response = await apiRequest("POST", "/api/songs/generate", values);
      const data = await response.json();
      return data as Song;
    },
    onSuccess: (data) => {
      console.log("Mutation Success Data:", data);
      setGeneratedSong(data);
      setAudioUrl(null);
      setAudioStatus("running");
      
      
      toast({
        title: "Song lyrics generated!",
        description: `"${data.title}" has been created. Now composing the music...`,
      });
      
      if (data.id) {
        pollForAudio(data.id);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate song. Please try again.",
        variant: "destructive",
      });
    },
  });


  const handleDocumentSelect = (documentId: string) => {
    const doc = documents?.find((d) => d.id === documentId);
    if (doc) {
      form.setValue("content", doc.content);
      form.setValue("documentId", documentId);
    }
  };

  const handleSpeak = () => {
    if (!generatedSong) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(generatedSong.lyrics);
    utterance.rate = 0.8;
    utterance.pitch = 1.1;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const handleExport = (format: "txt" | "pdf") => {
    if (!generatedSong) return;

    const content = `${generatedSong.title}\n\n${generatedSong.lyrics}\n\n---\nRhythm Pattern: ${generatedSong.rhythmPattern || "Traditional"}\nMusical Style: ${generatedSong.musicalStyle || "Traditional"}\n\nCultural Notes:\n${generatedSong.culturalNotes || "N/A"}`;

    if (format === "txt") {
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const title = generatedSong?.title?.trim() || "Untitled_Song";
      a.href = url;
      a.download = `${title.replace(/[^a-zA-Z0-9_-]/g, "_")}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }

    toast({
      title: "Export successful",
      description: `Song exported as ${format.toUpperCase()} file.`,
    });
  };

  const pollForAudio = async (songId: string) => {
  try {
    const res = await fetch(`/api/songs/${songId}/audio`);
    const data = await res.json();

    if (data.status === "success") {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);

      setAudioUrl(data.audioUrl);
      setAudioStatus("success");

      queryClient.invalidateQueries({ queryKey: ["/api/songs"] });
      return;
    }

    if (data.status === "running") {
      setAudioStatus("running");
      setTimeout(() => pollForAudio(songId), 15000);
    }
  } catch (err) {
    console.error("Audio polling failed", err);
  }
};


  const onSubmit = (values: GenerateFormValues) => {
    setAudioUrl(null);
    setAudioStatus("idle");
    setGeneratedSong(null);
    generateMutation.mutate(values);
  };

  return (
    <div className="flex flex-col gap-8 p-6 md:p-8 lg:p-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl" data-testid="text-generate-title">
          Generate Song
        </h1>
        <p className="text-muted-foreground">
          Transform lesson content into memorable, culturally appropriate songs
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Input Content
              </CardTitle>
              <CardDescription>
                Paste your lesson text or select an uploaded document
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
                  <FormField
                    control={form.control}
                    name="documentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Document (Optional)</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleDocumentSelect(value);
                          }}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-document">
                              <SelectValue placeholder="Choose an uploaded document" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {documentsLoading ? (
                              <div className="p-2">
                                <Skeleton className="h-4 w-full" />
                              </div>
                            ) : documents?.length ? (
                              documents.map((doc) => (
                                <SelectItem key={doc.id} value={doc.id}>
                                  {doc.originalName}
                                </SelectItem>
                              ))
                            ) : (
                              <div className="p-2 text-sm text-muted-foreground">
                                No documents uploaded yet
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lesson Content</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Paste your lesson content here. For example: 'The water cycle is the continuous movement of water on, above, and below the surface of Earth...'"
                            className="min-h-[200px] resize-none"
                            data-testid="input-content"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Enter the lesson material you want to convert into a song
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="musicalStyle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Musical Style</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-style">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="traditional">Traditional West African</SelectItem>
                            <SelectItem value="highlife">Highlife</SelectItem>
                            <SelectItem value="afrobeat">Afrobeat</SelectItem>
                            <SelectItem value="palm-wine">Palm-Wine</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Choose the cultural musical style for your song
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="complexity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Complexity Level</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-complexity">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="simple">Simple (Ages 5-7)</SelectItem>
                            <SelectItem value="moderate">Moderate (Ages 8-10)</SelectItem>
                            <SelectItem value="advanced">Advanced (Ages 11-12)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Select the appropriate level for your students
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={generateMutation.isPending}
                    data-testid="button-generate"
                  >
                    {generateMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating Song...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate Song
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Generated Song
              </CardTitle>
              <CardDescription>
                Your AI-generated educational song will appear here
              </CardDescription>
            </CardHeader>
            <CardContent>
              {generateMutation.isPending ? (
                <div className="flex flex-col gap-4">
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-4 w-1/4" />
                  <Separator />
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <Skeleton key={i} className="h-4 w-full" />
                    ))}
                  </div>
                </div>
              ) : generatedSong ? (
                <div className="flex flex-col gap-6">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <h3 className="text-xl font-semibold" data-testid="text-song-title">
                        {generatedSong.title}
                      </h3>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{generatedSong.musicalStyle}</Badge>
                        <Badge variant="outline">{generatedSong.topic}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleSpeak}
                        disabled={!!audioUrl}
                        data-testid="button-speak"
                        title={
                          audioUrl
                            ? "Singing audio available below"
                            : isSpeaking
                            ? "Stop speaking"
                            : "Read aloud"
                        }
                      >
                        {isSpeaking ? (
                          <VolumeX className="h-4 w-4" />
                        ) : (
                          <Volume2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap font-serif text-base leading-relaxed" data-testid="text-lyrics">
                      {generatedSong.lyrics}
                    </div>
                  </div>

                  {generatedSong.rhythmPattern && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="mb-2 font-medium">Rhythm Pattern</h4>
                        <p className="text-sm text-muted-foreground" data-testid="text-rhythm">
                          {generatedSong.rhythmPattern}
                        </p>
                      </div>
                    </>
                  )}

                  {generatedSong.culturalNotes && (
                    <div className="rounded-md bg-accent/50 p-4">
                      <h4 className="mb-2 font-medium">Cultural Context</h4>
                      <p className="text-sm text-muted-foreground" data-testid="text-cultural-notes">
                        {generatedSong.culturalNotes}
                      </p>
                    </div>
                  )}

                  {audioStatus === "running" && (
                    <div className="flex flex-col gap-2 mt-4 p-4 border rounded-md bg-muted/50">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                         Creating music… this may take a moment
                      </p>
                      <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                        <div className="bg-primary h-full animate-pulse w-2/3"></div>
                      </div>
                    </div>
                  )}

                  {audioUrl && (
                    <div className="mt-4 p-4 border rounded-md bg-card">
                      <h4 className="text-sm font-medium mb-2">Song Audio</h4>
                      <audio controls className="w-full" autoPlay>
                        <source src={audioUrl} type="audio/mpeg" />
                        Your browser does not support audio playback.
                      </audio>
                    </div>
                  )}


                  <Separator />

                  <div className="flex flex-wrap gap-2">
                    <Link href="/library">
                      <Button data-testid="button-view-library">
                        <Library className="mr-2 h-4 w-4" />
                        View in Library
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      onClick={() => handleExport("txt")}
                      data-testid="button-export-txt"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export as TXT
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => form.handleSubmit(onSubmit)()}
                      disabled={generateMutation.isPending}
                      data-testid="button-regenerate"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Regenerate
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                  <Sparkles className="h-16 w-16 text-muted-foreground" />
                  <div>
                    <h3 className="font-medium">Ready to Create</h3>
                    <p className="text-sm text-muted-foreground">
                      Enter your lesson content and click Generate to create a song
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
