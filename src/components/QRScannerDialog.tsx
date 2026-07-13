import { useEffect, useRef, useState, type ReactNode } from "react";
import QrScanner from "qr-scanner";
// Vite: bundle the worker as an asset and give qr-scanner an explicit URL
import qrWorkerUrl from "qr-scanner/qr-scanner-worker.min.js?url";
import { Camera, X, RefreshCw, FlashlightOff, Flashlight, Image as ImageIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

(QrScanner as unknown as { WORKER_PATH: string }).WORKER_PATH = qrWorkerUrl;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onScan: (value: string) => void;
  onResult?: (value: string) => void;
  title?: string;
  acceptLabel?: string;
  resultDetails?: (value: string) => ReactNode;
}

export function QRScannerDialog({
  open,
  onOpenChange,
  onScan,
  onResult,
  title = "QR / Ştrixkod skan",
  acceptLabel = "Təsdiqlə",
  resultDetails,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const [hasFlash, setHasFlash] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [started, setStarted] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastValue, setLastValue] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setLastValue(null);
      setStarted(false);
      setStarting(false);
    }
    return () => {
      try {
        scannerRef.current?.stop();
      } catch {
        /* ignore */
      }
      try {
        scannerRef.current?.destroy();
      } catch {
        /* ignore */
      }
      scannerRef.current = null;
      setFlashOn(false);
      setHasFlash(false);
    };
  }, [open]);

  const startScan = async () => {
    if (!videoRef.current || starting) return;
    setError(null);
    setLastValue(null);
    setStarting(true);
    try {
      try {
        scannerRef.current?.destroy();
      } catch {
        /* ignore */
      }
      const scanner = new QrScanner(
        videoRef.current,
        (res) => {
          if (!res?.data) return;
          setLastValue(res.data);
          onResult?.(res.data);
          setStarted(false);
          scanner.stop();
        },
        {
          preferredCamera: "environment",
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 5,
          returnDetailedScanResult: true,
        },
      );
      scannerRef.current = scanner;
      await scanner.start();
      setStarted(true);
      try {
        setHasFlash(await scanner.hasFlash());
      } catch {
        setHasFlash(false);
      }
    } catch (e: unknown) {
      const err = e instanceof Error ? e : null;
      const msg = String(err?.name || err?.message || "");
      setStarted(false);
      if (msg.includes("NotAllowed") || msg.includes("Permission")) {
        setError(
          "Kamera icazəsi verilməyib. Brauzer parametrlərindən icazə verin və yenidən cəhd edin.",
        );
      } else if (msg.includes("NotFound") || msg.includes("DevicesNotFound")) {
        setError("Kamera tapılmadı. Şəkildən QR seçə bilərsiniz.");
      } else if (msg.includes("NotReadable") || msg.includes("TrackStart")) {
        setError(
          "Kamera başqa proqram tərəfindən istifadə olunur. Digər kamera proqramlarını bağlayın.",
        );
      } else if (location.protocol !== "https:" && location.hostname !== "localhost") {
        setError("Kamera yalnız HTTPS-də işləyir. Saytı HTTPS ilə açın.");
      } else {
        setError(err?.message || "Kameraya giriş alınmadı.");
      }
    } finally {
      setStarting(false);
    }
  };

  const accept = () => {
    if (!lastValue) return;
    onScan(lastValue);
    onOpenChange(false);
  };

  const rescan = () => {
    setLastValue(null);
    startScan();
  };

  const toggleFlash = async () => {
    if (!scannerRef.current) return;
    try {
      await scannerRef.current.toggleFlash();
      setFlashOn(scannerRef.current.isFlashOn());
    } catch {
      toast.error("Fənər mövcud deyil");
    }
  };

  const onFile = async (f: File) => {
    try {
      const res = await QrScanner.scanImage(f, { returnDetailedScanResult: true });
      setLastValue(res.data);
      onResult?.(res.data);
      scannerRef.current?.stop();
    } catch {
      toast.error("Şəkildə QR tapılmadı");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" /> {title}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Kameranı QR koda yönəldin və ya şəkildən seçin.
          </DialogDescription>
        </DialogHeader>

        <div className="relative bg-black aspect-square">
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
          {!started && !lastValue && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-primary-foreground p-6 text-center bg-foreground/80">
              <Camera className="h-12 w-12 mb-3" />
              <p className="text-sm font-semibold mb-3">
                Kamera ilə skanlamağa başlamaq üçün düyməyə basın.
              </p>
              <Button
                onClick={startScan}
                disabled={starting}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {starting ? "Kamera açılır..." : "Kameranı aç"}
              </Button>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-primary-foreground p-6 text-center bg-foreground/80">
              <X className="h-10 w-10 mb-2 text-destructive" />
              <p className="text-sm">{error}</p>
              <p className="text-xs text-primary-foreground/70 mt-2">
                Telefonun parametrlərində kamera icazəsini açın.
              </p>
              <Button
                onClick={startScan}
                disabled={starting}
                className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Yenidən cəhd et
              </Button>
            </div>
          )}
          {lastValue && (
            <div className="absolute inset-0 flex items-center justify-center bg-success/20 backdrop-blur-sm">
              <div className="bg-card rounded-xl p-4 max-w-[88%] text-center shadow-2xl space-y-3">
                <div className="text-xs text-muted-foreground mb-1">Tapıldı</div>
                <div className="font-mono text-sm break-all">{lastValue}</div>
                {resultDetails?.(lastValue)}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 space-y-2">
          {!lastValue ? (
            <div className="flex gap-2">
              {started ? (
                <Button variant="outline" className="flex-1" onClick={rescan} disabled={starting}>
                  <RefreshCw className="h-4 w-4 mr-1" /> Yenilə
                </Button>
              ) : (
                <Button className="flex-1" onClick={startScan} disabled={starting}>
                  <Camera className="h-4 w-4 mr-1" /> {starting ? "Açılır..." : "Skan et"}
                </Button>
              )}
              <Button variant="outline" className="flex-1" onClick={() => fileRef.current?.click()}>
                <ImageIcon className="h-4 w-4 mr-1" /> Şəkildən
              </Button>
              {hasFlash && (
                <Button variant="outline" onClick={toggleFlash}>
                  {flashOn ? (
                    <Flashlight className="h-4 w-4" />
                  ) : (
                    <FlashlightOff className="h-4 w-4" />
                  )}
                </Button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
              />
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={rescan}>
                <RefreshCw className="h-4 w-4 mr-1" /> Yenidən skan
              </Button>
              <Button className="flex-1" onClick={accept}>
                {acceptLabel}
              </Button>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground text-center">
            Kameranı QR kod / ştrixkoda yönəldin. Avtomatik tanınacaq.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
