import { useRef, useState, useEffect, useCallback } from 'react'
import { Upload, Download, RotateCcw, Undo2, ZoomIn, ZoomOut, Crop, Type, RefreshCw } from 'lucide-react'

type ToolMode = 'none' | 'crop' | 'text'

interface TextItem {
  id: string
  x: number
  y: number
  text: string
  color: string
  size: number
}

interface Adjustments {
  brightness: number
  contrast: number
  saturation: number
}

export function ImageEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null)
  const [history, setHistory] = useState<ImageData[]>([])
  const [histIdx, setHistIdx] = useState(-1)

  const [adjustments, setAdjustments] = useState<Adjustments>({ brightness: 0, contrast: 0, saturation: 0 })
  const [zoom, setZoom] = useState(1)
  const [tool, setTool] = useState<ToolMode>('none')

  // Crop state
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null)
  const [cropRect, setCropRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [cropping, setCropping] = useState(false)

  // Text overlay state
  const [texts, setTexts] = useState<TextItem[]>([])
  const [textColor, setTextColor] = useState('#ffffff')
  const [textSize, setTextSize] = useState(24)
  const [pendingText, setPendingText] = useState<{ x: number; y: number } | null>(null)
  const [pendingValue, setPendingValue] = useState('')
  const [draggingText, setDraggingText] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ dx: 0, dy: 0 })

  // PDF state
  const [isPdf, setIsPdf] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

  // Draw image with adjustments to canvas
  const applyAdjustments = useCallback((img: HTMLImageElement, adj: Adjustments) => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')!

    // CSS filter approach for adjustments
    const brightness = (adj.brightness + 100) / 100
    const contrast = (adj.contrast + 100) / 100
    const saturation = (adj.saturation + 100) / 100

    ctx.filter = `brightness(${brightness}) contrast(${contrast}) saturate(${saturation})`
    ctx.drawImage(img, 0, 0)
    ctx.filter = 'none'
  }, [])

  function pushHistory(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')!
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
    setHistory(h => {
      const next = h.slice(0, histIdx + 1)
      next.push(data)
      setHistIdx(next.length - 1)
      return next
    })
  }

  function undo() {
    if (histIdx <= 0) return
    const ni = histIdx - 1
    const data = history[ni]
    const canvas = canvasRef.current!
    canvas.width = data.width
    canvas.height = data.height
    canvas.getContext('2d')!.putImageData(data, 0, 0)
    setHistIdx(ni)
  }

  function loadImage(file: File) {
    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      const url = URL.createObjectURL(file)
      setPdfUrl(url)
      setIsPdf(true)
      setOriginalImage(null)
      return
    }
    setIsPdf(false)
    setPdfUrl(null)

    const img = new Image()
    img.onload = () => {
      setOriginalImage(img)
      setAdjustments({ brightness: 0, contrast: 0, saturation: 0 })
      setTexts([])
      setTool('none')
      setCropRect(null)

      const canvas = canvasRef.current!
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)

      setHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)])
      setHistIdx(0)
    }
    img.src = URL.createObjectURL(file)
  }

  // Re-render when adjustments change
  useEffect(() => {
    if (!originalImage) return
    applyAdjustments(originalImage, adjustments)
  }, [adjustments, originalImage, applyAdjustments])

  function rotate(dir: 1 | -1) {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const tmp = document.createElement('canvas')
    tmp.width = canvas.height
    tmp.height = canvas.width
    const tctx = tmp.getContext('2d')!
    tctx.translate(tmp.width / 2, tmp.height / 2)
    tctx.rotate(dir * Math.PI / 2)
    tctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2)

    canvas.width = tmp.width
    canvas.height = tmp.height
    ctx.drawImage(tmp, 0, 0)
    pushHistory(canvas)
  }

  function applyCrop() {
    if (!cropRect || cropRect.w < 4 || cropRect.h < 4) return
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    void (canvas.width / (canvas.offsetWidth * zoom || canvas.width)) // scale unused, sx/sy use zoom directly

    const sx = cropRect.x / zoom
    const sy = cropRect.y / zoom
    const sw = cropRect.w / zoom
    const sh = cropRect.h / zoom

    const data = ctx.getImageData(sx, sy, sw, sh)
    canvas.width = sw
    canvas.height = sh
    ctx.putImageData(data, 0, 0)
    pushHistory(canvas)
    setCropRect(null)
    setTool('none')
  }

  function downloadPng() {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!

    // Draw texts
    texts.forEach(t => {
      ctx.save()
      ctx.font = `bold ${t.size}px sans-serif`
      ctx.fillStyle = t.color
      ctx.fillText(t.text, t.x, t.y)
      ctx.restore()
    })

    const a = document.createElement('a')
    a.download = 'archion-image.png'
    a.href = canvas.toDataURL('image/png')
    a.click()
  }

  function resetImage() {
    if (!originalImage) return
    setAdjustments({ brightness: 0, contrast: 0, saturation: 0 })
    setTexts([])
    setCropRect(null)
    applyAdjustments(originalImage, { brightness: 0, contrast: 0, saturation: 0 })
    setHistIdx(0)
    setHistory([canvasRef.current!.getContext('2d')!.getImageData(0, 0, canvasRef.current!.width, canvasRef.current!.height)])
  }

  // Canvas event handlers for crop and text
  function getCanvasPos(e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } {
    const rect = canvasRef.current!.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left),
      y: (e.clientY - rect.top),
    }
  }

  function onCanvasMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    if (tool === 'crop') {
      const pos = getCanvasPos(e)
      setCropStart(pos)
      setCropping(true)
      setCropRect(null)
    } else if (tool === 'text') {
      // Check if clicking existing text
      const pos = getCanvasPos(e)
      const canvas = canvasRef.current!
      const scaleX = canvas.width / canvas.offsetWidth
      const scaleY = canvas.height / canvas.offsetHeight
      const cx = pos.x * scaleX
      const cy = pos.y * scaleY

      const hit = texts.findLast(t => {
        const ctx = document.createElement('canvas').getContext('2d')!
        ctx.font = `bold ${t.size}px sans-serif`
        const w = ctx.measureText(t.text).width
        return cx >= t.x && cx <= t.x + w && cy >= t.y - t.size && cy <= t.y
      })

      if (hit) {
        setDraggingText(hit.id)
        setDragOffset({ dx: cx - hit.x, dy: cy - hit.y })
      } else {
        setPendingText(pos)
        setPendingValue('')
      }
    }
  }

  function onCanvasMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (tool === 'crop' && cropping && cropStart) {
      const pos = getCanvasPos(e)
      setCropRect({
        x: Math.min(cropStart.x, pos.x),
        y: Math.min(cropStart.y, pos.y),
        w: Math.abs(pos.x - cropStart.x),
        h: Math.abs(pos.y - cropStart.y),
      })
    } else if (tool === 'text' && draggingText) {
      const pos = getCanvasPos(e)
      const canvas = canvasRef.current!
      const scaleX = canvas.width / canvas.offsetWidth
      const scaleY = canvas.height / canvas.offsetHeight
      const cx = pos.x * scaleX
      const cy = pos.y * scaleY
      setTexts(ts => ts.map(t => t.id === draggingText ? { ...t, x: cx - dragOffset.dx, y: cy - dragOffset.dy } : t))
    }
  }

  function onCanvasMouseUp() {
    setCropping(false)
    setDraggingText(null)
  }

  function confirmText() {
    if (pendingText && pendingValue.trim()) {
      const canvas = canvasRef.current!
      const scaleX = canvas.width / canvas.offsetWidth
      const scaleY = canvas.height / canvas.offsetHeight
      setTexts(ts => [...ts, {
        id: Math.random().toString(36).slice(2),
        x: pendingText.x * scaleX,
        y: pendingText.y * scaleY,
        text: pendingValue,
        color: textColor,
        size: textSize,
      }])
    }
    setPendingText(null)
    setPendingValue('')
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) loadImage(file)
  }

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Render text overlay on top of canvas
  useEffect(() => {
    const canvas = canvasRef.current
    const overlay = overlayCanvasRef.current
    if (!canvas || !overlay) return
    overlay.width = canvas.width
    overlay.height = canvas.height
    const ctx = overlay.getContext('2d')!
    ctx.clearRect(0, 0, overlay.width, overlay.height)
    texts.forEach(t => {
      ctx.save()
      ctx.font = `bold ${t.size}px sans-serif`
      ctx.fillStyle = t.color
      ctx.shadowColor = 'rgba(0,0,0,0.5)'
      ctx.shadowBlur = 3
      ctx.fillText(t.text, t.x, t.y)
      ctx.restore()
    })
  }, [texts])

  const hasImage = !!originalImage

  return (
    <div className="flex flex-col gap-3" dir="rtl">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 bg-slate-800 rounded-xl px-3 py-2">
        <button onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition">
          <Upload className="w-3.5 h-3.5" />
          פתח תמונה
        </button>
        <input ref={fileInputRef} type="file" hidden accept=".png,.jpg,.jpeg,.webp,.svg,.pdf" onChange={e => e.target.files?.[0] && loadImage(e.target.files[0])} />

        {hasImage && (
          <>
            <div className="w-px h-5 bg-slate-600 mx-1" />

            <button onClick={undo} disabled={histIdx <= 0} title="בטל"
              className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-700 disabled:opacity-30 transition">
              <Undo2 className="w-4 h-4" />
            </button>

            <button
              onClick={() => setTool(t => t === 'crop' ? 'none' : 'crop')}
              title="חיתוך"
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${tool === 'crop' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
            >
              <Crop className="w-3.5 h-3.5" />
              חיתוך
            </button>

            {tool === 'crop' && cropRect && (
              <button onClick={applyCrop}
                className="px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition">
                חתוך
              </button>
            )}

            <button
              onClick={() => setTool(t => t === 'text' ? 'none' : 'text')}
              title="טקסט"
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${tool === 'text' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
            >
              <Type className="w-3.5 h-3.5" />
              טקסט
            </button>

            {tool === 'text' && (
              <>
                <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)}
                  className="w-7 h-7 rounded border-0 cursor-pointer bg-transparent" title="צבע טקסט" />
                <input type="number" value={textSize} min={8} max={120}
                  onChange={e => setTextSize(Number(e.target.value))}
                  className="w-14 px-1.5 py-1 bg-slate-700 text-slate-200 text-xs rounded border border-slate-600 focus:outline-none"
                  title="גודל גופן"
                />
              </>
            )}

            <div className="w-px h-5 bg-slate-600 mx-1" />

            <button onClick={() => rotate(-1)} title="90° שמאלה"
              className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-700 transition">
              <RotateCcw className="w-4 h-4" />
            </button>
            <button onClick={() => rotate(1)} title="90° ימינה"
              className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-700 transition">
              <RefreshCw className="w-4 h-4" />
            </button>

            <div className="w-px h-5 bg-slate-600 mx-1" />

            <button onClick={() => setZoom(z => Math.min(5, z * 1.25))}
              className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-700 transition">
              <ZoomIn className="w-4 h-4" />
            </button>
            <button onClick={() => setZoom(z => Math.max(0.1, z / 1.25))}
              className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-700 transition">
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-slate-400 text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>

            <div className="flex-1" />

            <button onClick={resetImage}
              className="px-2.5 py-1.5 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-xs font-medium transition">
              איפוס
            </button>
            <button onClick={downloadPng}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition">
              <Download className="w-3.5 h-3.5" />
              הורד PNG
            </button>
          </>
        )}
      </div>

      <div className="flex gap-3">
        {/* Main canvas area */}
        <div
          className="flex-1 border border-slate-200 rounded-xl bg-slate-100 overflow-auto"
          style={{ height: 560, minHeight: 400 }}
          ref={containerRef}
          onDragOver={e => e.preventDefault()}
          onDrop={onDrop}
        >
          {isPdf && pdfUrl && (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <p className="text-slate-600 text-sm font-medium">קובץ PDF — מציג עמוד ראשון</p>
              <iframe src={`${pdfUrl}#page=1`} className="w-full flex-1 border-0" title="PDF viewer" />
            </div>
          )}

          {!hasImage && !isPdf && (
            <div
              className="w-full h-full flex flex-col items-center justify-center gap-4 cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-16 h-16 bg-slate-200 rounded-2xl flex items-center justify-center text-3xl">🖼️</div>
              <div className="text-center">
                <p className="font-semibold text-slate-700">גרור תמונה לכאן</p>
                <p className="text-sm text-slate-400 mt-1">PNG • JPG • WebP • SVG • PDF</p>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition">
                <Upload className="w-4 h-4" />
                בחר קובץ
              </button>
            </div>
          )}

          {hasImage && (
            <div className="relative inline-block" style={{ transform: `scale(${zoom})`, transformOrigin: 'top right', padding: 8 }}>
              <canvas
                ref={canvasRef}
                style={{
                  display: 'block',
                  cursor: tool === 'crop' ? 'crosshair' : tool === 'text' ? 'text' : 'default',
                  maxWidth: '100%',
                }}
                onMouseDown={onCanvasMouseDown}
                onMouseMove={onCanvasMouseMove}
                onMouseUp={onCanvasMouseUp}
              />
              {/* Text overlay canvas */}
              <canvas
                ref={overlayCanvasRef}
                style={{
                  position: 'absolute', top: 0, left: 0,
                  pointerEvents: 'none',
                  width: canvasRef.current?.offsetWidth,
                  height: canvasRef.current?.offsetHeight,
                }}
              />
              {/* Crop rectangle */}
              {tool === 'crop' && cropRect && (
                <div
                  style={{
                    position: 'absolute',
                    left: cropRect.x,
                    top: cropRect.y,
                    width: cropRect.w,
                    height: cropRect.h,
                    border: '2px dashed #3b82f6',
                    background: 'rgba(59,130,246,0.1)',
                    pointerEvents: 'none',
                  }}
                />
              )}
              {/* Text input */}
              {pendingText && (
                <div style={{ position: 'absolute', left: pendingText.x, top: pendingText.y - textSize, zIndex: 10 }}>
                  <input
                    autoFocus
                    value={pendingValue}
                    onChange={e => setPendingValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') confirmText(); if (e.key === 'Escape') { setPendingText(null); setPendingValue('') } }}
                    onBlur={confirmText}
                    className="px-2 py-1 border-2 border-blue-500 rounded text-sm outline-none bg-white/90 shadow"
                    placeholder="הכנס טקסט..."
                    style={{ minWidth: 120, fontSize: textSize * 0.6, color: textColor }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Adjustments panel */}
        {hasImage && (
          <div className="w-52 shrink-0 flex flex-col gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-4">
              <p className="text-xs font-semibold text-slate-700">כיוונונים</p>

              {([
                { key: 'brightness', label: 'בהירות' },
                { key: 'contrast',   label: 'ניגודיות' },
                { key: 'saturation', label: 'רוויה' },
              ] as { key: keyof Adjustments; label: string }[]).map(({ key, label }) => (
                <div key={key} className="flex flex-col gap-1.5">
                  <div className="flex justify-between">
                    <label className="text-xs text-slate-600">{label}</label>
                    <span className="text-xs text-slate-400 font-mono">{adjustments[key] > 0 ? '+' : ''}{adjustments[key]}</span>
                  </div>
                  <input
                    type="range"
                    min={-100}
                    max={100}
                    value={adjustments[key]}
                    onChange={e => setAdjustments(a => ({ ...a, [key]: Number(e.target.value) }))}
                    className="w-full h-1.5 accent-blue-600"
                  />
                  <div className="flex justify-between text-[9px] text-slate-300">
                    <span>-100</span>
                    <button onClick={() => setAdjustments(a => ({ ...a, [key]: 0 }))} className="text-blue-400 hover:text-blue-600">0</button>
                    <span>+100</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Text options */}
            {tool === 'text' && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-3">
                <p className="text-xs font-semibold text-slate-700">הגדרות טקסט</p>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-600">צבע</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border border-slate-200" />
                    <span className="text-xs text-slate-500 font-mono">{textColor}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-600">גודל ({textSize}px)</label>
                  <input type="range" min={8} max={120} value={textSize} onChange={e => setTextSize(Number(e.target.value))} className="w-full accent-blue-600" />
                </div>
                {texts.length > 0 && (
                  <button onClick={() => setTexts([])} className="text-xs text-red-500 hover:text-red-700 text-right transition">
                    מחק כל הטקסטים
                  </button>
                )}
              </div>
            )}

            {/* Info */}
            {originalImage && (
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                <p className="text-xs font-semibold text-slate-600 mb-1.5">מידע</p>
                <p className="text-[11px] text-slate-500">{originalImage.naturalWidth} × {originalImage.naturalHeight} px</p>
                {texts.length > 0 && <p className="text-[11px] text-slate-500">{texts.length} תוויות טקסט</p>}
                <p className="text-[11px] text-slate-400 mt-1">היסטוריה: {histIdx + 1}/{history.length}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
