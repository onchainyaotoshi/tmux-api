import { useEffect, useRef } from 'react'

const CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF'

export default function MatrixRain() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    let columns = []
    const fontSize = 14
    const speed = 33 // ~30fps

    function resize() {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      const colCount = Math.floor(canvas.width / fontSize)
      columns = Array.from({ length: colCount }, () =>
        Math.floor(Math.random() * canvas.height / fontSize)
      )
    }

    function draw() {
      ctx.fillStyle = 'rgba(10, 14, 20, 0.05)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = 'rgba(0, 255, 65, 0.08)'
      ctx.font = `${fontSize}px monospace`

      for (let i = 0; i < columns.length; i++) {
        const char = CHARS[Math.floor(Math.random() * CHARS.length)]
        const x = i * fontSize
        const y = columns[i] * fontSize
        ctx.fillText(char, x, y)

        if (y > canvas.height && Math.random() > 0.975) {
          columns[i] = 0
        }
        columns[i]++
      }
    }

    resize()
    const interval = setInterval(draw, speed)
    window.addEventListener('resize', resize)

    // Respect reduced motion
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mql.matches) {
      clearInterval(interval)
    }

    return () => {
      clearInterval(interval)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full pointer-events-none"
      style={{ opacity: 0.05 }}
      aria-hidden="true"
    />
  )
}
