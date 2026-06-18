export function ImageEditor({ file }: { file?: { url: string; name: string } }) {
  const src = file
    ? `https://www.photopea.com#${encodeURIComponent(JSON.stringify({ files: [file.url], environment: { theme: 1, lang: 'he' } }))}`
    : 'https://www.photopea.com'

  return (
    <div className="w-full rounded-xl overflow-hidden border border-slate-200" style={{ height: '82vh' }}>
      <iframe
        src={src}
        style={{ width: '100%', height: '100%', border: 'none' }}
        title="Photopea — Adobe Photoshop"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  )
}
