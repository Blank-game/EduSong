import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { FileUp, FileText, File, Trash2, Eye, Sparkles, Upload, X, Loader2, Clock, HardDrive } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import type { Document } from "@shared/schema";

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (mimeType: string) => {
  if (mimeType.includes("pdf")) return FileText;
  if (mimeType.includes("word") || mimeType.includes("document")) return FileText;
  return File;
};

export default function Documents() {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);

  const { data: documents, isLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      await apiRequest("DELETE", `/api/documents/${documentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setDeletingDocumentId(null);
      toast({
        title: "Document deleted",
        description: "The document has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete document.",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];

    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF, DOCX, or TXT file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too big",
        description: "Please upload a file smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Upload failed");
      }

      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Document uploaded",
        description: `${file.name} has been uploaded successfully.`,
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload document.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  }, []);

  return (
    <div className="flex flex-col gap-8 p-6 md:p-8 lg:p-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl" data-testid="text-documents-title">
          Documents
        </h1>
        <p className="text-muted-foreground">
          Upload and manage your lesson materials for song generation
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card
            className={`relative transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-dashed"}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
              {isUploading ? (
                <>
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <div className="text-center">
                    <h3 className="font-medium">Uploading...</h3>
                    <p className="text-sm text-muted-foreground">Processing your document</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-medium">Upload Document</h3>
                    <p className="text-sm text-muted-foreground">
                      Drag and drop or click to browse
                    </p>
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt"
                    className="absolute inset-0 cursor-pointer opacity-0"
                    onChange={(e) => handleFileUpload(e.target.files)}
                    data-testid="input-file-upload"
                  />
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Badge variant="outline">PDF</Badge>
                    <Badge variant="outline">DOCX</Badge>
                    <Badge variant="outline">TXT</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Max file size: 10MB</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Uploaded Documents
              </CardTitle>
              <CardDescription>
                {documents?.length || 0} document{documents?.length !== 1 ? "s" : ""} in your library
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex flex-col gap-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 rounded-md border p-4">
                      <Skeleton className="h-10 w-10 rounded" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-48 mb-2" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : documents && documents.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {documents.map((doc) => {
                    const FileIcon = getFileIcon(doc.mimeType);
                    return (
                      <div
                        key={doc.id}
                        className="flex items-center gap-4 rounded-md border p-4 hover-elevate"
                        data-testid={`document-${doc.id}`}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
                          <FileIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{doc.originalName}</h4>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <HardDrive className="h-3 w-3" />
                              {formatFileSize(doc.size)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(doc.uploadedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedDocument(doc)}
                            data-testid={`button-preview-${doc.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Link href={`/generate?documentId=${doc.id}`}>
                            <Button
                              variant="ghost"
                              size="icon"
                              data-testid={`button-generate-from-${doc.id}`}
                            >
                              <Sparkles className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingDocumentId(doc.id)}
                            data-testid={`button-delete-${doc.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                  <FileUp className="h-12 w-12 text-muted-foreground" />
                  <div>
                    <h3 className="font-medium">No documents yet</h3>
                    <p className="text-sm text-muted-foreground">
                      Upload your first lesson document to get started
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={!!selectedDocument} onOpenChange={(open) => !open && setSelectedDocument(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          {selectedDocument && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {selectedDocument.originalName}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-4 flex-wrap">
                  <span>{formatFileSize(selectedDocument.size)}</span>
                  <span>Uploaded {new Date(selectedDocument.uploadedAt).toLocaleDateString()}</span>
                </DialogDescription>
              </DialogHeader>

              <Separator />

              <ScrollArea className="h-[400px]">
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap p-4">
                  {selectedDocument.content}
                </div>
              </ScrollArea>

              <DialogFooter>
                <Link href={`/generate?documentId=${selectedDocument.id}`}>
                  <Button>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Song from This
                  </Button>
                </Link>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingDocumentId} onOpenChange={(open) => !open && setDeletingDocumentId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingDocumentId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingDocumentId && deleteMutation.mutate(deletingDocumentId)}
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
