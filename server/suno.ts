import axios from "axios";

const SUNO_API_KEY = process.env.SUNO_API_KEY;
const SUNO_BASE_URL = "https://api.sunoapi.org";

if (!SUNO_API_KEY) {
  throw new Error("Missing SUNO_API_KEY in environment variables");
}


export async function generateMusicWithSuno(params: {
  title: string;
  lyrics: string;
  style: string;
}) {
  const response = await fetch(`${SUNO_BASE_URL}/api/v1/generate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUNO_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      customMode: true,
      instrumental: false,
      title: params.title,
      style: params.style,
      prompt: params.lyrics,
      model: "V4_5",
      callBackUrl: process.env.SUNO_CALLBACK_URL || "https://edusong-production.up.railway.app/api/suno/callback",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Suno API error: ${errorText}`);
  }

  const json = await response.json();

  return {
    sunoJobId: json.data.taskId,
  }; 
}


 
export async function getSunoMusicDetails(jobId: string) {
  const response = await axios.get(
    `${SUNO_BASE_URL}/music/details`,
    {
      params: { id: jobId },
      headers: {
        Authorization: `Bearer ${SUNO_API_KEY}`,
      },
    }
  );

  return response.data;
}
