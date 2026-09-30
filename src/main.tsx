import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Self-hosted faces (Google Fonts is unreachable from mainland China).
import '@fontsource/league-gothic/400.css'
import '@fontsource/im-fell-english-sc/400.css'
import '@fontsource/libre-caslon-text/400.css'
import '@fontsource/libre-caslon-text/700.css'
import '@fontsource/libre-caslon-text/400-italic.css'
import '@fontsource-variable/archivo/wdth.css'
import '@fontsource/lilita-one/400.css'
import '@fontsource-variable/nunito/index.css'

import './index.css'
import App from './App.tsx'

// Chinese faces are large (hundreds of unicode-range slices); load them after first paint.
const loadCjk = () => {
  import('@fontsource/noto-serif-sc/400.css')
  import('@fontsource/noto-serif-sc/900.css')
  import('@fontsource/noto-sans-sc/400.css')
  import('@fontsource/noto-sans-sc/700.css')
  import('@fontsource/zcool-kuaile/400.css')
}
if ('requestIdleCallback' in window) window.requestIdleCallback(loadCjk, { timeout: 1500 })
else setTimeout(loadCjk, 300)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
