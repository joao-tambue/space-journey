import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Mission from './pages/Mission'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Mission />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
