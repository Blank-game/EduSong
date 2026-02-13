import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { FileUp, Sparkles, Music, FileText, ArrowRight, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Song, Document } from "@shared/schema";

export default function Dashboard() {
  const { data: songs, isLoading: songsLoading } = useQuery<Song[]>({
    queryKey: ["/api/songs"],
  });

  const { data: documents, isLoading: documentsLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const recentSongs = songs?.slice(0, 3) || [];
  const totalSongs = songs?.length || 0;
  const totalDocuments = documents?.length || 0;

  return (
    <div className="flex flex-col gap-8 p-6 md:p-8 lg:p-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl" data-testid="text-dashboard-title">
          Welcome to EduSong
        </h1>
        <p className="text-muted-foreground">
          Transform lesson content into culturally appropriate songs for Sierra Leonean students
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Link href="/generate">
              <Button className="w-full justify-start gap-2" data-testid="button-generate-song">
                <Sparkles className="h-4 w-4" />
                Generate New Song
              </Button>
            </Link>
            <Link href="/documents">
              <Button variant="outline" className="w-full justify-start gap-2" data-testid="button-upload-document">
                <FileUp className="h-4 w-4" />
                Upload Document
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium">Songs Generated</CardTitle>
            <Music className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {songsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="flex flex-col gap-1">
                <span className="text-3xl font-bold" data-testid="text-song-count">{totalSongs}</span>
                <p className="text-xs text-muted-foreground">Educational songs created</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium">Documents Uploaded</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {documentsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="flex flex-col gap-1">
                <span className="text-3xl font-bold" data-testid="text-document-count">{totalDocuments}</span>
                <p className="text-xs text-muted-foreground">Lesson materials stored</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-xl font-semibold">Recent Songs</h2>
          <Link href="/library">
            <Button variant="ghost" size="sm" className="gap-1" data-testid="link-view-all-songs">
              View All
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {songsLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
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
        ) : recentSongs.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recentSongs.map((song) => (
              <Card key={song.id} className="hover-elevate" data-testid={`card-song-${song.id}`}>
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
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
              <Music className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <h3 className="font-medium">No songs yet</h3>
                <p className="text-sm text-muted-foreground">
                  Upload a document or paste text to generate your first educational song
                </p>
              </div>
              <Link href="/generate">
                <Button data-testid="button-create-first-song">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Create Your First Song
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
