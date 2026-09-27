import { useUI } from '../state/ui'
import { Button } from './ui/Button'
import { Sheet } from './ui/Sheet'

export function ConfirmDialog() {
  const { confirmState, resolveConfirm } = useUI()
  return (
    <Sheet
      open={!!confirmState}
      onClose={() => resolveConfirm(false)}
      title={confirmState?.title ?? ''}
      size="sm"
      footer={
        <>
          <Button className="flex-1 sm:flex-none" onClick={() => resolveConfirm(false)} data-autofocus>
            Cancel
          </Button>
          <Button
            variant={confirmState?.tone === 'danger' ? 'danger' : 'primary'}
            className="flex-1 sm:ml-auto sm:flex-none"
            onClick={() => resolveConfirm(true)}
          >
            {confirmState?.confirmLabel ?? 'Confirm'}
          </Button>
        </>
      }
    >
      {confirmState?.message && <p className="text-sm leading-relaxed text-ink-2">{confirmState.message}</p>}
    </Sheet>
  )
}
