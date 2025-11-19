import crypto from "crypto";

export default function safeProjectName(name: string): string {
  const clean = name.replace(/[\/\\?%*:|"<>.\s]/g, "_").replace(/\n/g, "").trim();
  const hash = crypto.createHash("md5").update(name).digest("hex").slice(0, 6);
  return `${clean.slice(0, 20)}_${hash}`;
}