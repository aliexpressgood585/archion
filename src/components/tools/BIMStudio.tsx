import { useRef, useEffect, useState, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as WebIFC from 'web-ifc'
import {
  Upload, MousePointer, Ruler, Scissors, Eye, EyeOff,
  Download, RotateCcw, ChevronRight, Camera,
  Building, List, Table, X, Layers, Settings2,
} from 'lucide-react'

// ── IFC category definitions ─────────────────────────────────────────────────
const CAT_DEFS = [
  { label: 'קירות',       color: '#c8b89a', typeNums: [2391406946, 3512223829] }, // IFCWALL + STD
  { label: 'רצפות/גגות', color: '#9e9e9e', typeNums: [1529196076, 3027962421, 3127900445] }, // IFCSLAB + STD
  { label: 'עמודים',      color: '#4169e1', typeNums: [843113511,  905975707] },  // IFCCOLUMN + STD
  { label: 'קורות',       color: '#5c6bc0', typeNums: [753842376,  2906023776] }, // IFCBEAM + STD
  { label: 'דלתות',       color: '#a0522d', typeNums: [395920057,  3242481149] }, // IFCDOOR + STD
  { label: 'חלונות',      color: '#87ceeb', typeNums: [3304561284, 486154966] },  // IFCWINDOW + STD
  { label: 'גג',          color: '#8b7355', typeNums: [2016517767] },             // IFCROOF
  { label: 'מדרגות',      color: '#8d6e63', typeNums: [331165859,  4252922144] }, // IFCSTAIR + FLIGHT
  { label: 'מעקה',        color: '#78909c', typeNums: [2262370178] },             // IFCRAILING
  { label: 'חללים',       color: '#a5d6a7', typeNums: [3856911033] },             // IFCSPACE
  { label: 'כיסויים',     color: '#e8d5b7', typeNums: [1973544240] },             // IFCCOVERING
  { label: 'אינסטלציה',   color: '#ff7043', typeNums: [987401354,  2223149337] }, // IFCFLOWSEGMENT + TERMINAL
  { label: 'ריהוט',       color: '#f5deb3', typeNums: [263784265] },              // IFCFURNISHINGELEMENT
] as const

type CatDef = typeof CAT_DEFS[number]

const TYPE_LABEL = new Map<number, string>(
  CAT_DEFS.flatMap(c => c.typeNums.map(t => [t, c.label] as [number, string]))
)
const TYPE_COLOR = new Map<number, string>(
  CAT_DEFS.flatMap(c => c.typeNums.map(t => [t, c.color] as [number, string]))
)
const IFC_ALL_TYPES = CAT_DEFS.flatMap(c => [...c.typeNums])

// ── Types ────────────────────────────────────────────────────────────────────
type ToolMode = 'select' | 'measure' | 'section'

interface CategoryState {
  key: string
  label: string
  color: string
  visible: boolean
  count: number
  typeNums: readonly number[]
}

interface ElementInfo {
  expressID: number
  typeLabel: string
  name: string
  props: { key: string; value: string }[]
}

// ── Component ────────────────────────────────────────────────────────────────
export function BIMStudio() {
  // DOM / Three.js refs
  const mountRef      = useRef<HTMLDivElement>(null)
  const rendererRef   = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef      = useRef<THREE.Scene | null>(null)
  const cameraRef     = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef   = useRef<OrbitControls | null>(null)
  const animRef       = useRef<number>(0)
  const raycasterRef  = useRef<THREE.Raycaster>(new THREE.Raycaster())

  // IFC refs
  const ifcApiRef      = useRef<WebIFC.IfcAPI | null>(null)
  const ifcReadyRef    = useRef(false)
  const modelIDRef     = useRef<number>(-1)
  const meshMapRef     = useRef<Map<number, THREE.Mesh[]>>(new Map()) // expressID → meshes
  const typeMeshMapRef = useRef<Map<number, THREE.Mesh[]>>(new Map()) // typeNum → meshes
  const typeCountRef   = useRef<Map<number, number>>(new Map())

  // Selection refs
  const selMeshesRef  = useRef<THREE.Mesh[]>([])
  const origMatsRef   = useRef<Map<THREE.Mesh, THREE.Material | THREE.Material[]>>(new Map())

  // Measurement refs
  const measurePtsRef = useRef<THREE.Vector3[]>([])
  const measureLineRef = useRef<THREE.Line | null>(null)

  // Clipping
  const clipPlaneRef  = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, -1, 0), 10))

  // ── State ─────────────────────────────────────────────────────────────────
  const [loading, setLoading]         = useState(false)
  const [progress, setProgress]       = useState(0)
  const [modelLoaded, setModelLoaded] = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [dragging, setDragging]       = useState(false)
  const [fileName, setFileName]       = useState<string | null>(null)
  const [ifcReady, setIfcReady]       = useState(false)

  const [tool, setTool]               = useState<ToolMode>('select')
  const [categories, setCategories]   = useState<CategoryState[]>([])
  const [selectedEl, setSelectedEl]   = useState<ElementInfo | null>(null)
  const [showRight, setShowRight]     = useState(true)
  const [rightTab, setRightTab]       = useState<'props' | 'qty'>('props')

  const [clipping, setClipping]       = useState(false)
  const [clipH, setClipH]             = useState(3.0)
  const [measureDist, setMeasureDist] = useState<number | null>(null)
  const [measurePtCnt, setMeasurePtCnt] = useState(0)

  // ── Three.js init ─────────────────────────────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(mount.clientWidth || 800, mount.clientHeight || 560)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.localClippingEnabled = true
    mount.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x1a1a2e)
    sceneRef.current = scene

    const grid = new THREE.GridHelper(200, 200, 0x333355, 0x222244)
    grid.name = '__grid__'
    scene.add(grid)
    scene.add(new THREE.AxesHelper(3))

    const ambient = new THREE.AmbientLight(0xffffff, 0.8)
    scene.add(ambient)
    const sun = new THREE.DirectionalLight(0xfff5e6, 1.2)
    sun.position.set(20, 40, 20)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    scene.add(sun)
    const fill = new THREE.DirectionalLight(0xd0e8ff, 0.5)
    fill.position.set(-10, 5, -10)
    scene.add(fill)

    const camera = new THREE.PerspectiveCamera(45, (mount.clientWidth || 800) / (mount.clientHeight || 560), 0.01, 50000)
    camera.position.set(20, 15, 20)
    cameraRef.current = camera

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.minDistance = 0.01
    controls.maxDistance = 5000
    controlsRef.current = controls

    const animate = () => {
      animRef.current = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    const onResize = () => {
      if (!mount) return
      renderer.setSize(mount.clientWidth, mount.clientHeight)
      camera.aspect = mount.clientWidth / mount.clientHeight
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', onResize)

    // Init web-ifc WASM (async, runs in background)
    const api = new WebIFC.IfcAPI()
    api.Init(
      (path: string) => `https://cdn.jsdelivr.net/npm/web-ifc@0.0.77/${path}`,
      true
    ).then(() => {
      ifcApiRef.current = api
      ifcReadyRef.current = true
      setIfcReady(true)
    }).catch(e => {
      console.error('web-ifc init error', e)
      setError('שגיאה בטעינת מנוע IFC. בדוק חיבור לאינטרנט.')
    })

    return () => {
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(animRef.current)
      controls.dispose()
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
      if (modelIDRef.current >= 0 && ifcApiRef.current) {
        try { ifcApiRef.current.CloseModel(modelIDRef.current) } catch { /* ignore */ }
      }
    }
  }, [])

  // Sync clipping plane
  useEffect(() => {
    const r = rendererRef.current
    if (!r) return
    clipPlaneRef.current = new THREE.Plane(new THREE.Vector3(0, -1, 0), clipH)
    r.clippingPlanes = clipping ? [clipPlaneRef.current] : []
  }, [clipping, clipH])

  // ── Clear model meshes ────────────────────────────────────────────────────
  function clearModel() {
    const scene = sceneRef.current
    if (!scene) return
    meshMapRef.current.forEach(ms => ms.forEach(m => {
      scene.remove(m)
      m.geometry.dispose()
      if (Array.isArray(m.material)) m.material.forEach(mt => mt.dispose())
      else m.material.dispose()
    }))
    meshMapRef.current.clear()
    typeMeshMapRef.current.clear()
    typeCountRef.current.clear()
    selMeshesRef.current = []
    origMatsRef.current.clear()
    if (measureLineRef.current) { scene.remove(measureLineRef.current); measureLineRef.current = null }
    measurePtsRef.current = []
    setSelectedEl(null)
    setCategories([])
    setMeasureDist(null)
    setMeasurePtCnt(0)
  }

  // ── Load IFC ──────────────────────────────────────────────────────────────
  const loadIFC = useCallback(async (file: File) => {
    if (!ifcReadyRef.current) {
      setError('מנוע IFC עדיין מאתחל (WASM), אנא המתן כמה שניות ונסה שוב')
      return
    }
    const api = ifcApiRef.current!
    const scene = sceneRef.current!

    setLoading(true)
    setError(null)
    setProgress(5)
    setFileName(file.name)
    setModelLoaded(false)

    // Close previous model
    if (modelIDRef.current >= 0) {
      try { api.CloseModel(modelIDRef.current) } catch { /* ignore */ }
      modelIDRef.current = -1
    }
    clearModel()

    try {
      const buffer = await file.arrayBuffer()
      setProgress(15)
      const data = new Uint8Array(buffer)

      const modelID = api.OpenModel(data, {
        COORDINATE_TO_ORIGIN: true,
        USE_FAST_BOOLS: true,
      })
      modelIDRef.current = modelID
      setProgress(25)

      // Build expressID → typeNum map from known categories
      const expressTypeMap = new Map<number, number>()
      for (const cat of CAT_DEFS) {
        for (const typeNum of cat.typeNums) {
          const ids = api.GetLineIDsWithType(modelID, typeNum)
          const cnt = ids.size()
          if (cnt > 0) {
            typeCountRef.current.set(typeNum, (typeCountRef.current.get(typeNum) ?? 0) + cnt)
            for (let i = 0; i < cnt; i++) expressTypeMap.set(ids.get(i), typeNum)
          }
        }
      }
      setProgress(40)

      // Stream all geometry
      const meshMap = new Map<number, THREE.Mesh[]>()
      const typeMeshMap = new Map<number, THREE.Mesh[]>()
      const allFlatMeshes = api.LoadAllGeometry(modelID)
      const total = allFlatMeshes.size()

      for (let i = 0; i < total; i++) {
        const flatMesh = allFlatMeshes.get(i)
        const expressID = flatMesh.expressID
        const typeNum = expressTypeMap.get(expressID) ?? 0
        const catColor = TYPE_COLOR.get(typeNum)
        const meshes: THREE.Mesh[] = []

        for (let j = 0; j < flatMesh.geometries.size(); j++) {
          const placed = flatMesh.geometries.get(j)
          const ifcGeom = api.GetGeometry(modelID, placed.geometryExpressID)
          const verts = api.GetVertexArray(ifcGeom.GetVertexData(), ifcGeom.GetVertexDataSize())
          const inds  = api.GetIndexArray(ifcGeom.GetIndexData(), ifcGeom.GetIndexDataSize())

          if (!verts.length || !inds.length) continue

          const posCount = verts.length / 6
          const positions = new Float32Array(posCount * 3)
          const normals   = new Float32Array(posCount * 3)
          for (let k = 0; k < posCount; k++) {
            positions[k * 3]     = verts[k * 6]
            positions[k * 3 + 1] = verts[k * 6 + 1]
            positions[k * 3 + 2] = verts[k * 6 + 2]
            normals[k * 3]       = verts[k * 6 + 3]
            normals[k * 3 + 1]   = verts[k * 6 + 4]
            normals[k * 3 + 2]   = verts[k * 6 + 5]
          }

          const bufGeo = new THREE.BufferGeometry()
          bufGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
          bufGeo.setAttribute('normal',   new THREE.BufferAttribute(normals, 3))
          bufGeo.setIndex(new THREE.BufferAttribute(new Uint32Array(inds), 1))
          bufGeo.applyMatrix4(new THREE.Matrix4().fromArray(placed.flatTransformation))

          const c = placed.color
          const hex = catColor ?? `#${Math.round(c.x*255).toString(16).padStart(2,'0')}${Math.round(c.y*255).toString(16).padStart(2,'0')}${Math.round(c.z*255).toString(16).padStart(2,'0')}`

          const mat = new THREE.MeshLambertMaterial({
            color: hex,
            transparent: c.w < 0.98,
            opacity: Math.max(0.15, c.w),
            side: THREE.DoubleSide,
          })

          const mesh = new THREE.Mesh(bufGeo, mat)
          mesh.userData = { expressID, typeNum }
          mesh.castShadow = true
          mesh.receiveShadow = true
          scene.add(mesh)
          meshes.push(mesh)

          if (!typeMeshMap.has(typeNum)) typeMeshMap.set(typeNum, [])
          typeMeshMap.get(typeNum)!.push(mesh)
        }

        if (meshes.length > 0) meshMap.set(expressID, meshes)
        if (i % 200 === 0) setProgress(40 + Math.round((i / total) * 50))
      }

      meshMapRef.current = meshMap
      typeMeshMapRef.current = typeMeshMap

      // Fit camera
      const bbox = new THREE.Box3()
      meshMap.forEach(ms => ms.forEach(m => bbox.expandByObject(m)))
      if (!bbox.isEmpty()) {
        const center = bbox.getCenter(new THREE.Vector3())
        const size   = bbox.getSize(new THREE.Vector3())
        const maxDim = Math.max(size.x, size.y, size.z)
        const cam  = cameraRef.current!
        const ctrl = controlsRef.current!
        cam.position.set(center.x + maxDim * 0.8, center.y + maxDim * 0.6, center.z + maxDim * 0.8)
        cam.near = maxDim / 2000
        cam.far  = maxDim * 200
        cam.updateProjectionMatrix()
        ctrl.target.copy(center)
        ctrl.update()
        // Align grid to model base
        const gridObj = scene.getObjectByName('__grid__')
        if (gridObj) {
          gridObj.position.y = bbox.min.y
          gridObj.scale.setScalar(maxDim * 3 / 200)
        }
      }

      // Build category state
      const cats: CategoryState[] = CAT_DEFS.map(def => ({
        key: def.label,
        label: def.label,
        color: def.color,
        visible: true,
        count: def.typeNums.reduce((s, t) => s + (typeCountRef.current.get(t) ?? 0), 0),
        typeNums: def.typeNums,
      })).filter(c => c.count > 0)

      setCategories(cats)
      setProgress(100)
      setModelLoaded(true)
    } catch (e) {
      console.error(e)
      setError('שגיאה בטעינת קובץ IFC. ודא שזהו קובץ IFC תקין.')
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Viewport click ────────────────────────────────────────────────────────
  const onViewportClick = useCallback((e: React.MouseEvent) => {
    const mount    = mountRef.current!
    const camera   = cameraRef.current
    const scene    = sceneRef.current
    if (!camera || !scene) return

    const rect = mount.getBoundingClientRect()
    const ndc  = new THREE.Vector2(
      ((e.clientX - rect.left) / mount.clientWidth) * 2 - 1,
      -((e.clientY - rect.top) / mount.clientHeight) * 2 + 1,
    )

    raycasterRef.current.setFromCamera(ndc, camera)
    const allMeshes: THREE.Mesh[] = []
    meshMapRef.current.forEach(ms => allMeshes.push(...ms))
    const hits = raycasterRef.current.intersectObjects(allMeshes, false)

    if (tool === 'select') {
      // Deselect previous
      selMeshesRef.current.forEach(m => {
        const orig = origMatsRef.current.get(m)
        if (orig) m.material = orig as THREE.Material
      })
      selMeshesRef.current = []
      origMatsRef.current.clear()

      if (hits.length > 0) {
        const expressID = (hits[0].object as THREE.Mesh).userData.expressID as number
        const typeNum   = (hits[0].object as THREE.Mesh).userData.typeNum as number
        const elMeshes  = meshMapRef.current.get(expressID) ?? []
        const hlMat = new THREE.MeshLambertMaterial({ color: '#ffeb3b', emissive: '#ff6d00', emissiveIntensity: 0.5 })

        elMeshes.forEach(m => {
          origMatsRef.current.set(m, m.material)
          m.material = hlMat
        })
        selMeshesRef.current = elMeshes

        // Get properties
        const api = ifcApiRef.current
        const mid = modelIDRef.current
        if (api && mid >= 0) {
          try {
            const line = api.GetLine(mid, expressID, true)
            const name = String(line?.Name?.value ?? line?.LongName?.value ?? `אלמנט #${expressID}`)
            const props: { key: string; value: string }[] = []
            const addP = (k: string, v: unknown) => {
              if (v == null) return
              if (typeof v === 'object' && v !== null && 'value' in v) {
                const val = (v as { value: unknown }).value
                if (val != null && String(val).trim()) props.push({ key: k, value: String(val) })
              } else if (typeof v !== 'object') {
                props.push({ key: k, value: String(v) })
              }
            }
            if (line) Object.entries(line as Record<string, unknown>).forEach(([k, v]) => {
              if (k !== 'type' && k !== 'expressID') addP(k, v)
            })

            setSelectedEl({
              expressID,
              typeLabel: TYPE_LABEL.get(typeNum) ?? `IFC type ${typeNum}`,
              name,
              props,
            })
            setShowRight(true)
            setRightTab('props')
          } catch { /* ignore */ }
        }
      } else {
        setSelectedEl(null)
      }

    } else if (tool === 'measure') {
      if (hits.length > 0) {
        const pt = hits[0].point.clone()
        measurePtsRef.current.push(pt)
        const pts = measurePtsRef.current
        setMeasurePtCnt(pts.length)

        if (pts.length === 2) {
          const dist = pts[0].distanceTo(pts[1])
          setMeasureDist(dist)
          // Draw line
          if (measureLineRef.current) scene.remove(measureLineRef.current)
          const geo = new THREE.BufferGeometry().setFromPoints(pts)
          const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: '#ffeb3b', linewidth: 2 }))
          scene.add(line)
          measureLineRef.current = line
          // Markers
          const sphere = new THREE.SphereGeometry(0.15, 8, 8)
          const sMat   = new THREE.MeshBasicMaterial({ color: '#ffeb3b' })
          pts.forEach(p => { const m = new THREE.Mesh(sphere, sMat); m.position.copy(p); scene.add(m) })
          measurePtsRef.current = []
          setMeasurePtCnt(0)
        }
      }
    }
  }, [tool])

  // ── Category visibility ───────────────────────────────────────────────────
  const toggleCat = useCallback((typeNums: readonly number[], visible: boolean) => {
    typeNums.forEach(t => {
      (typeMeshMapRef.current.get(t) ?? []).forEach(m => { m.visible = visible })
    })
    setCategories(prev => prev.map(c => {
      const match = (c.typeNums as readonly number[]).some(t => (typeNums as readonly number[]).includes(t))
      return match ? { ...c, visible } : c
    }))
  }, [])

  // ── Camera presets ────────────────────────────────────────────────────────
  function setView(mode: '3d' | 'top' | 'front' | 'side') {
    const cam  = cameraRef.current
    const ctrl = controlsRef.current
    if (!cam || !ctrl) return
    const t = ctrl.target.clone()
    const d = ctrl.getDistance() || 30
    if (mode === 'top')   { cam.position.set(t.x, t.y + d, t.z + 0.001); cam.up.set(0, 0, -1) }
    if (mode === 'front') { cam.position.set(t.x, t.y, t.z + d); cam.up.set(0, 1, 0) }
    if (mode === 'side')  { cam.position.set(t.x + d, t.y, t.z); cam.up.set(0, 1, 0) }
    if (mode === '3d')    { cam.position.set(t.x + d * 0.6, t.y + d * 0.5, t.z + d * 0.6); cam.up.set(0, 1, 0) }
    ctrl.update()
  }

  function resetView() {
    if (!controlsRef.current || !cameraRef.current) return
    controlsRef.current.reset()
  }

  function screenshot() {
    const r = rendererRef.current, c = cameraRef.current, s = sceneRef.current
    if (!r || !c || !s) return
    r.render(s, c)
    const a = document.createElement('a')
    a.download = `bim-${Date.now()}.png`
    a.href = r.domElement.toDataURL('image/png')
    a.click()
  }

  function clearMeasure() {
    if (measureLineRef.current && sceneRef.current) sceneRef.current.remove(measureLineRef.current)
    measureLineRef.current = null
    measurePtsRef.current = []
    setMeasureDist(null)
    setMeasurePtCnt(0)
  }

  const quantities = categories.map(c => ({ label: c.label, color: c.color, count: c.count }))
  const totalElements = quantities.reduce((s, q) => s + q.count, 0)

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col" dir="rtl" style={{ height: '83vh' }}>

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-1.5 bg-[#0d1117] px-3 py-2 rounded-t-xl shrink-0">
        {/* Open IFC */}
        <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition ${ifcReady ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-slate-700 text-slate-400 cursor-not-allowed'}`}>
          <Upload className="w-3.5 h-3.5" />
          {ifcReady ? 'פתח IFC' : 'טוען מנוע...'}
          <input disabled={!ifcReady} type="file" accept=".ifc" hidden
            onChange={e => { const f = e.target.files?.[0]; if (f) loadIFC(f); e.target.value = '' }} />
        </label>

        <div className="w-px h-5 bg-slate-700" />

        {/* Tool modes */}
        {([
          { t: 'select'  as ToolMode, label: 'בחירה',  icon: <MousePointer className="w-3.5 h-3.5" /> },
          { t: 'measure' as ToolMode, label: 'מדידה',  icon: <Ruler className="w-3.5 h-3.5" /> },
          { t: 'section' as ToolMode, label: 'חתך',    icon: <Scissors className="w-3.5 h-3.5" /> },
        ]).map(({ t, icon, label }) => (
          <button key={t} onClick={() => setTool(t)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${tool === t ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>
            {icon} {label}
          </button>
        ))}

        <div className="w-px h-5 bg-slate-700" />

        {/* View presets */}
        {(['3d','top','front','side'] as const).map(m => (
          <button key={m} onClick={() => setView(m)}
            className="px-2 py-1.5 rounded-lg text-[10px] text-slate-300 hover:bg-slate-700 transition font-mono">
            {m === '3d' ? '3D' : m === 'top' ? '⬆ עלווית' : m === 'front' ? '▣ חזית' : '◧ צד'}
          </button>
        ))}
        <button onClick={resetView} title="אפס מצלמה"
          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-700 transition">
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Clipping (section tool) */}
        {tool === 'section' && (
          <>
            <div className="w-px h-5 bg-slate-700" />
            <button onClick={() => setClipping(c => !c)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${clipping ? 'bg-orange-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
              {clipping ? 'חתך פעיל' : 'הפעל חתך'}
            </button>
            {clipping && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">גובה:</span>
                <input type="range" min={0} max={50} step={0.1} value={clipH}
                  onChange={e => setClipH(Number(e.target.value))}
                  className="w-28 accent-orange-400" />
                <span className="text-xs text-orange-300 w-12">{clipH.toFixed(1)} מ׳</span>
              </div>
            )}
          </>
        )}

        {/* Measure result */}
        {tool === 'measure' && measureDist !== null && (
          <div className="flex items-center gap-2 bg-yellow-900/40 border border-yellow-600/40 rounded-lg px-3 py-1.5">
            <Ruler className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-yellow-300 text-xs font-mono font-bold">{measureDist.toFixed(3)} מ׳</span>
            <button onClick={clearMeasure} className="text-yellow-500 hover:text-yellow-200 text-base leading-none">×</button>
          </div>
        )}

        <div className="flex-1" />
        {fileName && <span className="text-slate-500 text-xs truncate max-w-40">{fileName}</span>}
        {modelLoaded && (
          <button onClick={screenshot} title="ייצוא PNG"
            className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-700 transition">
            <Camera className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Main layout ──────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* Left: Category tree */}
        <div className="w-52 shrink-0 bg-[#0d1117] border-r border-slate-800 flex flex-col">
          <div className="px-3 py-2 border-b border-slate-800 flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs font-semibold text-slate-300">שכבות BIM</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {categories.length === 0 ? (
              <p className="text-[10px] text-slate-600 text-center py-6">טען קובץ IFC לצפייה בשכבות</p>
            ) : (
              <>
                {/* Toggle all */}
                <div className="flex items-center justify-between px-1 py-1 mb-1">
                  <span className="text-[10px] text-slate-500">הכל</span>
                  <div className="flex gap-1">
                    <button onClick={() => categories.forEach(c => toggleCat(c.typeNums, true))}
                      className="text-[10px] text-blue-400 hover:text-blue-200 transition">הצג</button>
                    <span className="text-slate-700">|</span>
                    <button onClick={() => categories.forEach(c => toggleCat(c.typeNums, false))}
                      className="text-[10px] text-slate-500 hover:text-slate-300 transition">הסתר</button>
                  </div>
                </div>
                {categories.map(cat => (
                  <div key={cat.key}
                    className="flex items-center gap-2 px-1.5 py-1 rounded-lg hover:bg-slate-800 transition cursor-pointer group"
                    onClick={() => toggleCat(cat.typeNums, !cat.visible)}>
                    <div className={`shrink-0 transition ${cat.visible ? 'text-slate-300' : 'text-slate-700'}`}>
                      {cat.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </div>
                    <span className="w-3 h-3 rounded-sm shrink-0 border border-white/10" style={{ background: cat.color }} />
                    <span className={`text-xs flex-1 truncate transition ${cat.visible ? 'text-slate-200' : 'text-slate-600'}`}>{cat.label}</span>
                    <span className="text-[10px] text-slate-600">{cat.count}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* 3D Viewport */}
        <div className="flex-1 relative bg-[#1a1a2e] overflow-hidden"
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f?.name.toLowerCase().endsWith('.ifc')) loadIFC(f) }}>

          <div ref={mountRef} className="w-full h-full"
            onClick={modelLoaded ? onViewportClick : undefined}
            style={{ cursor: tool === 'select' ? 'default' : tool === 'measure' ? 'crosshair' : 'copy' }} />

          {/* Welcome screen */}
          {!modelLoaded && !loading && (
            <div className={`absolute inset-0 flex flex-col items-center justify-center gap-5 transition ${dragging ? 'bg-blue-900/50' : ''}`}>
              <div className="text-7xl">🏗</div>
              <div className="text-center">
                <p className="text-white text-2xl font-bold">BIM Studio</p>
                <p className="text-slate-400 text-sm mt-1">תחליף מלא ל-ArchiCAD / Revit — IFC אמיתי</p>
              </div>
              <label className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold cursor-pointer transition text-sm ${ifcReady ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-slate-700 text-slate-400'}`}>
                <Upload className="w-5 h-5" />
                {ifcReady ? 'טען קובץ IFC' : 'מאתחל מנוע IFC...'}
                <input disabled={!ifcReady} type="file" accept=".ifc" hidden
                  onChange={e => { const f = e.target.files?.[0]; if (f) loadIFC(f); e.target.value = '' }} />
              </label>
              <p className="text-slate-600 text-xs">או גרור קובץ .ifc לכאן</p>

              <div className="grid grid-cols-3 gap-2 mt-2 max-w-sm w-full px-4">
                {[
                  { icon: '📐', label: 'IFC אמיתי' },
                  { icon: '🎯', label: 'בחירת אלמנטים' },
                  { icon: '📋', label: 'מאפייני BIM' },
                  { icon: '✂️', label: 'חתכים דינמיים' },
                  { icon: '📏', label: 'מדידות מרחק' },
                  { icon: '📊', label: 'תכמיש אוטומטי' },
                ].map(f => (
                  <div key={f.label} className="bg-slate-800/60 rounded-xl p-3 text-center">
                    <div className="text-2xl mb-1">{f.icon}</div>
                    <div className="text-[10px] text-slate-400">{f.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="absolute inset-0 bg-[#1a1a2e]/95 flex flex-col items-center justify-center gap-4">
              <div className="w-14 h-14 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-white font-semibold text-lg">מנתח קובץ IFC</p>
              <p className="text-slate-400 text-sm">{fileName}</p>
              <div className="w-72 h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }} />
              </div>
              <p className="text-slate-500 text-xs">{progress}%</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="absolute top-3 left-3 right-3 bg-red-950/90 border border-red-800 text-red-200 rounded-xl px-4 py-3 flex items-center justify-between z-10">
              <p className="text-sm">{error}</p>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-100 mr-2 text-lg">×</button>
            </div>
          )}

          {/* Measure hint */}
          {tool === 'measure' && measurePtCnt === 1 && modelLoaded && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-yellow-900/90 border border-yellow-600 text-yellow-200 rounded-xl px-4 py-2 text-xs pointer-events-none">
              לחץ על נקודה שנייה למדידת המרחק
            </div>
          )}
          {tool === 'measure' && measurePtCnt === 0 && modelLoaded && measureDist === null && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/80 border border-slate-600 text-slate-300 rounded-xl px-4 py-2 text-xs pointer-events-none">
              לחץ על שתי נקודות למדידת מרחק
            </div>
          )}

          {/* Axes hint */}
          {modelLoaded && (
            <div className="absolute top-3 right-3 space-y-0.5 pointer-events-none">
              {[['X', '#ef4444'], ['Y', '#22c55e'], ['Z', '#3b82f6']].map(([a, c]) => (
                <div key={a} className="flex items-center gap-1.5">
                  <span className="w-4 h-0.5 inline-block rounded" style={{ background: c }} />
                  <span className="text-[10px] text-slate-500">{a}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Properties / Quantities */}
        {showRight && (
          <div className="w-72 shrink-0 bg-white border-l border-slate-200 flex flex-col">
            {/* Tabs */}
            <div className="flex items-center border-b border-slate-100">
              <button onClick={() => setRightTab('props')}
                className={`flex-1 py-2 text-xs font-medium transition flex items-center justify-center gap-1 ${rightTab === 'props' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                <List className="w-3.5 h-3.5" /> מאפיינים
              </button>
              <button onClick={() => setRightTab('qty')}
                className={`flex-1 py-2 text-xs font-medium transition flex items-center justify-center gap-1 ${rightTab === 'qty' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                <Table className="w-3.5 h-3.5" /> תכמיש
              </button>
              <button onClick={() => setShowRight(false)} className="px-2 text-slate-300 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {/* Properties tab */}
              {rightTab === 'props' && (
                selectedEl ? (
                  <div className="space-y-3">
                    <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                      <p className="text-sm font-bold text-blue-900 break-words">{selectedEl.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{selectedEl.typeLabel}</span>
                        <span className="text-[10px] text-blue-400">ID: {selectedEl.expressID}</span>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 mb-2 uppercase tracking-wider">מאפיינים IFC</p>
                      <div className="space-y-0.5">
                        {selectedEl.props.length === 0 ? (
                          <p className="text-xs text-slate-400 text-center py-4">אין מאפיינים נוספים</p>
                        ) : selectedEl.props.slice(0, 40).map((p, i) => (
                          <div key={i} className="flex items-start gap-2 py-1 border-b border-slate-50 hover:bg-slate-50 px-1 rounded">
                            <span className="text-[10px] text-slate-400 shrink-0 w-28 truncate pt-0.5">{p.key}</span>
                            <span className="text-[10px] text-slate-700 flex-1 break-all">{p.value}</span>
                          </div>
                        ))}
                        {selectedEl.props.length > 40 && (
                          <p className="text-[10px] text-slate-400 text-center pt-1">+ {selectedEl.props.length - 40} נוספים...</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                    <MousePointer className="w-10 h-10 text-slate-200" />
                    <p className="text-sm font-medium text-slate-500">לחץ על אלמנט</p>
                    <p className="text-xs text-slate-300">לצפייה במאפיינים BIM מלאים</p>
                  </div>
                )
              )}

              {/* Quantities tab */}
              {rightTab === 'qty' && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-slate-600">תכמיש אוטומטי</p>
                    {totalElements > 0 && <span className="text-[10px] text-slate-400">{totalElements} אלמנטים</span>}
                  </div>
                  {quantities.length === 0 ? (
                    <div className="text-center py-10">
                      <Building className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                      <p className="text-xs text-slate-400">טען מודל IFC</p>
                    </div>
                  ) : (
                    <>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b-2 border-slate-100">
                            <th className="text-right pb-2 text-slate-500 font-semibold">קטגוריה</th>
                            <th className="text-center pb-2 text-slate-500 font-semibold w-14">כמות</th>
                            <th className="text-center pb-2 text-slate-500 font-semibold w-10">%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {quantities.sort((a, b) => b.count - a.count).map(q => (
                            <tr key={q.label} className="border-b border-slate-50 hover:bg-slate-50">
                              <td className="py-1.5 flex items-center gap-2">
                                <span className="w-3 h-3 rounded-sm shrink-0 border border-slate-200" style={{ background: q.color }} />
                                <span className="truncate">{q.label}</span>
                              </td>
                              <td className="text-center font-mono text-slate-700">{q.count}</td>
                              <td className="text-center text-slate-400">
                                {Math.round((q.count / totalElements) * 100)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-slate-200">
                            <td className="py-2 font-bold text-slate-700">סה"כ</td>
                            <td className="text-center font-bold font-mono text-slate-800">{totalElements}</td>
                            <td className="text-center text-slate-400">100</td>
                          </tr>
                        </tfoot>
                      </table>

                      <button onClick={() => {
                        const csv = ['קטגוריה,כמות', ...quantities.map(q => `"${q.label}",${q.count}`)].join('\n')
                        const a = document.createElement('a')
                        a.download = 'quantities.csv'
                        a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
                        a.click()
                      }} className="w-full mt-3 flex items-center justify-center gap-2 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-medium transition">
                        <Download className="w-3.5 h-3.5" /> ייצוא כמויות CSV
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Collapsed right panel toggle */}
        {!showRight && (
          <button onClick={() => setShowRight(true)}
            className="w-7 shrink-0 bg-white border-l border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition">
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
        )}
      </div>

      {/* ── Status bar ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-3 py-1.5 bg-[#0d1117] border-t border-slate-800 text-[10px] text-slate-500 shrink-0 rounded-b-xl">
        <Settings2 className="w-3 h-3 text-slate-600" />
        <span>{modelLoaded ? fileName : 'אין מודל טעון'}</span>
        {modelLoaded && <span className="text-slate-600">• {totalElements.toLocaleString('he-IL')} אלמנטים</span>}
        {selectedEl && <span className="text-blue-400">• {selectedEl.name}</span>}
        {clipping && <span className="text-orange-400">• חתך ב-{clipH.toFixed(1)}מ׳</span>}
        {!ifcReady && <span className="text-yellow-500">• מאתחל מנוע IFC...</span>}
        <span className="mr-auto text-slate-700">גלגלת: זום • שמאל: סיבוב • ימין: הזזה</span>
      </div>
    </div>
  )
}
