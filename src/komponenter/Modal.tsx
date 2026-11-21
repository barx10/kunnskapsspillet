import { useEffect, useRef } from 'react'

type Props = { tittel: string; onLukk: () => void; children: React.ReactNode; bred?: boolean }

export function Modal({ tittel, onLukk, children, bred }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const tilbake = document.activeElement as HTMLElement | null
    ref.current?.showModal()
    return () => tilbake?.focus?.()
  }, [])
  return (
    <dialog
      ref={ref}
      className={bred ? 'dialog dialog-bred' : 'dialog'}
      aria-labelledby="modal-tittel"
      onCancel={(e) => (e.preventDefault(), onLukk())}
      onClick={(e) => e.target === ref.current && onLukk()}
    >
      <h2 id="modal-tittel">{tittel}</h2>
      {children}
      <div className="knapperad slutt">
        <button className="knapp knapp-hoved" onClick={onLukk} autoFocus>
          Lukk
        </button>
      </div>
    </dialog>
  )
}
