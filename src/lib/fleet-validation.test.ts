import { describe, expect, test } from 'vitest'
import {
  formatCpfInput,
  formatPlate,
  isValidCpf,
  isValidPlate,
  isValidRenavam,
  normalizePlate,
  parseDecimalInput,
} from './fleet-validation'

/** Mesmas regras do backend (SIMP-BACKEND/src/utils/fleet-validators.ts). */
describe('fleet-validation', () => {
  test('placa: normaliza e aceita antiga e Mercosul', () => {
    expect(normalizePlate('abc-1d23')).toBe('ABC1D23')
    expect(isValidPlate('ABC1234')).toBe(true)
    expect(isValidPlate('ABC1D23')).toBe(true)
    expect(isValidPlate('AB1234')).toBe(false)
    expect(formatPlate('ABC1234')).toBe('ABC-1234')
    expect(formatPlate('ABC1D23')).toBe('ABC1D23')
  })

  test('Renavam e CPF com dígito verificador', () => {
    expect(isValidRenavam('01234567897')).toBe(true)
    expect(isValidRenavam('01234567898')).toBe(false)
    expect(isValidCpf('52998224725')).toBe(true)
    expect(isValidCpf('52998224724')).toBe(false)
    expect(isValidCpf('11111111111')).toBe(false)
  })

  test('máscara de CPF durante a digitação', () => {
    expect(formatCpfInput('529')).toBe('529')
    expect(formatCpfInput('5299822')).toBe('529.982.2')
    expect(formatCpfInput('52998224725')).toBe('529.982.247-25')
  })

  test('decimal digitado vira string sem passar por float', () => {
    expect(parseDecimalInput('55,5', 3)).toBe('55.5')
    expect(parseDecimalInput('55.5', 3)).toBe('55.5')
    expect(parseDecimalInput('1.234,567', 3)).toBe('1234.567')
    expect(parseDecimalInput('55,5555', 3)).toBeNull()
    expect(parseDecimalInput('0', 3)).toBeNull()
    expect(parseDecimalInput('abc', 3)).toBeNull()
  })
})
