import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { RotateCcw, Move3d, Download } from 'lucide-react'

interface ModelViewer3DProps {
  url: string
  fileName: string
  fileType: string
}

export function ModelViewer3D({ url, fileName, fileType }: ModelViewer3DProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const frameRef = useRef<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!mountRef.current) return
    const mount = mountRef.current
    const w = mount.clientWidth
    const h = mount.clientHeight || 400

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x1e293b)
    sceneRef.current = scene

    // Camera
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000)
    camera.position.set(5, 5, 5)
    cameraRef.current = camera

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.shadowMap.enabled = true
    mount.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controlsRef.current = controls

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambient)
    const dirLight = new THREE.DirectionalLight(0xffffff, 1)
    dirLight.position.set(10, 10, 5)
    dirLight.castShadow = true
    scene.add(dirLight)
    const fillLight = new THREE.DirectionalLight(0x8fb4ff, 0.3)
    fillLight.position.set(-10, 0, -5)
    scene.add(fillLight)

    // Grid
    const grid = new THREE.GridHelper(20, 20, 0x334155, 0x334155)
    scene.add(grid)

    // Load model
    const ext = fileType.toLowerCase()

    function fitCameraToObject(object: THREE.Object3D) {
      const box = new THREE.Box3().setFromObject(object)
      const size = box.getSize(new THREE.Vector3())
      const center = box.getCenter(new THREE.Vector3())
      const maxDim = Math.max(size.x, size.y, size.z)
      camera.position.set(center.x + maxDim * 1.5, center.y + maxDim, center.z + maxDim * 1.5)
      controls.target.copy(center)
      controls.update()
    }

    if (ext.includes('gltf') || ext.includes('glb')) {
      new GLTFLoader().load(
        url,
        (gltf) => {
          scene.add(gltf.scene)
          fitCameraToObject(gltf.scene)
          setLoading(false)
        },
        undefined,
        () => setError('לא ניתן לטעון GLB/GLTF')
      )
    } else if (ext.includes('obj')) {
      new OBJLoader().load(
        url,
        (obj) => {
          const mat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 })
          obj.traverse(child => {
            if ((child as THREE.Mesh).isMesh) (child as THREE.Mesh).material = mat
          })
          scene.add(obj)
          fitCameraToObject(obj)
          setLoading(false)
        },
        undefined,
        () => setError('לא ניתן לטעון OBJ')
      )
    } else if (ext.includes('stl')) {
      new STLLoader().load(
        url,
        (geometry) => {
          geometry.computeVertexNormals()
          const mesh = new THREE.Mesh(
            geometry,
            new THREE.MeshPhongMaterial({ color: 0x94a3b8, specular: 0x222222 })
          )
          scene.add(mesh)
          fitCameraToObject(mesh)
          setLoading(false)
        },
        undefined,
        () => setError('לא ניתן לטעון STL')
      )
    } else {
      setError('פורמט לא נתמך לצפייה ישירה')
      setLoading(false)
    }

    // Animate
    function animate() {
      frameRef.current = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // Resize
    function onResize() {
      if (!mount) return
      const w = mount.clientWidth
      const h = mount.clientHeight || 400
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(frameRef.current)
      window.removeEventListener('resize', onResize)
      controls.dispose()
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  }, [url, fileType])

  function resetCamera() {
    if (!cameraRef.current || !controlsRef.current) return
    cameraRef.current.position.set(5, 5, 5)
    controlsRef.current.target.set(0, 0, 0)
    controlsRef.current.update()
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-slate-800 rounded-lg px-4 py-2">
        <div className="flex items-center gap-2 text-slate-400 text-xs">
          <Move3d className="w-4 h-4" />
          <span>גרור לסיבוב • גלגל לזום • Shift+גרור להזזה</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={resetCamera} className="p-1.5 rounded hover:bg-slate-700 transition text-white" title="איפוס מצלמה">
            <RotateCcw className="w-4 h-4" />
          </button>
          <a href={url} download={fileName} className="p-1.5 rounded hover:bg-slate-700 transition text-white">
            <Download className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Viewer */}
      <div className="relative rounded-lg overflow-hidden" style={{ height: 400 }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-800 z-10 rounded-lg">
            <p className="text-slate-400">טוען מודל תלת-מימדי...</p>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800 z-10 rounded-lg gap-3">
            <p className="text-slate-300">{error}</p>
            <a href={url} download={fileName} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
              הורד קובץ
            </a>
          </div>
        )}
        <div ref={mountRef} className="w-full h-full" />
      </div>
    </div>
  )
}
