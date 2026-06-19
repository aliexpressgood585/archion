import { useRef, useState, useEffect, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { MousePointer, Square, ArrowUp, Move, Palette, Download, Camera, Trash2, RotateCcw, Grid } from 'lucide-react'

type Tool = 'select' | 'rect' | 'pushpull' | 'move' | 'orbit'

interface SketchObj {
  id: string
  x: number
  y: number
  z: number
  w: number
  h: number
  d: number
  color: string
}

const COLORS = ['#d4c5a9', '#6b7a8d', '#8b4513', '#4a7c59', '#c0392b', '#2980b9', '#f39c12', '#7f8c8d']
const GRID_SIZE = 20
const GROUND_Y = 0

function mkId() { return Math.random().toString(36).slice(2, 10) }

function makeBoxMesh(obj: SketchObj): THREE.Mesh {
  const geo = new THREE.BoxGeometry(obj.w, obj.h, obj.d)
  const mat = new THREE.MeshStandardMaterial({ color: obj.color, roughness: 0.7, metalness: 0.1 })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(obj.x, obj.y + obj.h / 2, obj.z)
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.userData.id = obj.id
  return mesh
}

function updateMeshFromObj(mesh: THREE.Mesh, obj: SketchObj) {
  mesh.geometry.dispose()
  mesh.geometry = new THREE.BoxGeometry(obj.w, obj.h, obj.d)
  ;(mesh.material as THREE.MeshStandardMaterial).color.set(obj.color)
  mesh.position.set(obj.x, obj.y + obj.h / 2, obj.z)
}

function castToGround(raycaster: THREE.Raycaster, groundPlane: THREE.Plane): THREE.Vector3 | null {
  const target = new THREE.Vector3()
  const hit = raycaster.ray.intersectPlane(groundPlane, target)
  return hit ? target : null
}

export function SketchUp3D() {
  const mountRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const animRef = useRef<number>(0)
  const meshMapRef = useRef<Map<string, THREE.Mesh>>(new Map())
  const groundRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0))
  const previewMeshRef = useRef<THREE.Mesh | null>(null)
  const selectionBoxRef = useRef<THREE.LineSegments | null>(null)
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster())

  const [tool, setTool] = useState<Tool>('orbit')
  const [objects, setObjects] = useState<SketchObj[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeColor, setActiveColor] = useState(COLORS[0])
  const [showGrid, setShowGrid] = useState(true)
  const [dimLabel, setDimLabel] = useState('')

  // drawing state refs (avoid re-renders during drag)
  const drawStartRef = useRef<THREE.Vector3 | null>(null)
  const dragRef = useRef<{ id: string; startPos: THREE.Vector3; mouseStart: THREE.Vector2 } | null>(null)
  const ppRef = useRef<{ id: string; origH: number; origY: number; mouseStartY: number } | null>(null)

  // Three.js setup
  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const w = mount.clientWidth || 800
    const h = mount.clientHeight || 500

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    mount.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf0f4f8)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000)
    camera.position.set(10, 12, 16)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.target.set(0, 0, 0)
    controlsRef.current = controls

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambient)
    const sun = new THREE.DirectionalLight(0xffffff, 1.2)
    sun.position.set(8, 16, 8)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.camera.far = 100
    sun.shadow.camera.near = 0.1
    const sc = sun.shadow.camera as THREE.OrthographicCamera
    sc.left = sc.bottom = -20; sc.right = sc.top = 20
    scene.add(sun)

    // Ground
    const groundGeo = new THREE.PlaneGeometry(GRID_SIZE * 2, GRID_SIZE * 2)
    const groundMat = new THREE.MeshStandardMaterial({ color: 0xe8ecef, roughness: 1, metalness: 0 })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    ground.userData.isGround = true
    scene.add(ground)

    // Grid
    const grid = new THREE.GridHelper(GRID_SIZE * 2, GRID_SIZE * 2, 0x94a3b8, 0xcbd5e1)
    grid.position.y = 0.001
    grid.name = 'grid'
    scene.add(grid)

    // Axes
    const axesHelper = new THREE.AxesHelper(3)
    axesHelper.position.y = 0.002
    scene.add(axesHelper)

    // Preview mesh (used while drawing rectangle)
    const previewMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, opacity: 0.4, transparent: true, wireframe: false })
    const previewMesh = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.01), previewMat)
    previewMesh.visible = false
    scene.add(previewMesh)
    previewMeshRef.current = previewMesh

    // Selection box
    const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1))
    const selLine = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xf59e0b, linewidth: 2 }))
    selLine.visible = false
    scene.add(selLine)
    selectionBoxRef.current = selLine

    let raf: number
    function loop() {
      raf = requestAnimationFrame(loop)
      controls.update()
      renderer.render(scene, camera)
    }
    loop()
    animRef.current = raf!

    const onResize = () => {
      const nw = mount.clientWidth, nh = mount.clientHeight
      renderer.setSize(nw, nh)
      camera.aspect = nw / nh
      camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(onResize)
    ro.observe(mount)

    return () => {
      cancelAnimationFrame(animRef.current)
      ro.disconnect()
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  }, [])

  // Sync showGrid
  useEffect(() => {
    const grid = sceneRef.current?.getObjectByName('grid')
    if (grid) grid.visible = showGrid
  }, [showGrid])

  // Sync objects → Three.js meshes
  useEffect(() => {
    const scene = sceneRef.current
    const map = meshMapRef.current
    if (!scene) return

    const currentIds = new Set(objects.map(o => o.id))
    // Remove deleted
    map.forEach((mesh, id) => {
      if (!currentIds.has(id)) { scene.remove(mesh); mesh.geometry.dispose(); map.delete(id) }
    })
    // Add/update
    objects.forEach(obj => {
      if (map.has(obj.id)) {
        updateMeshFromObj(map.get(obj.id)!, obj)
      } else {
        const mesh = makeBoxMesh(obj)
        scene.add(mesh)
        map.set(obj.id, mesh)
      }
    })
  }, [objects])

  // Sync selection box
  useEffect(() => {
    const sel = selectionBoxRef.current
    if (!sel) return
    if (!selectedId) { sel.visible = false; return }
    const mesh = meshMapRef.current.get(selectedId)
    if (!mesh) { sel.visible = false; return }
    const box = new THREE.Box3().setFromObject(mesh)
    const size = new THREE.Vector3(); box.getSize(size)
    const center = new THREE.Vector3(); box.getCenter(center)
    sel.geometry.dispose()
    sel.geometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(size.x + 0.05, size.y + 0.05, size.z + 0.05))
    sel.position.copy(center)
    sel.visible = true
  }, [selectedId, objects])

  // Enable/disable orbit controls based on tool
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.enabled = tool === 'orbit' || tool === 'select'
    }
  }, [tool])

  function getMouseRay(e: React.MouseEvent) {
    const mount = mountRef.current
    const camera = cameraRef.current
    const raycaster = raycasterRef.current
    if (!mount || !camera) return null
    const rect = mount.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera)
    return raycaster
  }

  function getMeshes() {
    return Array.from(meshMapRef.current.values())
  }

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    const ray = getMouseRay(e)
    if (!ray) return

    if (tool === 'rect') {
      const hit = castToGround(ray, groundRef.current)
      if (hit) {
        drawStartRef.current = hit.clone()
        if (previewMeshRef.current) previewMeshRef.current.visible = true
      }
    } else if (tool === 'select' || tool === 'move' || tool === 'pushpull') {
      const intersects = ray.intersectObjects(getMeshes())
      if (intersects.length > 0) {
        const mesh = intersects[0].object as THREE.Mesh
        const id = mesh.userData.id as string
        setSelectedId(id)

        if (tool === 'move') {
          const groundHit = castToGround(ray, groundRef.current)
          if (groundHit) {
            dragRef.current = {
              id,
              startPos: mesh.position.clone(),
              mouseStart: new THREE.Vector2(e.clientX, e.clientY),
            }
            if (controlsRef.current) controlsRef.current.enabled = false
          }
        } else if (tool === 'pushpull') {
          const face = intersects[0].face
          if (face && face.normal.y > 0.5) {
            const obj = objects.find(o => o.id === id)
            if (obj) {
              ppRef.current = { id, origH: obj.h, origY: obj.y, mouseStartY: e.clientY }
              if (controlsRef.current) controlsRef.current.enabled = false
            }
          }
        }
      } else {
        setSelectedId(null)
      }
    }
  }, [tool, objects])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const ray = getMouseRay(e)
    if (!ray) return

    if (tool === 'rect' && drawStartRef.current) {
      const hit = castToGround(ray, groundRef.current)
      if (hit && previewMeshRef.current) {
        const start = drawStartRef.current
        const w = Math.abs(hit.x - start.x)
        const d = Math.abs(hit.z - start.z)
        const cx = (hit.x + start.x) / 2
        const cz = (hit.z + start.z) / 2
        const pm = previewMeshRef.current
        pm.geometry.dispose()
        pm.geometry = new THREE.BoxGeometry(Math.max(w, 0.01), 0.05, Math.max(d, 0.01))
        pm.position.set(cx, 0.025, cz)
        setDimLabel(`${w.toFixed(2)}m × ${d.toFixed(2)}m`)
      }
    } else if (tool === 'move' && dragRef.current) {
      const { id, startPos, mouseStart } = dragRef.current
      const groundHit = castToGround(ray, groundRef.current)
      if (groundHit) {
        setObjects(prev => prev.map(o => o.id !== id ? o : { ...o, x: o.x + (groundHit.x - startPos.x) * 0.01 * (e.clientX - mouseStart.x), z: o.z + (groundHit.z - startPos.z) * 0.01 * (e.clientY - mouseStart.y) }))
        // simpler: track ground delta each frame
        const groundPrev = castToGround(raycasterRef.current, groundRef.current)
        if (groundPrev) {
          setObjects(prev => prev.map(o => o.id !== id ? o : { ...o, x: groundHit.x, z: groundHit.z }))
        }
      }
    } else if (tool === 'pushpull' && ppRef.current) {
      const { id, origH, mouseStartY } = ppRef.current
      const dy = (mouseStartY - e.clientY) * 0.03
      const newH = Math.max(0.1, origH + dy)
      setObjects(prev => prev.map(o => o.id !== id ? o : { ...o, h: newH }))
      setDimLabel(`גובה: ${newH.toFixed(2)}m`)
    }
  }, [tool])

  const onMouseUp = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    const ray = getMouseRay(e)

    if (tool === 'rect' && drawStartRef.current) {
      const hit = ray ? castToGround(ray, groundRef.current) : null
      if (hit) {
        const start = drawStartRef.current
        const w = Math.abs(hit.x - start.x)
        const d = Math.abs(hit.z - start.z)
        if (w > 0.05 && d > 0.05) {
          const newObj: SketchObj = {
            id: mkId(),
            x: (hit.x + start.x) / 2,
            y: GROUND_Y,
            z: (hit.z + start.z) / 2,
            w, h: 0.1, d,
            color: activeColor,
          }
          setObjects(prev => [...prev, newObj])
          setSelectedId(newObj.id)
        }
      }
      drawStartRef.current = null
      if (previewMeshRef.current) previewMeshRef.current.visible = false
      setDimLabel('')
    }

    dragRef.current = null
    ppRef.current = null
    if (controlsRef.current && (tool === 'move' || tool === 'pushpull')) {
      controlsRef.current.enabled = false
    }
  }, [tool, activeColor])

  function deleteSelected() {
    if (!selectedId) return
    setObjects(prev => prev.filter(o => o.id !== selectedId))
    setSelectedId(null)
  }

  function resetCamera() {
    const cam = cameraRef.current
    const ctrl = controlsRef.current
    if (!cam || !ctrl) return
    cam.position.set(10, 12, 16)
    ctrl.target.set(0, 0, 0)
    ctrl.update()
  }

  function exportGlb() {
    const scene = sceneRef.current
    if (!scene) return
    const exporter = new GLTFExporter()
    const exportScene = new THREE.Scene()
    meshMapRef.current.forEach(mesh => exportScene.add(mesh.clone()))
    exporter.parse(exportScene, (buffer) => {
      const blob = new Blob([buffer as ArrayBuffer], { type: 'model/gltf-binary' })
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'model.glb'; a.click()
    }, (err) => console.error('GLB export error', err), { binary: true })
  }

  function exportPng() {
    const renderer = rendererRef.current
    const scene = sceneRef.current
    const camera = cameraRef.current
    if (!renderer || !scene || !camera) return
    renderer.render(scene, camera)
    const a = document.createElement('a'); a.href = renderer.domElement.toDataURL('image/png'); a.download = 'model.png'; a.click()
  }

  function applyColorToSelected() {
    if (!selectedId) return
    setObjects(prev => prev.map(o => o.id !== selectedId ? o : { ...o, color: activeColor }))
  }

  const selectedObj = objects.find(o => o.id === selectedId)

  const TOOLS: { id: Tool; label: string; icon: React.ReactNode; hint: string }[] = [
    { id: 'orbit', label: 'מצלמה', icon: <RotateCcw className="w-4 h-4" />, hint: 'גרור לסיבוב תצוגה' },
    { id: 'select', label: 'בחר', icon: <MousePointer className="w-4 h-4" />, hint: 'לחץ לבחור אובייקט' },
    { id: 'rect', label: 'מלבן', icon: <Square className="w-4 h-4" />, hint: 'גרור לשרטט מלבן' },
    { id: 'pushpull', label: 'שחול', icon: <ArrowUp className="w-4 h-4" />, hint: 'גרור את הפאה העליונה' },
    { id: 'move', label: 'הזז', icon: <Move className="w-4 h-4" />, hint: 'גרור אובייקט' },
  ]

  const cursorStyle: Record<Tool, string> = {
    orbit: 'grab', select: 'pointer', rect: 'crosshair', pushpull: 'ns-resize', move: 'move'
  }

  return (
    <div className="flex" dir="rtl" style={{ height: 560 }}>
      {/* Left tool panel */}
      <div className="w-14 bg-slate-800 flex flex-col items-center py-3 gap-1 shrink-0 rounded-r-xl">
        {TOOLS.map(t => (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            title={t.hint}
            className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center gap-0.5 transition text-xs ${
              tool === t.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
          >
            {t.icon}
          </button>
        ))}

        <div className="flex-1" />

        <button onClick={() => setShowGrid(v => !v)} className={`w-10 h-10 rounded-lg flex items-center justify-center transition ${showGrid ? 'text-blue-400' : 'text-slate-600'} hover:bg-slate-700`} title="רשת"><Grid className="w-4 h-4" /></button>
        <button onClick={deleteSelected} disabled={!selectedId} className="w-10 h-10 rounded-lg flex items-center justify-center text-red-400 hover:bg-slate-700 disabled:opacity-30 transition" title="מחק נבחר"><Trash2 className="w-4 h-4" /></button>
        <button onClick={resetCamera} className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-700 transition" title="אפס מצלמה"><RotateCcw className="w-4 h-4" /></button>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 shrink-0">
          <span className="text-slate-300 text-xs font-medium">SketchUp Pro — מודלר תלת-ממד</span>
          <div className="flex-1" />
          {dimLabel && <span className="text-blue-300 text-xs font-mono">{dimLabel}</span>}
          <div className="flex items-center gap-1">
            <Palette className="w-3.5 h-3.5 text-slate-400" />
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => { setActiveColor(c); if (selectedId) applyColorToSelected() }}
                className={`w-5 h-5 rounded-full border-2 transition ${activeColor === c ? 'border-white scale-110' : 'border-transparent hover:border-slate-400'}`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
          <div className="w-px h-4 bg-slate-700" />
          <button onClick={exportPng} className="flex items-center gap-1 px-2 py-1 text-slate-300 hover:bg-slate-700 rounded text-xs"><Camera className="w-3 h-3" />PNG</button>
          <button onClick={exportGlb} className="flex items-center gap-1.5 px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium"><Download className="w-3 h-3" />GLB</button>
        </div>

        {/* 3D viewport */}
        <div
          ref={mountRef}
          className="flex-1 min-h-0"
          style={{ cursor: cursorStyle[tool] }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
        />

        {/* Status bar */}
        <div className="flex items-center justify-between px-3 py-1 bg-slate-800 text-xs text-slate-400 shrink-0">
          <span>
            {TOOLS.find(t => t.id === tool)?.hint ?? ''}
          </span>
          {selectedObj && (
            <span className="text-slate-300 font-mono">
              {selectedObj.w.toFixed(2)}m × {selectedObj.d.toFixed(2)}m × {selectedObj.h.toFixed(2)}m
            </span>
          )}
          <span>{objects.length} אובייקטים</span>
        </div>
      </div>

      {/* Right properties panel */}
      {selectedObj && (
        <div className="w-44 bg-slate-800 text-slate-200 text-xs p-3 flex flex-col gap-3 shrink-0 rounded-l-xl overflow-y-auto">
          <div className="font-medium text-slate-300">מאפיינים</div>

          {[
            { label: 'רוחב (m)', key: 'w' as keyof SketchObj },
            { label: 'עומק (m)', key: 'd' as keyof SketchObj },
            { label: 'גובה (m)', key: 'h' as keyof SketchObj },
            { label: 'X', key: 'x' as keyof SketchObj },
            { label: 'Z', key: 'z' as keyof SketchObj },
          ].map(({ label, key }) => (
            <div key={key}>
              <div className="text-slate-400 mb-1">{label}</div>
              <input
                type="number"
                step="0.1"
                value={Number((selectedObj[key] as number).toFixed(3))}
                onChange={e => {
                  const v = parseFloat(e.target.value)
                  if (!isNaN(v)) setObjects(prev => prev.map(o => o.id !== selectedId ? o : { ...o, [key]: key === 'w' || key === 'd' || key === 'h' ? Math.max(0.01, v) : v }))
                }}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-slate-200 outline-none focus:border-blue-400"
              />
            </div>
          ))}

          <div>
            <div className="text-slate-400 mb-1">חומר</div>
            <div className="grid grid-cols-4 gap-1">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setObjects(prev => prev.map(o => o.id !== selectedId ? o : { ...o, color: c }))}
                  className={`w-7 h-7 rounded border-2 transition ${selectedObj.color === c ? 'border-white' : 'border-transparent hover:border-slate-400'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <input
              type="color"
              value={selectedObj.color}
              onChange={e => setObjects(prev => prev.map(o => o.id !== selectedId ? o : { ...o, color: e.target.value }))}
              className="w-full h-8 mt-1 rounded cursor-pointer border-none bg-transparent"
              title="צבע מותאם"
            />
          </div>

          <button
            onClick={deleteSelected}
            className="w-full py-1.5 bg-red-700 hover:bg-red-600 text-white rounded text-xs font-medium transition"
          >
            מחק אובייקט
          </button>
        </div>
      )}
    </div>
  )
}
