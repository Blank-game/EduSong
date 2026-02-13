import { response, type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateSongRequestSchema } from "@shared/schema";
import multer from "multer";
import OpenAI from "openai";
import mammoth from "mammoth";
import { createRequire } from "module";
import { getSunoMusicDetails } from "./suno";
import { generateMusicWithSuno } from "./suno";
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';




const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, 
});

async function extractTextFromFile(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === "text/plain") {
    return buffer.toString("utf-8");
  }

  if (mimeType === "application/pdf") {

    try {
    
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText.trim();
  } catch (error) {
    throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  }

  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  throw new Error("Unsupported file type");
}



async function generateSongWithAI(
  content: string,
  musicalStyle: string,
  complexity: string
): Promise<{
  title: string;
  topic: string;
  lyrics: string;
  rhythmPattern: string;
  culturalNotes: string;
}> {
  const complexityGuide = {
    simple: "very simple vocabulary suitable for children ages 5-7, short sentences, lots of repetition",
    moderate: "moderate vocabulary for children ages 8-10, slightly longer verses, some new words",
    advanced: "more complex vocabulary for children ages 11-12, richer language while still accessible",
  };

  const styleGuide = {
    traditional:
      "traditional West African folk song style with call-and-response patterns, djembe rhythms, and community singing elements common in Sierra Leone and West Africa",
    highlife:
      "Highlife music style popular in Ghana and Sierra Leone, with upbeat rhythms, brass-influenced melodies, and danceable patterns",
    afrobeat:
      "Afrobeat style with strong rhythmic patterns, repetitive grooves, and energetic call-and-response suitable for learning",
    "palm-wine":
      "Palm-wine music style with acoustic guitar-like rhythms, storytelling tradition, and relaxed melodic patterns from coastal West Africa",
  };

  const prompt = `You are an expert educational songwriter specializing in creating songs for primary school children in Sierra Leone and West Africa. Your songs help children learn and retain educational content through culturally appropriate music.

Create an educational song based on the following lesson content. The song should:
1. Use ${complexityGuide[complexity as keyof typeof complexityGuide]}
2. Be in ${styleGuide[musicalStyle as keyof typeof styleGuide]}
3. Include West African cultural elements (local references, proverbs, or idioms when appropriate)
4. Be memorable and easy to sing with clear rhythm
5. Have a clear verse-chorus structure
6. Include educational content from the lesson material
7. Use Sierra Leonean English expressions and Krio words naturally where appropriate (e.g., "wetin" for "what", "sef" for emphasis, "pikin" for "child"). Write in a way that sounds natural when sung with a Sierra Leonean accent

Lesson Content:
${content}

Respond with JSON in this exact format:
{
  "title": "A catchy, memorable title for the song",
  "topic": "The main educational topic (e.g., 'Water Cycle', 'Addition', 'Hygiene')",
  "lyrics": "Full song lyrics with [Verse 1], [Chorus], [Verse 2], etc. markers",
  "rhythmPattern": "Description of how to clap or tap along (e.g., 'Clap on beats 1 and 3, stomp on beat 4')",
  "culturalNotes": "Brief explanation of the West African musical elements and cultural references used in the song"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5", 
      messages: [
        { role: "system", content: "You are an expert educational songwriter from Sierra Leone, West Africa. You create songs in Sierra Leonean English and Krio (when appropriate), with authentic local expressions and cultural references that Sierra Leonean primary school children will understand and connect with." },
        { role: "user", content: prompt },
      ],
      max_completion_tokens: 4096,
    });

    const text = response.choices[0]?.message?.content || "";
    const cleanJson = text.replace(/```json|```/g, "").trim();
    console.log("RAW AI OUTPUT:", text);

    if (!text.trim()) {
      console.warn("AI returned empty output, using fallback text");
      return {
        title: "Untitled Song",
        topic: "General",
        lyrics: "",
        rhythmPattern: "",
        culturalNotes: "",
      };
    }

    let parsed;
    try {
      parsed = JSON.parse(cleanJson);
    } catch (jsonErr) {
      console.warn("AI output is not valid JSON, returning raw text in lyrics");
      parsed = {
        title: "Untitled Song",
        topic: "General",
        lyrics: text,
        rhythmPattern: "",
        culturalNotes: "",
      };
    }

    return {
      title: parsed.title || "Untitled Song",
      topic: parsed.topic || "General",
      lyrics: parsed.lyrics || "",
      rhythmPattern: parsed.rhythmPattern || "",
      culturalNotes: parsed.culturalNotes || "",
    };
  } catch (err) {
    console.error("Generation error:", err);
    throw new Error(err instanceof Error ? err.message : "Failed to generate song");
  }
}





export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get("/api/documents", async (req, res) => {
    try {
      const documents = await storage.getDocuments();
      res.json(documents);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.get("/api/documents/:id", async (req, res) => {
    try {
      const document = await storage.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      res.json(document);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch document" });
    }
  });

  app.post("/api/documents/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { buffer, originalname, mimetype, size } = req.file;

      
      const content = await extractTextFromFile(buffer, mimetype);

      
      const document = await storage.createDocument({
        filename: originalname,
        originalName: originalname,
        mimeType: mimetype,
        size,
        content,
      });

      res.status(201).json(document);
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to upload document",
      });
    }
  });

  app.delete("/api/documents/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteDocument(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Document not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  
  app.get("/api/songs", async (req, res) => {
    try {
      const songs = await storage.getSongs();
      res.json(songs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch songs" });
    }
  });

  app.get("/api/songs/:id", async (req, res) => {
    try {
      const song = await storage.getSong(req.params.id);
      if (!song) {
        return res.status(404).json({ message: "Song not found" });
      }
      res.json(song);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch song" });
    }
  });

  app.post("/api/suno/callback", async (req, res) => {
  try {
  const { data } = req.body;
  
  const taskId = data.task_id;
  
  const songs = await storage.getSongs();
  const song = songs.find(s => s.sunoJobId === taskId);
  if (!song) {
  console.warn(`Received callback for unknown task_id: ${taskId}`);
  return res.status(404).json({ message: "Song not found" });
  }
  
  if (data.callbackType === "complete" && data.data && data.data[0]?.audio_url) {
  const audioUrl = data.data[0].audio_url;
  
  await storage.updateSong(song.id, { audioUrl });
  console.log(`Song ${song.id} audio URL updated: ${audioUrl}`);
  }
  
      res.status(200).json({ received: true });
  } catch (error) {
  console.error("Suno callback error:", error);
      res.status(500).json({ message: "Failed to process callback" });
  }
  });

  app.get("/api/songs/:id/audio", async (req, res) => {
  try {
    const song = await storage.getSong(req.params.id);

     if (song?.audioUrl) {
      return res.json({
        status: "success",
        audioUrl: song.audioUrl
      });
    }

    if (!song?.sunoJobId) {
      return res.json({ status: "running" }); 
    }

    const sunoData = await getSunoMusicDetails(song.sunoJobId);

    console.log("POLLING RESPONSE:", JSON.stringify(sunoData));
    
    
    const taskData = sunoData.data || sunoData;
    
    
    const songArray = taskData.data;
    
    console.log("NORMALIZED TASK DATA:", JSON.stringify(taskData));

    
    let audio_url = null;
    if (Array.isArray(songArray) && songArray[0]?.audio_url) {
      audio_url = songArray[0].audio_url;
    } else if (songArray?.audio_url) {
      audio_url = songArray.audio_url;
    } else if (taskData.audio_url) {
      audio_url = taskData.audio_url;
    }

    
    const isFinished = taskData.callbackType === "complete";

    if (isFinished && audio_url) {
      await storage.updateSong(req.params.id, { audioUrl: audio_url });
      
      return res.json({
        status: "success",
        audioUrl: audio_url
      });
    }

    console.log(`Song ${req.params.id} still generating...`);
    return res.json({ status: "running" });

  } catch (error) {
    console.error("Suno audio fetch error:", error);
    console.log(`Suno API error (likely 404 - job too new), will retry...`);
    return res.json({ status: "running" });
  }
});


  app.post("/api/songs/generate", async (req, res) => {
    try {
      const validation = generateSongRequestSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          message: "Invalid request",
          errors: validation.error.errors,
        });
      }

      const { content, documentId, musicalStyle, complexity } = validation.data;

      
      const generated = await generateSongWithAI(content, musicalStyle, complexity);

      
      const sunoResult = await generateMusicWithSuno({
        title: generated.title,
        lyrics: generated.lyrics,
        style: musicalStyle,
      });

      console.log(generated);

      console.log("SUNO RESULT:", sunoResult);
      

      
      const song = await storage.createSong({
        title: generated.title,
        topic: generated.topic,
        lyrics: generated.lyrics,
        rhythmPattern: generated.rhythmPattern,
        culturalNotes: generated.culturalNotes,
        musicalStyle,
        sourceDocumentId: documentId || null,
        sourceText: content.substring(0, 500),
        sunoJobId: sunoResult.sunoJobId,
      });

      res.status(201).json(song);
    } catch (error) {
      console.error("Generation error:", error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to generate song",
      });
    }
  });

  app.post("/api/songs", async (req, res) => {
    try {
      const song = await storage.createSong({
        title: req.body.title,
        topic: req.body.topic,
        lyrics: req.body.lyrics,
        rhythmPattern: req.body.rhythmPattern || null,
        culturalNotes: req.body.culturalNotes || null,
        musicalStyle: req.body.musicalStyle || null,
        sourceDocumentId: req.body.sourceDocumentId || null,
        sourceText: req.body.sourceText || null,
      });
      res.status(201).json(song);
    } catch (error) {
      res.status(500).json({ message: "Failed to save song" });
    }
  });

  app.delete("/api/songs/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteSong(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Song not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete song" });
    }
  });

  return httpServer;
}
