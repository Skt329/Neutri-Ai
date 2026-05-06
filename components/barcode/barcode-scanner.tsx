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
      // Debounce: ignore duplicate scans within 2 seconds
      if (decodedText === lastScan && now - debounceRef.current < 2000) return
      debounceRef.current = now
      setLastScan(decodedText)

      // Vibrate on successful scan
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
        // Ensure container has the ID
        if (scannerRef.current) scannerRef.current.id = scannerId

        scanner = new Html5Qrcode(scannerId)
        html5QrRef.current = scanner

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 15,
            qrbox: { width: 280, height: 140 },
            aspectRatio: 2,
            disableFlip: false,
          },
          (decodedText: string) => {
            if (mounted) handleScanSuccess(decodedText)
          },
          () => {
            // Scan failure — ignore (happens every frame when no barcode visible)
          },
        )

        if (mounted) {
          setCameraActive(true)
          setCameraError(null)
        }
      } catch (err) {
        if (!mounted) return
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes("NotAllowed") || msg.includes("Permission")) {
          setCameraError("Camera permission denied. Please allow camera access and try again.")
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
        scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => {})
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
    } catch {
      // Torch not supported on this device
    }
  }

  if (showManual) {
    return (
      <div className="flex flex-col items-center gap-4 p-6 rounded-2xl border border-border bg-card animate-fade-in">
        <div className="flex size-14 items-center justify-center rounded-full bg-mint2 text-sage">
          <Keyboard className="size-6" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-ink">Enter barcode manually</h3>
          <p className="text-sm text-stone mt-1">Type the number below the barcode lines</p>
        </div>
        <form onSubmit={handleManualSubmit} className="flex w-full max-w-xs gap-2">
          <Input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value.replace(/\D/g, ""))}
            placeholder="e.g. 8901030793455"
            maxLength={14}
            inputMode="numeric"
            pattern="[0-9]*"
            autoFocus
            className="text-center tabular-nums"
          />
          <Button
            type="submit"
            disabled={manualCode.trim().length < 8}
            className="bg-forest hover:bg-sage text-white shrink-0"
          >
            Look up
          </Button>
        </form>
        <Button variant="ghost" size="sm" onClick={() => setShowManual(false)} className="text-stone">
          <ScanBarcode className="mr-1.5 size-4" /> Use camera instead
        </Button>
      </div>
    )
  }

  return (
    <div className="relative flex flex-col items-center gap-3">
      {/* Camera viewfinder */}
      <div
        className={cn(
          "relative w-full max-w-md aspect-[4/3] rounded-2xl overflow-hidden border-2 bg-ink/95",
          cameraActive ? "border-sage/50" : "border-border",
        )}
      >
        <div ref={scannerRef} className="absolute inset-0 [&>video]:object-cover [&>video]:w-full [&>video]:h-full" />

        {/* Scanning overlay */}
        {cameraActive && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Scan line animation */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[140px]">
              <div className="absolute inset-0 border-2 border-sage/60 rounded-lg" />
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-sage to-transparent animate-scan-line" />
              {/* Corner markers */}
              <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-sage rounded-tl" />
              <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-sage rounded-tr" />
              <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-sage rounded-bl" />
              <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-sage rounded-br" />
            </div>
            <p className="absolute bottom-4 left-0 right-0 text-center text-xs text-white/70 font-medium">
              Point at a product barcode
            </p>
          </div>
        )}

        {/* Loading state */}
        {!cameraActive && !cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="size-8 rounded-full border-2 border-sage/30 border-t-sage animate-spin" />
            <p className="text-sm text-white/60">Starting camera…</p>
          </div>
        )}

        {/* Error state */}
        {cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-clay/20 text-clay">
              <X className="size-5" />
            </div>
            <p className="text-sm text-white/80">{cameraError}</p>
            <Button variant="outline" size="sm" onClick={() => setShowManual(true)} className="text-white border-white/20 hover:bg-white/10">
              Enter code manually
            </Button>
          </div>
        )}

        {/* Controls overlay */}
        {cameraActive && (
          <div className="absolute top-3 right-3 flex gap-2">
            <button
              onClick={toggleTorch}
              className="flex size-9 items-center justify-center rounded-full bg-ink/60 text-white/80 backdrop-blur-sm hover:bg-ink/80 smooth-hover"
              aria-label={torch ? "Turn off flashlight" : "Turn on flashlight"}
            >
              {torch ? <FlashlightOff className="size-4" /> : <Flashlight className="size-4" />}
            </button>
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setShowManual(true)} className="text-stone">
          <Keyboard className="mr-1.5 size-3.5" /> Type code
        </Button>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose} className="text-stone">
            Cancel
          </Button>
        )}
      </div>
    </div>
  )
}
