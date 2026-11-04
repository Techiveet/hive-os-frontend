import { redirect } from "next/navigation";

// Audio converter reuses the shared video/audio page in audio mode.
export default function AudioConverterPage() {
  redirect("/dashboard/tools/converters/video?mode=audio");
}
