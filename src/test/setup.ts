import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Limpa o DOM após cada teste
afterEach(() => {
  cleanup()
})

// Mock do localStorage/sessionStorage
const storageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

Object.defineProperty(window, 'localStorage', { value: storageMock })
Object.defineProperty(window, 'sessionStorage', { value: storageMock })

// Silence console.error em testes (React warnings esperados)
// Remova se quiser ver todos os warnings
vi.spyOn(console, 'error').mockImplementation(() => {})
