import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/archivo/wdth.css'
import './index.css'
import App from './App.tsx'
import { BuzzerLag } from './buzzer/BuzzerLag.tsx'

// ?rom=KODE (eller ?buzz) åpner buzzeren for et lag i stedet for selve spillet.
const p = new URLSearchParams(location.search)
const erBuzzer = p.has('rom') || p.has('buzz')

createRoot(document.getElementById('root')!).render(<StrictMode>{erBuzzer ? <BuzzerLag /> : <App />}</StrictMode>)
