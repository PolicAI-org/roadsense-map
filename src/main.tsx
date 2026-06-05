import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

type ThemeSource = 'dark' | 'light' | 'system'

function applyTheme(source: ThemeSource) {
  const el = document.documentElement
  if (source === 'light') {
    el.setAttribute('data-theme', 'light')
  } else if (source === 'dark') {
    el.removeAttribute('data-theme')
  } else {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (isDark) el.removeAttribute('data-theme')
    else el.setAttribute('data-theme', 'light')
  }
}

if (window.electronAPI) {
  window.electronAPI.getTheme().then(applyTheme)
  window.electronAPI.onThemeChange(applyTheme)
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', async () => {
    const theme = await window.electronAPI.getTheme()
    if (theme === 'system') applyTheme('system')
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

window.ipcRenderer.on('main-process-message', (_event, message) => {
  console.log(message)
})
