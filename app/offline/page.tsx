export default function Offline() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
      <p className="font-display uppercase tracking-wide text-white text-3xl mb-2">You&apos;re offline</p>
      <p className="text-neutral-400 max-w-xs">
        This screen hasn&apos;t been cached yet. Anything you log while offline is saved and will sync
        automatically once you&apos;re back online.
      </p>
    </div>
  )
}
