'use client'

import { Toaster } from 'react-hot-toast'

export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3000,
        style: { fontSize: '13px', borderRadius: '10px' },
        success: { iconTheme: { primary: '#6fcf6f', secondary: '#fff' } },
      }}
    />
  )
}
