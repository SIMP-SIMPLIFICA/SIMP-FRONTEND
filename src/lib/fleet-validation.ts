/**
 * Validação de dados de frota no navegador — espelho de
 * SIMP-BACKEND/src/utils/fleet-validators.ts. Serve para avisar ANTES do envio;
 * a decisão final é sempre do servidor.
 */

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** "abc-1d23" → "ABC1D23". */
export function normalizePlate(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Placa antiga (ABC1234) ou Mercosul (ABC1D23), já normalizada. */
export function isValidPlate(plate: string): boolean {
  return /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(plate);
}

/** Exibição: "ABC1234" → "ABC-1234"; Mercosul fica sem hífen. */
export function formatPlate(plate: string): string {
  return /^[A-Z]{3}\d{4}$/.test(plate) ? `${plate.slice(0, 3)}-${plate.slice(3)}` : plate;
}

export function isValidRenavam(digits: string): boolean {
  if (!/^\d{11}$/.test(digits)) return false;
  const weights = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const sum = weights.reduce((acc, w, i) => acc + Number(digits[i]) * w, 0);
  const dv = (sum * 10) % 11;
  return (dv === 10 ? 0 : dv) === Number(digits[10]);
}

export function isValidCpf(digits: string): boolean {
  if (!/^\d{11}$/.test(digits) || /^(\d)\1{10}$/.test(digits)) return false;
  const dv = (length: number) => {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += Number(digits[i]) * (length + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return dv(9) === Number(digits[9]) && dv(10) === Number(digits[10]);
}

/** Máscara de digitação: "52998224725" → "529.982.247-25". */
export function formatCpfInput(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
}

export function isValidCnhNumber(digits: string): boolean {
  return /^\d{11}$/.test(digits) && !/^(\d)\1{10}$/.test(digits);
}

/**
 * "55,5" / "55.5" / "1.234,5" → "55.5" / "55.5" / "1234.5". Com vírgula, ela é o
 * separador decimal e os pontos são de milhar. Devolve null se não for um
 * decimal positivo com até `scale` casas — a string vai assim para o servidor,
 * sem passar por float.
 */
export function parseDecimalInput(value: string, scale: number): string | null {
  let normalized = value.trim();
  if (normalized.includes(",")) normalized = normalized.replace(/\./g, "").replace(",", ".");
  if (!new RegExp(`^\\d+(\\.\\d{1,${scale}})?$`).test(normalized)) return null;
  return Number(normalized) > 0 ? normalized : null;
}
