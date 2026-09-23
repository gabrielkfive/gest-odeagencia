export type MarcaAgencia = { name?: string; short?: string; color?: string; logo?: string };
export function nomeCurto(marca: MarcaAgencia | null | undefined): string;
export function nomeProduto(marca: MarcaAgencia | null | undefined): string;
export function corAceita(hex: string | null | undefined): boolean;
export function corSobre(hex: string | null | undefined): string;
