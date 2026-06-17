import { useRef, useEffect, useState, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { Upload, RotateCcw, Grid, Download, Sun } from 'lucide-react'

type BgMode = 'white' | 'dark' | 'sky'

const BG_COLORS: Record<BgMode, number> = {
  white: 0xf8fafc,
  dark:  0x0f172a,
  sky:   0x87ceeb,
}

export function Viewer3D() {
  const mountRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const modelRef = useRef<THREE.Object3D | null>(null)
  const animFrameRef = useRef<number>(0)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [wireframe, setWireframe] = useState(false)
  const [bgMode, setBgMode] = useState<BgMode>('white')
  const [fileName, setFileName] = useState<string | null>(null)

  // Init Three.js
  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const w = mount.clientWidth || 800
    const h = mount.clientHeight || 560

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(w, h)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    mount.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(BG_COLORS.white)
    sceneRef.current = scene

    // Ambient
    const ambient = new THREE.AmbientLight(0xffffff, 0.5)
    scene.add(ambient)

    // Warm directional
    const dirWarm = new THREE.DirectionalLight(0xfff5e6, 1.2)
    dirWarm.position.set(5, 8, 5)
    dirWarm.castShadow = true
    dirWarm.shadow.mapSize.set(2048, 2048)
    scene.add(dirWarm)

    // Cool directional
    const dirCool = new THREE.DirectionalLight(0xe8f4f8, 0.6)
    dirCool.position.set(-5, 3, -5)
    scene.add(dirCool)

    // Grid helper
    const grid = new THREE.GridHelper(20, 20, 0xcccccc, 0xe5e5e5)
    grid.name = '__grid__'
    scene.add(grid)

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 10000)
    camera.position.set(5, 5, 5)
    cameraRef.current = camera

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.minDistance = 0.1
    controls.maxDistance = 1000
    controlsRef.current = controls

    function animate() {
      animFrameRef.current = requestAnimationFrame(animate)
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
      cancelAnimationFrame(animFrameRef.current)
      controls.dispose()
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  }, [])

  // Update background when bgMode changes
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(BG_COLORS[bgMode])
    }
  }, [bgMode])

  // Toggle wireframe
  useEffect(() => {
    if (!modelRef.current) return
    modelRef.current.traverse(child => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        mats.forEach(m => { (m as THREE.MeshStandardMaterial).wireframe = wireframe })
      }
    })
  }, [wireframe])

  function fitCamera(object: THREE.Object3D) {
    const box = new THREE.Box3().setFromObject(object)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    const camera = cameraRef.current!
    const fov = camera.fov * (Math.PI / 180)
    const dist = Math.abs(maxDim / (2 * Math.tan(fov / 2))) * 2

    camera.position.copy(center)
    camera.position.z += dist
    camera.position.y += dist * 0.5
    camera.position.x += dist * 0.3
    camera.near = dist / 100
    camera.far = dist * 100
    camera.updateProjectionMatrix()

    controlsRef.current!.target.copy(center)
    controlsRef.current!.update()

    // Move grid to bottom of model
    const grid = sceneRef.current!.getObjectByName('__grid__') as THREE.GridHelper
    if (grid) {
      grid.position.y = box.min.y
      const gridSize = maxDim * 3
      grid.scale.setScalar(gridSize / 20)
    }
  }

  function clearModel() {
    if (modelRef.current && sceneRef.current) {
      sceneRef.current.remove(modelRef.current)
      modelRef.current = null
    }
  }

  const loadFile = useCallback((file: File) => {
    const scene = sceneRef.current
    if (!scene) return

    const ext = file.name.split('.').pop()?.toLowerCase()
    const supported = ['glb', 'gltf', 'stl', 'obj']
    if (!ext || !supported.includes(ext)) {
      setError(`פורמט לא נתמך: .${ext ?? '?'}. נתמך: GLB, GLTF, STL, OBJ`)
      return
    }

    setLoading(true)
    setError(null)
    setFileName(file.name)
    clearModel()

    const url = URL.createObjectURL(file)

    if (ext === 'glb' || ext === 'gltf') {
      const loader = new GLTFLoader()
      loader.load(url, gltf => {
        const obj = gltf.scene
        scene.add(obj)
        modelRef.current = obj
        fitCamera(obj)
        setLoaded(true)
        setLoading(false)
        URL.revokeObjectURL(url)
      }, undefined, err => {
        setError('שגיאה בטעינת קובץ GLTF/GLB')
        setLoading(false)
        console.error(err)
        URL.revokeObjectURL(url)
      })
    } else if (ext === 'stl') {
      const loader = new STLLoader()
      loader.load(url, geometry => {
        geometry.computeVertexNormals()
        const mat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.1, roughness: 0.6 })
        const mesh = new THREE.Mesh(geometry, mat)
        mesh.castShadow = true
        mesh.receiveShadow = true
        scene.add(mesh)
        modelRef.current = mesh
        fitCamera(mesh)
        setLoaded(true)
        setLoading(false)
        URL.revokeObjectURL(url)
      }, undefined, err => {
        setError('שגיאה בטעינת קובץ STL')
        setLoading(false)
        console.error(err)
        URL.revokeObjectURL(url)
      })
    } else if (ext === 'obj') {
      const loader = new OBJLoader()
      loader.load(url, obj => {
        obj.traverse(child => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh
            if (!mesh.material || (Array.isArray(mesh.material) && mesh.material.length === 0)) {
              mesh.material = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.1, roughness: 0.6 })
            }
            mesh.castShadow = true
            mesh.receiveShadow = true
          }
        })
        scene.add(obj)
        modelRef.current = obj
        fitCamera(obj)
        setLoaded(true)
        setLoading(false)
        URL.revokeObjectURL(url)
      }, undefined, err => {
        setError('שגיאה בטעינת קובץ OBJ')
        setLoading(false)
        console.error(err)
        URL.revokeObjectURL(url)
      })
    }
  }, [])

  function resetCamera() {
    if (!modelRef.current) {
      cameraRef.current!.position.set(5, 5, 5)
      controlsRef.current!.target.set(0, 0, 0)
    } else {
      fitCamera(modelRef.current)
    }
    controlsRef.current!.update()
  }

  function exportScreenshot() {
    const renderer = rendererRef.current
    const camera = cameraRef.current
    const scene = sceneRef.current
    if (!renderer || !camera || !scene) return
    renderer.render(scene, camera)
    const data = renderer.domElement.toDataURL('image/png')
    const a = document.createElement('a')
    a.download = `3d-view-${fileName ?? 'model'}.png`
    a.href = data
    a.click()
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) loadFile(file)
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) loadFile(file)
    e.target.value = ''
  }

  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex flex-col gap-3" dir="rtl">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-800 rounded-xl px-3 py-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition"
        >
          <Upload className="w-3.5 h-3.5" />
          פתח קובץ 3D
        </button>
        <input ref={fileInputRef} type="file" hidden accept=".glb,.gltf,.stl,.obj" onChange={onFileChange} />

        <div className="w-px h-5 bg-slate-600 mx-1" />

        <button
          onClick={() => setWireframe(w => !w)}
          title="מסגרת תיל"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${wireframe ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
        >
          <Grid className="w-3.5 h-3.5" />
          Wireframe
        </button>

        <button onClick={resetCamera} title="אפס מצלמה"
          className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-700 transition">
          <RotateCcw className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1 bg-slate-700 rounded-lg p-1">
          {(['white', 'dark', 'sky'] as BgMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setBgMode(mode)}
              title={mode === 'white' ? 'לבן' : mode === 'dark' ? 'כהה' : 'שמיים'}
              className={`w-5 h-5 rounded transition border-2 ${bgMode === mode ? 'border-blue-400' : 'border-transparent'}`}
              style={{
                background: mode === 'white' ? '#f8fafc' : mode === 'dark' ? '#0f172a' : '#87ceeb'
              }}
            />
          ))}
          <Sun className="w-3 h-3 text-slate-400 mr-1" />
        </div>

        <div className="flex-1" />

        {loaded && (
          <button onClick={exportScreenshot}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-xs font-medium transition">
            <Download className="w-3.5 h-3.5" />
            צילום מסך
          </button>
        )}

        {fileName && (
          <span className="text-slate-400 text-xs truncate max-w-32">{fileName}</span>
        )}
      </div>

      {/* 3D Viewport */}
      <div className="relative rounded-xl overflow-hidden border border-slate-200" style={{ height: 560 }}>
        <div
          ref={mountRef}
          className="w-full h-full"
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        />

        {/* Drop overlay when no model */}
        {!loaded && !loading && (
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center gap-4 transition cursor-pointer ${
              dragging ? 'bg-blue-900/60' : 'bg-slate-900/40'
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-4xl ${dragging ? 'bg-blue-600' : 'bg-slate-700'} transition`}>
              {dragging ? '⬇️' : '📦'}
            </div>
            <div className="text-center">
              <p className="text-white font-semibold text-lg">גרור קובץ 3D לכאן</p>
              <p className="text-white/60 text-sm mt-1">GLB • GLTF • STL • OBJ</p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition">
              <Upload className="w-4 h-4" />
              בחר קובץ
            </button>
          </div>
        )}

        {/* Loading spinner */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/50">
            <div className="w-10 h-10 border-4 border-white/20 border-t-blue-400 rounded-full animate-spin" />
            <p className="text-white text-sm">טוען מודל...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="absolute top-4 inset-x-4 bg-red-900/90 text-red-100 rounded-xl px-4 py-3 flex items-center justify-between gap-2">
            <p className="text-sm">{error}</p>
            <button onClick={() => setError(null)} className="text-red-200 hover:text-white text-lg leading-none">×</button>
          </div>
        )}

        {/* Drop hint when loaded */}
        {loaded && dragging && (
          <div className="absolute inset-0 flex items-center justify-center bg-blue-900/50 pointer-events-none">
            <p className="text-white font-semibold text-lg">שחרר להחלפת מודל</p>
          </div>
        )}

        {/* Controls hint */}
        {loaded && (
          <div className="absolute bottom-3 left-3 text-white/50 text-[10px] space-y-0.5 pointer-events-none">
            <p>עכבר שמאל: סיבוב</p>
            <p>עכבר ימין: הזזה</p>
            <p>גלגלת: זום</p>
          </div>
        )}
      </div>
    </div>
  )
}
