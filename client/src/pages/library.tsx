import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Search, Music, Grid, List, Play, Pause, Download, Trash2, Clock, Filter } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Song } from "@shared/schema";



export default function Library() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [styleFilter, setStyleFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [deletingSongId, setDeletingSongId] = useState<string | null>(null);

  const { data: songs, isLoading } = useQuery<Song[]>({
    queryKey: ["/api/songs"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (songId: string) => {
      await apiRequest("DELETE", `/api/songs/${songId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/songs"] });
      setDeletingSongId(null);
      toast({
        title: "Song deleted",
        description: "The song has been removed from your library.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete song.",
        variant: "destructive",
      });
    },
  });

  const filteredSongs = songs?.filter((song) => {
    const matchesSearch =
      song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.lyrics.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStyle = styleFilter === "all" || song.musicalStyle === styleFilter;
    return matchesSearch && matchesStyle;
  }) || [];

  const handlePlay = (song: Song) => {
    
    window.speechSynthesis.cancel();
    
    
    if (selectedSong?.id !== song.id) {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
      setIsSpeaking(false);
    }

    
    if (selectedSong?.id === song.id && (currentAudio || window.speechSynthesis.speaking)) {
      if (isSpeaking) {
        handlePause();
      } else {
        handleResume();
      }
      return;
    }

    
    setSelectedSong(song);

    
    if (song.audioUrl) {
      const audio = new Audio(song.audioUrl);
      audio.onended = () => {
        setIsSpeaking(false);
        setCurrentAudio(null);
      };
      audio.onplay = () => setIsSpeaking(true);
      audio.onpause = () => setIsSpeaking(false);
      
      setCurrentAudio(audio);
      audio.play().catch(err => {
        console.error("Audio playback failed", err);
        toast({
          title: "Playback failed",
          description: "Could not play the audio file.",
          variant: "destructive"
        });
      });
      return;
    }

    
    const utterance = new SpeechSynthesisUtterance(song.lyrics);
    utterance.rate = 0.8;
    utterance.pitch = 1.1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      setCurrentAudio(null);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setCurrentAudio(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  const handlePause = () => {
    if (currentAudio) {
      currentAudio.pause();
    } else if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
    }
    setIsSpeaking(false);
  };

  const handleResume = () => {
    if (currentAudio) {
      currentAudio.play();
      setIsSpeaking(true);
    } else if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsSpeaking(true);
    }
  };

  const handleExport = (song: Song) => {
    const content = `${song.title}\n\n${song.lyrics}\n\n---\nRhythm Pattern: ${song.rhythmPattern || "Traditional"}\nMusical Style: ${song.musicalStyle || "Traditional"}\n\nCultural Notes:\n${song.culturalNotes || "N/A"}`;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${song.title.replace(/\s+/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: "Song exported as TXT file.",
    });
  };

  return (
    <div className="flex flex-col gap-8 p-6 md:p-8 lg:p-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl" data-testid="text-library-title">
          Song Library
        </h1>
        <p className="text-muted-foreground">
          Browse and manage your collection of educational songs
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search songs by title, topic, or lyrics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
          <Select value={styleFilter} onValueChange={setStyleFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-filter-style">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter by style" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Styles</SelectItem>
              <SelectItem value="traditional">Traditional</SelectItem>
              <SelectItem value="highlife">Highlife</SelectItem>
              <SelectItem value="afrobeat">Afrobeat</SelectItem>
              <SelectItem value="palm-wine">Palm-Wine</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("grid")}
            data-testid="button-view-grid"
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("list")}
            data-testid="button-view-list"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className={viewMode === "grid" ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3" : "flex flex-col gap-4"}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredSongs.length > 0 ? (
        viewMode === "grid" ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredSongs.map((song) => (
              <Card
                key={song.id}
                className="cursor-pointer hover-elevate"
                onClick={() => setSelectedSong(song)}
                data-testid={`card-song-${song.id}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base line-clamp-1">{song.title}</CardTitle>
                    <Badge variant="secondary" className="shrink-0">
                      {song.musicalStyle || "traditional"}
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(song.createdAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {song.lyrics.split("\n").slice(0, 3).join(" ")}...
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isSpeaking && selectedSong?.id === song.id) {
                          handlePause();
                        } else {
                          handlePlay(song);
                        }
                      }}
                      data-testid={`button-play-${song.id}`}
                    >
                      {isSpeaking && selectedSong?.id === song.id ? (
                        <Pause className="h-4 w-4" />
                      ) : song.audioUrl ? (
                        <Music className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExport(song);
                      }}
                      data-testid={`button-export-${song.id}`}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingSongId(song.id);
                      }}
                      data-testid={`button-delete-${song.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredSongs.map((song) => (
              <Card
                key={song.id}
                className="cursor-pointer hover-elevate"
                onClick={() => setSelectedSong(song)}
                data-testid={`row-song-${song.id}`}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <Music className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{song.title}</h3>
                    <p className="text-sm text-muted-foreground truncate">{song.topic}</p>
                  </div>
                  <Badge variant="secondary">{song.musicalStyle}</Badge>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {new Date(song.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isSpeaking && selectedSong?.id === song.id) {
                          handlePause();
                        } else {
                          handlePlay(song);
                        }
                      }}
                    >
                      {isSpeaking && selectedSong?.id === song.id ? (
                        <Pause className="h-4 w-4" />
                      ) : song.audioUrl ? (
                        <Music className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExport(song);
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingSongId(song.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16">
            <Music className="h-16 w-16 text-muted-foreground" />
            <div className="text-center">
              <h3 className="font-medium">No songs found</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery || styleFilter !== "all"
                  ? "Try adjusting your search or filter"
                  : "Generate your first song to get started"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selectedSong} onOpenChange={(open) => !open && setSelectedSong(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedSong && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{selectedSong.title}</DialogTitle>
                <DialogDescription className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary">{selectedSong.musicalStyle}</Badge>
                  <Badge variant="outline">{selectedSong.topic}</Badge>
                  <span className="text-muted-foreground">
                    Created {new Date(selectedSong.createdAt).toLocaleDateString()}
                  </span>
                </DialogDescription>
              </DialogHeader>

              <Separator />

              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap font-serif text-base leading-relaxed">
                  {selectedSong.lyrics}
                </div>
              </div>

              {selectedSong.rhythmPattern && (
                <>
                  <Separator />
                  <div>
                    <h4 className="mb-2 font-medium">Rhythm Pattern</h4>
                    <p className="text-sm text-muted-foreground">{selectedSong.rhythmPattern}</p>
                  </div>
                </>
              )}

              {selectedSong.culturalNotes && (
                <div className="rounded-md bg-accent/50 p-4">
                  <h4 className="mb-2 font-medium">Cultural Context</h4>
                  <p className="text-sm text-muted-foreground">{selectedSong.culturalNotes}</p>
                </div>
              )}

              <DialogFooter className="flex-wrap gap-2">
                <Button variant="outline" onClick={() => {
                  if (selectedSong) {
                    handlePlay(selectedSong);
                  }
                }}>
                  {isSpeaking && selectedSong?.id === selectedSong?.id ? (
                    <Pause className="mr-2 h-4 w-4" />
                  ) : (selectedSong?.audioUrl || currentAudio) ? (
                    <Music className="mr-2 h-4 w-4" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  {isSpeaking && selectedSong?.id === selectedSong?.id ? "Pause" : ((selectedSong?.audioUrl || currentAudio) ? "Play Song" : "Read Aloud")}
                </Button>
                <Button variant="outline" onClick={() => handleExport(selectedSong)}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingSongId} onOpenChange={(open) => !open && setDeletingSongId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Song</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this song? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingSongId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingSongId && deleteMutation.mutate(deletingSongId)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
