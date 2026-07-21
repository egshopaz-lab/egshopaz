
import { supabase } from "@/integrations/supabase/client";

export const MAX_MESSAGE_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const ALLOWED_MESSAGE_ATTACHMENT_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "application/pdf", "text/plain", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const safeName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120) || "file";

export async function uploadMessageAttachment(file: File, buyerId: string, sellerId: string, uploaderId: string) {
  if (file.size < 1 || file.size > MAX_MESSAGE_ATTACHMENT_BYTES) {
    throw new Error("Faylın ölçüsü maksimum 10 MB ola bilər");
  }
  if (!ALLOWED_MESSAGE_ATTACHMENT_TYPES.has(file.type)) {
    throw new Error("Bu fayl formatına icazə verilmir");
  }
  const path = `${buyerId}/${sellerId}/${uploaderId}/${crypto.randomUUID()}-${safeName(file.name)}`;
  const { error } = await supabase.storage.from("message-attachments").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  return { path, name: file.name.slice(0, 255), mime: file.type, size: file.size };
}

export async function signedMessageAttachmentUrl(path: string) {
  const { data, error } = await supabase.storage.from("message-attachments").createSignedUrl(path, 300);
  if (error) throw error;
  return data.signedUrl;
}


