// src/components/InstallPrompt.jsx
import { useEffect, useState } from 'react'

const DISMISS_KEY = 'cf_install_dismissed'
const DISMISS_DAYS = 7

function shouldShow() {
  const d = localStorage.getItem(DISMISS_KEY)
  if (!d) return true
  return Date.now() - parseInt(d) > DISMISS_DAYS * 86400000
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.navigator.standalone
}
function isAndroidChrome() {
  return /android/i.test(navigator.userAgent) && /chrome/i.test(navigator.userAgent)
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [show, setShow] = useState(false)
  const [ios, setIos]   = useState(false)

  useEffect(() => {
    if (!shouldShow()) return
    if (isIOS()) { setIos(true); setShow(true); return }
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShow(true)
    })
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, Date.now().toString())
    setShow(false)
  }

  async function install() {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      await deferredPrompt.userChoice
    }
    dismiss()
  }

  if (!show) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', borderTop: '1px solid #2a2a2a' }}
    >
      <div className="max-w-sm mx-auto">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm"
            style={{ background: '#1a2a1a', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' }}>
            CF
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white">Install ClientFlow</div>
            {ios ? (
              <div className="text-xs mt-1" style={{ color: '#888' }}>
                Tap <strong style={{ color: '#e8e8e8' }}>Share</strong> → <strong style={{ color: '#e8e8e8' }}>Add to Home Screen</strong> to install this app.
              </div>
            ) : (
              <div className="text-xs mt-1" style={{ color: '#888' }}>
                Add to your home screen for the full app experience — works offline too.
              </div>
            )}
          </div>
          <button className="shrink-0 text-xs p-1" style={{ color: '#555' }} onClick={dismiss}>✕</button>
        </div>
        {!ios && (
          <button
            className="mt-3 w-full py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: '#4ade80', color: '#000' }}
            onClick={install}
          >
            Add to Home Screen
          </button>
        )}
      </div>
    </div>
  )
}
