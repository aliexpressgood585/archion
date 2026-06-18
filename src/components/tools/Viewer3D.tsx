import { useRef, useEffect, useState, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import {
  Upload, RotateCcw, Grid, Download, Sun, Layers,
  ChevronDown, ChevronUp, Camera, Settings,
} from 'lucide-react'

type BgMode = 'white' | 'dark' | 'sky' | 'studio'

interface MeshMaterial {
  uuid: string
  name: string
  color: string
  metalness: number
  roughness: number
  emissive: string
  emissiveIntensity: number
  opacity: number
  wireframe: boolean
}

const BG_COLORS: Record<BgMode, number> = {
  white:  0xf8fafc,
  dark:   0x0f172a,
  sky:    0x87ceeb,
  studio: 0x1e1e2e,
}

function hexToThree(hex: string) {
  return new THREE.Color(hex)
}

function threeToHex(c: THREE.Color) {
  return '#' + c.getHexString()
}

export function Viewer3D() {
  const mountRef    = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef    = useRef<THREE.Scene | null>(null)
  const cameraRef   = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const modelRef    = useRef<THREE.Object3D | null>(null)
  const animRef     = useRef<number>(0)
  const sunRef      = useRef<THREE.DirectionalLight | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [loaded, setLoaded]     = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [bgMode, setBgMode]     = useState<BgMode>('white')
  const [wireframe, setWireframe] = useState(false)
  const [showGrid, setShowGrid]   = useState(true)
  const [exposure, setExposure]   = useState(1.2)
  const [sunX, setSunX]           = useState(45)
  const [sunY, setSunY]           = useState(60)
  const [sunIntensity, setSunIntensity] = useState(1.2)
  const [ambientIntensity, setAmbientIntensity] = useState(0.5)
  const [meshMaterials, setMeshMaterials] = useState<MeshMaterial[]>([])
  const [selectedMesh, setSelectedMesh]   = useState<string | null>(null)
  const [panelTab, setPanelTab] = useState<'materials' | 'lighting' | 'camera'>('lighting')
  const [panelOpen, setPanelOpen] = useState(true)

  // Init Three.js scene
  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const w = mount.clientWidth  || 800
    const h = mount.clientHeight || 560

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(w, h)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type    = THREE.PCFSoftShadowMap
    renderer.toneMapping       = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    mount.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(BG_COLORS.white)
    sceneRef.current = scene

    // Fog for studio feel
    scene.fog = null

    // Ambient
    const ambient = new THREE.AmbientLight(0xffffff, 0.5)
    ambient.name = '__ambient__'
    scene.add(ambient)

    // Sun / Key light
    const sun = new THREE.DirectionalLight(0xfff5e6, 1.2)
    sun.name = '__sun__'
    sun.position.set(5, 8, 5)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.camera.near = 0.1
    sun.shadow.camera.far  = 500
    sun.shadow.camera.left = -50
    sun.shadow.camera.right = 50
    sun.shadow.camera.top   = 50
    sun.shadow.camera.bottom = -50
    scene.add(sun)
    sunRef.current = sun

    // Fill light
    const fill = new THREE.DirectionalLight(0xe8f4f8, 0.4)
    fill.name = '__fill__'
    fill.position.set(-5, 3, -5)
    scene.add(fill)

    // Ground plane
    const groundGeo  = new THREE.PlaneGeometry(200, 200)
    const groundMat  = new THREE.ShadowMaterial({ opacity: 0.15 })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.name = '__ground__'
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    scene.add(ground)

    // Grid
    const grid = new THREE.GridHelper(40, 40, 0xcccccc, 0xe5e5e5)
    grid.name = '__grid__'
    scene.add(grid)

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 10000)
    camera.position.set(5, 5, 5)
    cameraRef.current = camera

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping  = true
    controls.dampingFactor  = 0.05
    controls.minDistance    = 0.1
    controls.maxDistance    = 1000
    controlsRef.current = controls

    function animate() {
      animRef.current = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    function onResize() {
      if (!mount) return
      const w2 = mount.clientWidth
      const h2 = mount.clientHeight
      renderer.setSize(w2, h2)
      camera.aspect = w2 / h2
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(animRef.current)
      controls.dispose()
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  }, [])

  // Sync exposure
  useEffect(() => {
    if (rendererRef.current) rendererRef.current.toneMappingExposure = exposure
  }, [exposure])

  // Sync background
  useEffect(() => {
    if (sceneRef.current) sceneRef.current.background = new THREE.Color(BG_COLORS[bgMode])
  }, [bgMode])

  // Sync grid visibility
  useEffect(() => {
    const g = sceneRef.current?.getObjectByName('__grid__')
    if (g) g.visible = showGrid
  }, [showGrid])

  // Sync sun position
  useEffect(() => {
    const sun = sunRef.current
    if (!sun) return
    const phi   = (90 - sunY)  * (Math.PI / 180)
    const theta = sunX          * (Math.PI / 180)
    const r     = 20
    sun.position.set(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta),
    )
    sun.shadow.camera.updateProjectionMatrix()
  }, [sunX, sunY])

  // Sync sun intensity
  useEffect(() => { if (sunRef.current) sunRef.current.intensity = sunIntensity }, [sunIntensity])

  // Sync ambient intensity
  useEffect(() => {
    const a = sceneRef.current?.getObjectByName('__ambient__') as THREE.AmbientLight
    if (a) a.intensity = ambientIntensity
  }, [ambientIntensity])

  // Apply material edits to Three.js meshes
  useEffect(() => {
    if (!modelRef.current) return
    modelRef.current.traverse(child => {
      const mesh = child as THREE.Mesh
      if (!mesh.isMesh) return
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      mats.forEach(mat => {
        const m = mat as THREE.MeshStandardMaterial
        const edit = meshMaterials.find(e => e.uuid === m.uuid)
        if (!edit) return
        m.color.set(hexToThree(edit.color))
        m.metalness = edit.metalness
        m.roughness = edit.roughness
        m.emissive.set(hexToThree(edit.emissive))
        m.emissiveIntensity = edit.emissiveIntensity
        m.opacity     = edit.opacity
        m.transparent = edit.opacity < 1
        m.wireframe   = edit.wireframe
        m.needsUpdate = true
      })
    })
  }, [meshMaterials])

  function fitCamera(obj: THREE.Object3D) {
    const box    = new THREE.Box3().setFromObject(obj)
    const center = box.getCenter(new THREE.Vector3())
    const size   = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    const camera = cameraRef.current!
    const fov    = camera.fov * (Math.PI / 180)
    const dist   = Math.abs(maxDim / (2 * Math.tan(fov / 2))) * 2.2

    camera.position.set(
      center.x + dist * 0.5,
      center.y + dist * 0.5,
      center.z + dist,
    )
    camera.near = dist / 100
    camera.far  = dist * 100
    camera.updateProjectionMatrix()
    controlsRef.current!.target.copy(center)
    controlsRef.current!.update()

    // Align ground + grid to model bottom
    const y = box.min.y
    const ground = sceneRef.current!.getObjectByName('__ground__')!
    ground.position.y = y
    const grid = sceneRef.current!.getObjectByName('__grid__') as THREE.GridHelper
    if (grid) {
      grid.position.y = y
      const gs = maxDim * 3
      grid.scale.setScalar(gs / 40)
    }
    const sun = sunRef.current!
    sun.shadow.camera.far = dist * 3
    sun.shadow.camera.left = -maxDim * 2
    sun.shadow.camera.right = maxDim * 2
    sun.shadow.camera.top   = maxDim * 2
    sun.shadow.camera.bottom = -maxDim * 2
    sun.shadow.camera.updateProjectionMatrix()
  }

  function collectMeshMaterials(obj: THREE.Object3D): MeshMaterial[] {
    const list: MeshMaterial[] = []
    const seen = new Set<string>()
    obj.traverse(child => {
      const mesh = child as THREE.Mesh
      if (!mesh.isMesh) return
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      mats.forEach((mat, idx) => {
        const m = mat as THREE.MeshStandardMaterial
        if (seen.has(m.uuid)) return
        seen.add(m.uuid)
        list.push({
          uuid:             m.uuid,
          name:             m.name || `${mesh.name || 'Mesh'} #${idx + 1}`,
          color:            threeToHex(m.color ?? new THREE.Color(0x888888)),
          metalness:        m.metalness  ?? 0,
          roughness:        m.roughness  ?? 0.5,
          emissive:         threeToHex(m.emissive ?? new THREE.Color(0)),
          emissiveIntensity: m.emissiveIntensity ?? 1,
          opacity:          m.opacity    ?? 1,
          wireframe:        m.wireframe  ?? false,
        })
      })
    })
    return list
  }

  function clearModel() {
    if (modelRef.current && sceneRef.current) {
      sceneRef.current.remove(modelRef.current)
      modelRef.current = null
    }
    setMeshMaterials([])
    setSelectedMesh(null)
  }

  const loadFile = useCallback((file: File) => {
    const scene = sceneRef.current
    if (!scene) return
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!ext || !['glb','gltf','stl','obj'].includes(ext)) {
      setError(`פורמט לא נתמך: .${ext}. נתמך: GLB, GLTF, STL, OBJ`)
      return
    }
    setLoading(true)
    setError(null)
    setFileName(file.name)
    clearModel()

    const url = URL.createObjectURL(file)

    function onLoad(obj: THREE.Object3D) {
      obj.traverse(child => {
        const mesh = child as THREE.Mesh
        if (!mesh.isMesh) return
        if (!mesh.material) {
          mesh.material = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.1, roughness: 0.6 })
        }
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        mats.forEach(m => {
          const ms = m as THREE.MeshStandardMaterial
          if (ms.metalness === undefined) ms.metalness = 0.1
          if (ms.roughness === undefined) ms.roughness = 0.6
        })
        mesh.castShadow    = true
        mesh.receiveShadow = true
      })
      scene.add(obj)
      modelRef.current = obj
      fitCamera(obj)
      setMeshMaterials(collectMeshMaterials(obj))
      setLoaded(true)
      setLoading(false)
      URL.revokeObjectURL(url)
    }

    function onError(err: unknown) {
      setError('שגיאה בטעינת הקובץ')
      setLoading(false)
      console.error(err)
      URL.revokeObjectURL(url)
    }

    if (ext === 'glb' || ext === 'gltf') {
      new GLTFLoader().load(url, g => onLoad(g.scene), undefined, onError)
    } else if (ext === 'stl') {
      new STLLoader().load(url, geo => {
        geo.computeVertexNormals()
        const mat  = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.1, roughness: 0.6 })
        const mesh = new THREE.Mesh(geo, mat)
        onLoad(mesh)
      }, undefined, onError)
    } else if (ext === 'obj') {
      new OBJLoader().load(url, onLoad, undefined, onError)
    }
  }, [])

  function resetCamera() {
    if (modelRef.current) fitCamera(modelRef.current)
    else {
      cameraRef.current!.position.set(5, 5, 5)
      controlsRef.current!.target.set(0, 0, 0)
      controlsRef.current!.update()
    }
  }

  function screenshot() {
    const r = rendererRef.current, c = cameraRef.current, s = sceneRef.current
    if (!r || !c || !s) return
    r.render(s, c)
    const a = document.createElement('a')
    a.download = `render-${fileName ?? 'model'}.png`
    a.href = r.domElement.toDataURL('image/png')
    a.click()
  }

  function updateMat(uuid: string, patch: Partial<MeshMaterial>) {
    setMeshMaterials(prev => prev.map(m => m.uuid === uuid ? { ...m, ...patch } : m))
  }

  const selMat = meshMaterials.find(m => m.uuid === selectedMesh)

  return (
    <div className="flex flex-col gap-0" dir="rtl">
      {/* Top toolbar */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-800 rounded-t-xl px-3 py-2">
        <button onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition">
          <Upload className="w-3.5 h-3.5" /> פתח קובץ 3D
        </button>
        <input ref={fileInputRef} type="file" hidden accept=".glb,.gltf,.stl,.obj"
          onChange={e => { const f = e.target.files?.[0]; if (f) loadFile(f); e.target.value = '' }} />

        <div className="w-px h-5 bg-slate-600" />

        <button onClick={() => setWireframe(w => !w)}
          className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition ${wireframe ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>
          <Grid className="w-3.5 h-3.5" /> Wireframe
        </button>

        <button onClick={() => setShowGrid(g => !g)}
          className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition ${showGrid ? 'text-slate-300' : 'text-slate-500'} hover:bg-slate-700`}>
          <Layers className="w-3.5 h-3.5" /> גריד
        </button>

        <div className="flex items-center gap-1 bg-slate-700 rounded-lg p-1">
          {(['white','dark','sky','studio'] as BgMode[]).map(mode => (
            <button key={mode} onClick={() => setBgMode(mode)} title={mode}
              className={`w-5 h-5 rounded transition border-2 ${bgMode === mode ? 'border-blue-400' : 'border-transparent'}`}
              style={{ background: mode === 'white' ? '#f8fafc' : mode === 'dark' ? '#0f172a' : mode === 'sky' ? '#87ceeb' : '#1e1e2e' }} />
          ))}
          <Sun className="w-3 h-3 text-slate-400 mr-1" />
        </div>

        <div className="flex items-center gap-1 text-slate-300 text-xs">
          <span>חשיפה</span>
          <input type="range" min={0.2} max={3} step={0.05} value={exposure}
            onChange={e => setExposure(Number(e.target.value))}
            className="w-20 accent-blue-400" />
          <span className="w-6">{exposure.toFixed(1)}</span>
        </div>

        <button onClick={resetCamera} className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-700 transition" title="אפס מצלמה">
          <RotateCcw className="w-4 h-4" />
        </button>

        <div className="flex-1" />

        {loaded && (
          <button onClick={screenshot}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition">
            <Camera className="w-3.5 h-3.5" /> רנדר PNG
          </button>
        )}
        {fileName && <span className="text-slate-400 text-xs truncate max-w-32">{fileName}</span>}
      </div>

      {/* Main area */}
      <div className="flex" style={{ height: 580 }}>
        {/* Viewport */}
        <div className="relative flex-1 overflow-hidden border-x border-b border-slate-200 rounded-bl-xl"
          style={{ borderRadius: panelOpen ? '0 0 0 12px' : '0 0 12px 12px' }}>
          <div ref={mountRef} className="w-full h-full"
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) loadFile(f) }} />

          {!loaded && !loading && (
            <div className={`absolute inset-0 flex flex-col items-center justify-center gap-4 cursor-pointer transition ${dragging ? 'bg-blue-900/60' : 'bg-slate-900/40'}`}
              onClick={() => fileInputRef.current?.click()}>
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-4xl transition ${dragging ? 'bg-blue-600' : 'bg-slate-700'}`}>
                {dragging ? '⬇️' : '📦'}
              </div>
              <p className="text-white font-semibold text-lg">גרור קובץ 3D לכאן</p>
              <p className="text-white/60 text-sm">GLB • GLTF • STL • OBJ</p>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition">
                <Upload className="w-4 h-4" /> בחר קובץ
              </button>
            </div>
          )}

          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/50">
              <div className="w-10 h-10 border-4 border-white/20 border-t-blue-400 rounded-full animate-spin" />
              <p className="text-white text-sm">טוען מודל...</p>
            </div>
          )}

          {error && (
            <div className="absolute top-4 inset-x-4 bg-red-900/90 text-red-100 rounded-xl px-4 py-3 flex items-center justify-between gap-2">
              <p className="text-sm">{error}</p>
              <button onClick={() => setError(null)} className="text-red-200 hover:text-white text-lg">×</button>
            </div>
          )}

          {loaded && (
            <div className="absolute bottom-3 left-3 text-white/50 text-[10px] space-y-0.5 pointer-events-none">
              <p>שמאל: סיבוב • ימין: הזזה • גלגלת: זום</p>
            </div>
          )}
        </div>

        {/* Right panel */}
        {panelOpen && (
          <div className="w-64 shrink-0 bg-white border border-slate-200 rounded-br-xl flex flex-col overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-slate-200">
              {(['lighting','materials','camera'] as const).map(tab => (
                <button key={tab} onClick={() => setPanelTab(tab)}
                  className={`flex-1 py-2 text-xs font-medium transition ${panelTab === tab ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                  {tab === 'lighting' ? '☀️ תאורה' : tab === 'materials' ? '🎨 חומרים' : '📷 מצלמה'}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {/* LIGHTING TAB */}
              {panelTab === 'lighting' && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-2">שמש (Key Light)</label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="w-14">אזימוט</span>
                        <input type="range" min={0} max={360} value={sunX} onChange={e => setSunX(Number(e.target.value))} className="flex-1 accent-yellow-400" />
                        <span className="w-8">{sunX}°</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="w-14">גובה</span>
                        <input type="range" min={0} max={90} value={sunY} onChange={e => setSunY(Number(e.target.value))} className="flex-1 accent-yellow-400" />
                        <span className="w-8">{sunY}°</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="w-14">עצמה</span>
                        <input type="range" min={0} max={5} step={0.1} value={sunIntensity} onChange={e => setSunIntensity(Number(e.target.value))} className="flex-1 accent-yellow-400" />
                        <span className="w-8">{sunIntensity.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-2">תאורת סביבה</label>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="w-14">עצמה</span>
                      <input type="range" min={0} max={3} step={0.05} value={ambientIntensity} onChange={e => setAmbientIntensity(Number(e.target.value))} className="flex-1 accent-blue-400" />
                      <span className="w-8">{ambientIntensity.toFixed(2)}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-2">רקע</label>
                    <div className="grid grid-cols-4 gap-1">
                      {(['white','dark','sky','studio'] as BgMode[]).map(m => (
                        <button key={m} onClick={() => setBgMode(m)}
                          className={`rounded border-2 py-1 text-[10px] transition ${bgMode === m ? 'border-blue-500' : 'border-slate-200'}`}
                          style={{ background: m === 'white' ? '#f8fafc' : m === 'dark' ? '#0f172a' : m === 'sky' ? '#87ceeb' : '#1e1e2e', color: m === 'white' ? '#64748b' : '#fff' }}>
                          {m === 'white' ? 'לבן' : m === 'dark' ? 'לילה' : m === 'sky' ? 'שמיים' : 'סטודיו'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-2">חשיפה ({exposure.toFixed(1)})</label>
                    <input type="range" min={0.2} max={3} step={0.05} value={exposure} onChange={e => setExposure(Number(e.target.value))} className="w-full accent-indigo-400" />
                  </div>
                </>
              )}

              {/* MATERIALS TAB */}
              {panelTab === 'materials' && (
                <>
                  {meshMaterials.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">טען מודל 3D לעריכת חומרים</p>
                  ) : (
                    <>
                      <div className="space-y-1">
                        {meshMaterials.map(m => (
                          <button key={m.uuid} onClick={() => setSelectedMesh(selectedMesh === m.uuid ? null : m.uuid)}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-right transition ${selectedMesh === m.uuid ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50 border border-transparent'}`}>
                            <span className="w-4 h-4 rounded border border-slate-200 shrink-0" style={{ background: m.color }} />
                            <span className="truncate flex-1 text-slate-700">{m.name}</span>
                          </button>
                        ))}
                      </div>

                      {selMat && (
                        <div className="bg-slate-50 rounded-xl p-3 space-y-3 border border-slate-200">
                          <p className="text-xs font-semibold text-slate-700 truncate">{selMat.name}</p>

                          <div>
                            <label className="text-[10px] text-slate-500 block mb-1">צבע</label>
                            <input type="color" value={selMat.color} onChange={e => updateMat(selMat.uuid, { color: e.target.value })}
                              className="w-full h-8 rounded border border-slate-200 cursor-pointer" />
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-500 block mb-1">מתכתיות ({selMat.metalness.toFixed(2)})</label>
                            <input type="range" min={0} max={1} step={0.01} value={selMat.metalness}
                              onChange={e => updateMat(selMat.uuid, { metalness: Number(e.target.value) })}
                              className="w-full accent-slate-400" />
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-500 block mb-1">גסות ({selMat.roughness.toFixed(2)})</label>
                            <input type="range" min={0} max={1} step={0.01} value={selMat.roughness}
                              onChange={e => updateMat(selMat.uuid, { roughness: Number(e.target.value) })}
                              className="w-full accent-slate-400" />
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-500 block mb-1">זוהר (Emissive)</label>
                            <div className="flex gap-2">
                              <input type="color" value={selMat.emissive}
                                onChange={e => updateMat(selMat.uuid, { emissive: e.target.value })}
                                className="w-10 h-7 rounded border border-slate-200 cursor-pointer" />
                              <input type="range" min={0} max={5} step={0.1} value={selMat.emissiveIntensity}
                                onChange={e => updateMat(selMat.uuid, { emissiveIntensity: Number(e.target.value) })}
                                className="flex-1 accent-yellow-400" />
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-500 block mb-1">שקיפות ({selMat.opacity.toFixed(2)})</label>
                            <input type="range" min={0} max={1} step={0.01} value={selMat.opacity}
                              onChange={e => updateMat(selMat.uuid, { opacity: Number(e.target.value) })}
                              className="w-full accent-cyan-400" />
                          </div>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={selMat.wireframe}
                              onChange={e => updateMat(selMat.uuid, { wireframe: e.target.checked })}
                              className="accent-blue-500" />
                            <span className="text-[10px] text-slate-600">Wireframe</span>
                          </label>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {/* CAMERA TAB */}
              {panelTab === 'camera' && (
                <div className="space-y-3">
                  <button onClick={resetCamera}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium text-slate-700 transition">
                    <RotateCcw className="w-3.5 h-3.5" /> אפס מצלמה
                  </button>
                  <button onClick={screenshot} disabled={!loaded}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 rounded-lg text-xs font-medium text-white transition">
                    <Camera className="w-3.5 h-3.5" /> ייצא PNG
                  </button>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">רנדר מהיר</label>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { label: 'חזית',    pos: [0, 5, 0] as const },
                        { label: 'צד',      pos: [5, 5, 0] as const },
                        { label: 'זווית',   pos: [5, 5, 5] as const },
                        { label: 'עלווית',  pos: [0, 10, 0.01] as const },
                        { label: 'אחורי',   pos: [0, 5, -5] as const },
                        { label: 'תחתית',   pos: [0, -5, 0.01] as const },
                      ].map(({ label, pos }) => (
                        <button key={label} disabled={!loaded}
                          onClick={() => {
                            if (!modelRef.current) return
                            const box    = new THREE.Box3().setFromObject(modelRef.current)
                            const center = box.getCenter(new THREE.Vector3())
                            const size   = box.getSize(new THREE.Vector3())
                            const d      = Math.max(size.x, size.y, size.z) * 2
                            cameraRef.current!.position.set(center.x + pos[0] * d / 5, center.y + pos[1] * d / 5, center.z + pos[2] * d / 5)
                            controlsRef.current!.target.copy(center)
                            controlsRef.current!.update()
                          }}
                          className="py-1.5 rounded text-[10px] bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-600 transition">
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Panel toggle */}
            <button onClick={() => setPanelOpen(false)}
              className="flex items-center justify-center gap-1 py-2 text-xs text-slate-400 hover:text-slate-600 border-t border-slate-100 transition">
              <Settings className="w-3 h-3" /> סגור פאנל
            </button>
          </div>
        )}

        {!panelOpen && (
          <button onClick={() => setPanelOpen(true)}
            className="w-8 bg-white border border-slate-200 rounded-br-xl flex items-center justify-center text-slate-400 hover:text-slate-600 transition shrink-0">
            <ChevronDown className="w-4 h-4 -rotate-90" />
          </button>
        )}
      </div>
    </div>
  )
}
