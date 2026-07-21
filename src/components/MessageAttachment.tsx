
import { useEffect, useState } from "react";
import { Download, FileText } from "lucide-react";
import { signedMessageAttachmentUrl } from "@/lib/shopMessageSafety";

export interface MessageAttachmentData {
  attachment_path: string | null;
  attachment_name: string | null;
  attachment_mime: string | null;
  attachment_size: number | null;
}

export function MessageAttachment({ message }: { message: MessageAttachmentData }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!message.attachment_path) return;
    let active = true;
    void signedMessageAttachmentUrl(message.attachment_path).then((signedUrl) => {
      if (active) setUrl(signedUrl);
    }).catch(() => setUrl(null));
    return () => { active = false; };
  }, [message.attachment_path]);

  if (!message.attachment_path) return null;
  const image = message.attachment_mime?.startsWith("image/");
  if (image && url) {
    return <a href={url} target="_blank" rel="noreferrer" className="mt-2 block overflow-hidden rounded-xl border bg-background/60">
      <img src={url} alt={message.attachment_name ?? "Mesaj şəkli"} className="max-h-64 w-full object-contain" />
    </a>;
  }
  return <a href={url ?? undefined} target="_blank" rel="noreferrer" aria-disabled={!url}
    className="mt-2 flex items-center gap-2 rounded-xl border bg-background/60 p-2 text-xs font-semibold">
    <FileText className="h-4 w-4 shrink-0" />
    <span className="min-w-0 flex-1 truncate">{message.attachment_name ?? "Fayl"}</span>
    {message.attachment_size ? <span>{(message.attachment_size / 1024).toFixed(0)} KB</span> : null}
    <Download className="h-4 w-4" />
  </a>;
}


