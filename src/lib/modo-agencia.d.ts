export type Modo = "agencia" | "ark";
export declare const HOSTS_ARK: string[];
export declare function hostDaArk(host: string | null | undefined): boolean;
export declare function decidirModo(o: { host?: string; busca?: string; salvo?: string | null }): Modo;
export declare function lerEGuardarModo(
  loc: { hostname?: string; search?: string } | null | undefined,
  storage: Pick<Storage, "getItem" | "setItem"> | null | undefined,
): Modo;
