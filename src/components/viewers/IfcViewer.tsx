import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Download, Layers } from 'lucide-react'

interface IfcViewerProps {
  url: string
  fileName?: string
}

export function IfcViewer({ url, fileName }: IfcViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [elementCount, setElementCount] = useState(0)

  useEffect(() => {
    let destroyed = false
    let renderer: THREE.WebGLRenderer | null = null
    let frameId = 0

    async function init() {
      if (!mountRef.current) return
      const mount = mountRef.current
      const w = mount.clientWidth
      const h = mount.clientHeight || 480

      const scene = new THREE.Scene()
      scene.background = new THREE.Color(0x1a2332)

      const camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 10000)
      camera.position.set(20, 20, 20)

      renderer = new THREE.WebGLRenderer({ antialias: true })
      renderer.setSize(w, h)
      renderer.setPixelRatio(window.devicePixelRatio)
      mount.appendChild(renderer.domElement)

      const controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true

      const ambient = new THREE.AmbientLight(0xffffff, 0.7)
      scene.add(ambient)
      const dir = new THREE.DirectionalLight(0xffffff, 1)
      dir.position.set(10, 20, 10)
      scene.add(dir)

      const grid = new THREE.GridHelper(50, 50, 0x334155, 0x1e293b)
      scene.add(grid)

      try {
        const { IfcLoader } = await import('@thatopen/components')
        const { Components } = await import('@thatopen/components')

        if (destroyed) return

        const components = new Components()
        const ifcLoader = components.get(IfcLoader)
        ifcLoader.settings.wasm = {
          path: 'https://unpkg.com/web-ifc@0.0.57/',
          absolute: true,
        }
        await ifcLoader.setup()

        const response = await fetch(url)
        const buffer = await response.arrayBuffer()
        const data = new Uint8Array(buffer)
        const model = await (ifcLoader.load as any)(data, true, 'model') as any

        if (destroyed) return

        scene.add(model)

        let count = 0
        model.traverse?.(() => count++)
        if (!destroyed) setElementCount(count)

        const box = new THREE.Box3().setFromObject(model)
        const center = box.getCenter(new THREE.Vector3())
        const size = box.getSize(new THREE.Vector3())
        const maxDim = Math.max(size.x, size.y, size.z)
        camera.position.set(center.x + maxDim, center.y + maxDim * 0.8, center.z + maxDim)
        controls.target.copy(center)
        controls.update()

        if (!destroyed) setLoading(false)
      } catch {
        if (!destroyed) {
          setError('לא ניתן לטעון קובץ IFC בדפדפן')
          setLoading(false)
        }
        return
      }

      function animate() {
        if (destroyed) return
        frameId = requestAnimationFrame(animate)
        controls.update()
        renderer!.render(scene, camera)
      }
      animate()

      function onResize() {
        if (!mount || !renderer) return
        const w = mount.clientWidth
        const h = mount.clientHeight || 480
        camera.aspect = w / h
        camera.updateProjectionMatrix()
        renderer.setSize(w, h)
      }
      window.addEventListener('resize', onResize)

      const cleanup = () => {
        window.removeEventListener('resize', onResize)
      }
      return cleanup
    }

    const cleanupPromise = init()

    return () => {
      destroyed = true
      cancelAnimationFrame(frameId)
      cleanupPromise.then(fn => fn?.())
      if (renderer) {
        renderer.dispose()
        if (mountRef.current?.contains(renderer.domElement)) {
          mountRef.current.removeChild(renderer.domElement)
        }
      }
    }
  }, [url])

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between bg-slate-800 rounded-lg px-4 py-2">
        <div className="flex items-center gap-2 text-slate-400 text-xs">
          <Layers className="w-4 h-4" />
          <span>BIM IFC Viewer {elementCount > 0 ? `• ${elementCount} אלמנטים` : ''}</span>
        </div>
        <a href={url} download={fileName} className="p-1.5 rounded hover:bg-slate-700 transition text-white">
          <Download className="w-4 h-4" />
        </a>
      </div>
      <div className="relative rounded-lg overflow-hidden" style={{ height: 480 }}>
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800 z-10 rounded-lg gap-2">
            <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">טוען מודל BIM...</p>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800 z-10 rounded-lg gap-4">
            <Layers className="w-12 h-12 text-slate-500" />
            <div className="text-center">
              <p className="text-slate-300 font-medium">קובץ IFC — BIM</p>
              <p className="text-slate-500 text-sm mt-1">לצפייה מלאה פתח עם Revit, ArchiCAD או Navisworks</p>
            </div>
            <a href={url} download={fileName} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2">
              <Download className="w-4 h-4" />
              הורד קובץ IFC
            </a>
          </div>
        )}
        <div ref={mountRef} className="w-full h-full" />
      </div>
    </div>
  )
}
