'use client'
import { useEffect, useState } from 'react'
import { useOSStore } from '@/store/os'
import Window from '@/components/Window'
import Dock from '@/components/Dock'
import ContextMenu from '@/components/ContextMenu'

function StarField() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 80 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            width: (i * 7) % 3 + 1,
            height: (i * 7) % 3 + 1,
            left: `${(i * 13.7) % 100}%`,
            top: `${(i * 17.3) % 100}%`,
            opacity: ((i * 3) % 6) * 0.1 + 0.1,
            animation: `twinkle ${(i % 3) + 2}s ease-in-out infinite`,
            animationDelay: `${i % 3}s`,
          }}
        />
      ))}
    </div>
  )
}

function Clock() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const update = () => setTime(
      new Date().toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      })
    )
    update()
    const i = setInterval(update, 1000)
    return () => clearInterval(i)
  }, [])
  return <span className="text-kronos-text text-xs font-mono">{time}</span>
}

export default function Desktop() {
  const { windows, setBooted, loadPersistedVFS } = useOSStore()
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    loadPersistedVFS().then(() => setBooted(true))
  }, [])

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  return (
    <main
      suppressHydrationWarning
      className="w-screen h-screen overflow-hidden relative"
      onContextMenu={handleContextMenu}
      style={{
        background: 'radial-gradient(ellipse at 30% 40%, #0d0d2a 0%, #0a0a0f 50%, #0D0D0D 100%)'
      }}
    >
      <StarField />

      {/* Subtle grid */}


      {/* Taskbar */}
      <div
        className="fixed top-0 left-0 right-0 h-8 z-40 flex items-center justify-between px-4"
        style={{
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(201,168,76,0.12)'
        }}
      >
        <span className="text-kronos-gold text-xs font-bold font-mono tracking-widest">⚡ KRONOS</span>
        <Clock />
        <span className="text-kronos-dim text-xs font-mono">v1.0.0</span>
      </div>

      {/* Windows */}
      {windows.map(win => (
        <Window key={win.id} {...win} />
      ))}

      {/* Dock */}
      <Dock />

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        />
      )}

    </main>
  )
}