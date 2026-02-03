import React from 'react'
import type { ReactElement } from 'react'
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
  useHover,
  useFocus,
  useRole,
  useDismiss,
  useInteractions,
  FloatingPortal
} from '@floating-ui/react'

type Props = {
  children: ReactElement
  content: string
  title?: string
  placement?:
    | 'top'
    | 'bottom'
    | 'left'
    | 'right'
    | 'top-start'
    | 'top-end'
    | 'bottom-start'
    | 'bottom-end'
    | 'left-start'
    | 'left-end'
    | 'right-start'
    | 'right-end'
} 

export default function HoverTooltip({ children, content, title, placement = 'top-end' }: Props) {
  const [open, setOpen] = React.useState(false)

  const { refs, strategy, context, floatingStyles } = useFloating({
    placement,
    middleware: [offset({ mainAxis: 32, alignmentAxis: 32 }), flip(), shift()],
    whileElementsMounted: autoUpdate,
    open,
    onOpenChange: setOpen
  })

  const reference = refs.setReference
  const floatingRef = refs.setFloating

  // Configure hover with small open delay and longer close delay to prevent flicker
  const hover = useHover(context, { move: true, })
  const focus = useFocus(context)
  const role = useRole(context, { role: 'tooltip' })
  const dismiss = useDismiss(context)
  const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus, role, dismiss])

  // Track the actual DOM reference and attach a virtual reference that follows the cursor
  const domReferenceRef = React.useRef<HTMLElement | null>(null)
  const rafRef = React.useRef<number | null>(null)

  const createVirtualElement = (x: number, y: number) => ({
    getBoundingClientRect: () =>
      ({
        x,
        y,
        left: x,
        top: y,
        right: x,
        bottom: y,
        width: 0,
        height: 0
      } as DOMRect)
  })

  const handleMouseMove = (e: React.MouseEvent) => {
    const x = e.clientX
    const y = e.clientY
    const virtualEl = createVirtualElement(x, y)
    refs.setReference(virtualEl as any)
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(() => {
        context.update?.()
        rafRef.current = null
      })
    }
  }

  const handleMouseLeave = () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    // restore to the real DOM element reference
    refs.setReference(domReferenceRef.current as any)
  }

  React.useEffect(() => {
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  return (
    <>
      <span
        ref={(node) => {
          domReferenceRef.current = node as HTMLElement | null
          reference(node as any)
        }}
        {...getReferenceProps({ onMouseMove: handleMouseMove, onMouseLeave: handleMouseLeave })}
        style={{ display: 'inline-block' }}
      >
        {children}
      </span>

      <FloatingPortal>
        {open && (
          <div
            ref={floatingRef as any}
            {...getFloatingProps({})}
            style={{
              position: strategy as 'absolute' | 'fixed',
              ...(floatingStyles ?? {}),
              background: 'rgba(0,0,0,0.85)',
              color: 'white',
              padding: '8px',
              borderRadius: 6,
              maxWidth: 320,
              fontFamily: 'monospace',
              fontSize: 12,
              zIndex: 9999,
              whiteSpace: 'pre-wrap'
            }}
          >
            {title && <div style={{ fontWeight: 'bold', marginBottom: 6 }}>{title}</div>}
            <pre style={{ margin: 0 }}>{content}</pre>
          </div>
        )}
      </FloatingPortal>
    </>
  )
}
