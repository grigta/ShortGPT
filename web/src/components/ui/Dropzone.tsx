import { UploadCloud } from 'lucide-react'
import { useRef, useState } from 'react'
import { cn } from '../../lib/cn'

interface DropzoneProps {
  onFile: (file: File) => void
  accept?: string
  hint?: string
  className?: string
}

export function Dropzone({ onFile, accept, hint, className }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)

  const handle = (file: File | undefined) => {
    if (!file) return
    setFileName(file.name)
    onFile(file)
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        handle(e.dataTransfer.files[0])
      }}
      className={cn(
        'flex w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed px-6 py-9 transition-all duration-120',
        dragging
          ? 'border-amber-500/60 bg-amber-500/5'
          : 'border-line-strong hover:border-amber-500/40 hover:bg-ink-800/50',
        className,
      )}
    >
      <UploadCloud size={22} className={dragging ? 'text-amber-400' : 'text-text-low'} />
      {fileName ? (
        <span className="max-w-full truncate font-mono text-[13px] text-text-hi">{fileName}</span>
      ) : (
        <span className="text-[13px] text-text-mid">
          Перетащите файл или <span className="text-amber-400">выберите</span>
        </span>
      )}
      {hint && <span className="text-[12px] text-text-low">{hint}</span>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handle(e.target.files?.[0])}
      />
    </button>
  )
}
