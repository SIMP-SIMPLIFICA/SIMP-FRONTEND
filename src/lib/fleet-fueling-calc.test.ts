import { describe, expect, test } from 'vitest'
import { cnhCovers, decimalGreaterThan, formatBrl, formatLitres, formatUnitPrice, previewAmount, previewLitres } from './fleet-fueling-calc'

describe('pré-visualização da autorização', () => {
  test('litros × preço sem erro de ponto flutuante', () => {
    expect(previewAmount('40', '6.19')).toBe('247.60')
    expect(previewAmount('60', '6,19')).toBe('371.40')
    expect(previewAmount('0,333', '3.0001')).toBe('1.00')
  })

  test('valor ÷ preço arredonda os litros para baixo', () => {
    expect(previewLitres('100', '6.19')).toBe('16.155')
    expect(previewLitres('247,60', '6.19')).toBe('40.000')
  })

  test('entrada inválida não calcula', () => {
    expect(previewAmount('', '6.19')).toBeNull()
    expect(previewAmount('40', 'abc')).toBeNull()
    expect(previewAmount('0', '6.19')).toBeNull()
  })

  test('comparação de decimais para o aviso de tanque', () => {
    expect(decimalGreaterThan('60', '55.5')).toBe(true)
    expect(decimalGreaterThan('55.5', '55.5')).toBe(false)
  })

  test('categoria de CNH (mesma regra do backend)', () => {
    expect(cnhCovers('B', 'B')).toBe(true)
    expect(cnhCovers('B', 'C')).toBe(false)
    expect(cnhCovers('AE', 'D')).toBe(true)
    expect(cnhCovers('B', 'A')).toBe(false)
    expect(cnhCovers('C', null)).toBe(true)
  })

  test('formatação', () => {
    expect(formatBrl('49752.4')).toBe('R$ 49.752,40')
    expect(formatLitres('40.000')).toBe('40 L')
    expect(formatLitres('16.155')).toBe('16,155 L')
    expect(formatUnitPrice('6.19')).toBe('R$ 6,190')
  })
})
