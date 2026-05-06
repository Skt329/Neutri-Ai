"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Flashlight, FlashlightOff, Keyboard, X, ScanBarcode } from "lucide-react"
import { cn } from "@/lib/utils"

interface BarcodeScannerProps {
  onScan: (barcode: string) => void
  onClose?: () => void
  disabled?: boolean
}

export function BarcodeScanner({ onScan, onClose, disabled }: BarcodeScannerProps) {
  const scannerRef = useRef<HTMLDivElement>(null)
  const html5QrRef = useRef<any>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [torch, setTorch] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const [manualCode, setManualCode] = useState("")
  const [lastScan, setLastScan] = useState<string | null>(null)
  const debounceRef = useRef<number>(0)

  const handleScanSuccess = useCallback(
    (decodedText: string) => {
      const now = Date.now()
      if (decodedText === lastScan && now - debounceRef.current < 2000) return
      debounceRef.current = now
      setLastScan(decodedText)
      if (navigator.vibrate) navigator.vibrate(200)
      onScan(decodedText)
    },
    [lastScan, onScan],
  )

  useEffect(() => {
    if (disabled || showManual) return

    let mounted = true
    let scanner: any = null

    async function startScanner() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode")
        if (!mounted || !scannerRef.current) return

        const scannerId = "barcode-scanner-region"
        if (scannerRef.current) scannerRef.current.id = scannerId

        scanner = new Html5Qrcode(scannerId)
        html5QrRef.current = scanner

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 15,
            qrbox: { width: 280, height: 150 },
            aspectRatio: 1.5,
            disableFlip: false,
          },
          (decodedText: string) => {
            if (mounted) handleScanSuccess(decodedText)
          },
          () => {},
        )

        if (mounted) {
          setCameraActive(true)
          setCameraError(null)
        }
      } catch (err) {
        if (!mounted) return
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes("NotAllowed") || msg.includes("Permission")) {
          setCameraError("Camera permission denied. Please allow camera access in your browser settings and reload.")
        } else if (msg.includes("NotFound") || msg.includes("no cameras")) {
          setCameraError("No camera found on this device.")
        } else {
          setCameraError(`Camera error: ${msg}`)
        }
        setCameraActive(false)
      }
    }

    startScanner()

    return () => {
      mounted = false
      if (scanner) {
        scanner.stop().then(() => scanner.clear()).catch(() => {})
      }
      html5QrRef.current = null
    }
  }, [disabled, showManual, handleScanSuccess])

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    const code = manualCode.trim()
    if (code.length >= 8 && /^\d+$/.test(code)) {
      onScan(code)
      setManualCode("")
    }
  }

  async function toggleTorch() {
    const scanner = html5QrRef.current
    if (!scanner) return
    try {
      const track = scanner.getRunningTrackCameraCapabilities?.()
      if (track?.torchFeature?.isSupported()) {
        await track.torchFeature.apply(!torch)
        setTorch(!torch)
      }
    } catch {}
  }

  if (showManual) {
    return (
      <div className="flex flex-col items-center gap-5 p-6 rounded-2xl border border-border bg-card animate-fade-in">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-mint2 text-sage">
          <Keyboard className="size-6" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-ink text-lg">Enter barcode manually</h3>
          <p className="text-sm text-stone mt-1">Type the number printed below the barcode lines</p>
        </div>
        <form onSubmit={handleManualSubmit} className="flex w-full gap-2">
          <Input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value.replace(/\D/g, ""))}
            placeholder="e.g. 8901030793455"
            maxLength={14}
            inputMode="numeric"
            pattern="[0-9]*"
            autoFocus
            className="text-center tabular-nums text-base h-12"
          />
          <Button
            type="submit"
            disabled={manualCode.trim().length < 8}
            className="bg-forest hover:bg-sage text-white shrink-0 h-12 px-5"
          >
            Look up
          </Button>
        </form>
        <Button variant="ghost" size="sm" onClick={() => setShowManual(false)} className="text-stone gap-1.5">
          <ScanBarcode className="size-4" /> Use camera instead
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Camera viewfinder */}
      <div
        className={cn(
          "relative w-full rounded-2xl overflow-hidden border-2 bg-ink/95",
          cameraActive ? "border-sage/40" : "border-border",
        )}
        style={{ aspectRatio: "4/3" }}
      >
        <div
          ref={scannerRef}
          className="absolute inset-0 [&>video]:object-cover [&>video]:w-full [&>video]:h-full"
        />

        {/* Scanning overlay */}
        {cameraActive && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Scan target area */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[75%] max-w-[300px] h-[45%] max-h-[160px]">
              <div className="absolute inset-0 border-2 border-sage/50 rounded-xl" />
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-sage to-transparent animate-scan-line" />
              {/* Corner markers */}
              <div className="absolute -top-px -left-px w-6 h-6 border-t-[3px] border-l-[3px] border-sage rounded-tl-lg" />
              <div className="absolute -top-px -right-px w-6 h-6 border-t-[3px] border-r-[3px] border-sage rounded-tr-lg" />
              <div className="absolute -bottom-px -left-px w-6 h-6 border-b-[3px] border-l-[3px] border-sage rounded-bl-lg" />
              <div className="absolute -bottom-px -right-px w-6 h-6 border-b-[3px] border-r-[3px] border-sage rounded-br-lg" />
            </div>
            {/* Hint text */}
            <div className="absolute bottom-5 left-0 right-0 text-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ink/60 backdrop-blur-sm text-xs text-white/90 font-medium">
                <ScanBarcode className="size-3.5" /> Point at a product barcode
              </span>
            </div>
          </div>
        )}

        {/* Loading state */}
        {!cameraActive && !cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="size-10 rounded-full border-2 border-sage/30 border-t-sage animate-spin" />
            <p className="text-sm text-white/60 font-medium">Starting camera…</p>
          </div>
        )}

        {/* Error state */}
        {cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-clay/20 text-clay">
              <X className="size-6" />
            </div>
            <p className="text-sm text-white/80 max-w-[260px] leading-relaxed">{cameraError}</p>
            <Button
              onClick={() => setShowManual(true)}
              className="bg-white/10 hover:bg-white/20 text-white border-0 rounded-full"
            >
              <Keyboard className="mr-1.5 size-4" /> Enter code manually
            </Button>
          </div>
        )}

        {/* Torch toggle */}
        {cameraActive && (
          <div className="absolute top-3 right-3">
            <button
              onClick={toggleTorch}
              className="flex size-10 items-center justify-center rounded-full bg-ink/50 text-white/80 backdrop-blur-sm hover:bg-ink/70 smooth-hover"
              aria-label={torch ? "Turn off flashlight" : "Turn on flashlight"}
            >
              {torch ? <FlashlightOff className="size-4.5" /> : <Flashlight className="size-4.5" />}
            </button>
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-center gap-3 w-full">
        <Button
          variant="outline"
          onClick={() => setShowManual(true)}
          className="rounded-full gap-1.5 border-border text-stone hover:text-ink"
        >
          <Keyboard className="size-4" /> Type barcode
        </Button>
        {onClose && (
          <Button variant="ghost" onClick={onClose} className="rounded-full text-stone">
            Cancel
          </Button>
        )}
      </div>
    </div>
  )
}
