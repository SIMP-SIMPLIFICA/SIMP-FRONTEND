/**
 * Campo-isca (honeypot) dos formulários públicos.
 *
 * Nome escolhido para parecer plausível a um bot que preenche todo input que
 * encontra, sem ser um tipo que o autofill do navegador reconheça sozinho —
 * por isso não `phone`, `tel` ou `address` puros, que gerenciadores de senha
 * costumam completar.
 *
 * Precisa ser idêntico a HONEYPOT_FIELD em
 * SIMP-BACKEND/src/middleware/honeypot.middleware.ts.
 */
export const HONEYPOT_FIELD = "phone_fax";
