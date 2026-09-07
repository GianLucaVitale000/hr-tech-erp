/* global describe, it, expect, beforeEach, afterEach, jest */
import { haDatiSignificativi, isFoglioCompleto } from '../utils/foglioCompleto'

// ── Fixture ────────────────────────────────────────────────────────────────

const rigaVal = (overrides = {}) => ({
  ore_ordinarie: 8, ore_causale: 0, ore_straordinarie: 0,
  causale: 'lavoro', modalita_lavoro: 'in_sede', id: 1, ...overrides,
})
const rigaVuota = () => ({
  ore_ordinarie: 0, ore_causale: 0, ore_straordinarie: 0,
  causale: 'lavoro', modalita_lavoro: null, id: null,
})

function buildRighe(anno, mese, valorizzati) {
  const righe = {}
  for (let g = 1; g <= new Date(anno, mese, 0).getDate(); g++) {
    const ds = `${anno}-${String(mese).padStart(2, '0')}-${String(g).padStart(2, '0')}`
    righe[ds] = valorizzati.has(g) ? rigaVal() : rigaVuota()
  }
  return righe
}

const DIP_FT_5 = {
  id: 1, tipo_contratto: 'indeterminato',
  data_assunzione: '2020-01-01', data_scadenza_contratto: null,
  giorni_lavorativi_settimanali: 5,
}
const DIP_FT_6 = {
  id: 2, tipo_contratto: 'indeterminato',
  data_assunzione: '2020-01-01', data_scadenza_contratto: null,
  giorni_lavorativi_settimanali: 6,
}

// Mock: siamo al 20 settembre 2026
beforeEach(() => {
  jest.useFakeTimers()
  jest.setSystemTime(new Date('2026-09-20T10:00:00'))
})
afterEach(() => { jest.useRealTimers() })

// ── haDatiSignificativi ─────────────────────────────────────────────────────

describe('haDatiSignificativi', () => {
  it('null → false', () => {
    expect(haDatiSignificativi(null)).toBe(false)
  })
  it('riga vuota (tutti null/0) → false', () => {
    expect(haDatiSignificativi(rigaVuota())).toBe(false)
  })
  it('riga con id salvata → true', () => {
    expect(haDatiSignificativi(rigaVal())).toBe(true)
  })
  it('riga senza id ma con ore > 0 → true', () => {
    expect(haDatiSignificativi({ ore_ordinarie: 4, id: null })).toBe(true)
  })
  it('riga con sole proprietà base (ore=0, no id, no modalita) → false', () => {
    expect(haDatiSignificativi({ ore_ordinarie: 0, ore_causale: 0, id: null })).toBe(false)
  })
  it('riga con modalita_lavoro valorizzato → true', () => {
    expect(haDatiSignificativi({ ore_ordinarie: 0, ore_causale: 0, id: null, modalita_lavoro: 'smart' })).toBe(true)
  })
})

// ── CHECK 1: copertura ─────────────────────────────────────────────────────

describe('isFoglioCompleto — CHECK 1 copertura', () => {
  // Siamo al 20/9/2026 (mock). Per DIP_FT_5 (5/7): obbligatori = feriali 1..20
  // = [1,2,3,4,7,8,9,10,11,14,15,16,17,18] (14 giorni, sab/dom esclusi)
  it('Giorni 1-18 compilati (manca 19 Sab, 20 Dom) → completo:true', () => {
    const valorizzati = new Set([1,2,3,4,7,8,9,10,11,14,15,16,17,18])
    const result = isFoglioCompleto(DIP_FT_5, 2026, 9, Array.from({ length: 30 }, (_, i) => i + 1), buildRighe(2026, 9, valorizzati))
    expect(result.completo).toBe(true)
  })
  it('Giorni 1-18 compilati MA manca il giorno 4 (feriale) → completo:false', () => {
    const valorizzati = new Set([1,2,3,5,7,8,9,10,11,14,15,16,17,18])
    const result = isFoglioCompleto(DIP_FT_5, 2026, 9, Array.from({ length: 30 }, (_, i) => i + 1), buildRighe(2026, 9, valorizzati))
    expect(result.completo).toBe(false)
    expect(result.message).toMatch(/Compilazione presenze non completata/)
  })
  it('Nessuna riga compilata → completo:false (14 feriali mancanti)', () => {
    const result = isFoglioCompleto(DIP_FT_5, 2026, 9, Array.from({ length: 30 }, (_, i) => i + 1), buildRighe(2026, 9, new Set()))
    expect(result.completo).toBe(false)
    expect(result.message).toMatch(/14 giorno/)
  })
// ── CHECK 2: consecutività (warning soft) ─────────────────────────────────
// ── Anagrafica e contratti ─────────────────────────────────────────────────

describe('isFoglioCompleto — anagrafica e contratti', () => {
  it('Dipendente null → completo:false', () => {
    const result = isFoglioCompleto(null, 2026, 9, Array.from({ length: 30 }, (_, i) => i + 1), {})
    expect(result.completo).toBe(false)
    expect(result.message).toMatch(/Anagrafica/)
  })
  it('Assunzione 10/9: compilati 10-18 (manca 19,20 weekend) → completo:true', () => {
    const dip = { ...DIP_FT_5, data_assunzione: '2026-09-10' }
    const valorizzati = new Set([10,11,14,15,16,17,18])
    const result = isFoglioCompleto(dip, 2026, 9, Array.from({ length: 30 }, (_, i) => i + 1), buildRighe(2026, 9, valorizzati))
    expect(result.completo).toBe(true)
  })
  it('Assunzione 10/9: manca il 17 (feriale) → incompleto (1 giorno)', () => {
    const dip = { ...DIP_FT_5, data_assunzione: '2026-09-10' }
    const valorizzati = new Set([10,11,14,15,16,18])
    const result = isFoglioCompleto(dip, 2026, 9, Array.from({ length: 30 }, (_, i) => i + 1), buildRighe(2026, 9, valorizzati))
    expect(result.completo).toBe(false)
    expect(result.message).toMatch(/1 giorno/)
  })
  it('Cessazione 15/9: compilati 1-15 (futuro 16-20 NON obbligatorio) → completo:true', () => {
    const dip = { ...DIP_FT_5, tipo_contratto: 'determinato', data_scadenza_contratto: '2026-09-15' }
    const valorizzati = new Set([1,2,3,4,7,8,9,10,11,14,15])
    const result = isFoglioCompleto(dip, 2026, 9, Array.from({ length: 30 }, (_, i) => i + 1), buildRighe(2026, 9, valorizzati))
    expect(result.completo).toBe(true)
  })
  it('Cessazione 15/9: manca il giorno 15 (scadenza) → incompleto', () => {
    const dip = { ...DIP_FT_5, tipo_contratto: 'determinato', data_scadenza_contratto: '2026-09-15' }
    const valorizzati = new Set([1,2,3,4,7,8,9,10,11,14])
    const result = isFoglioCompleto(dip, 2026, 9, Array.from({ length: 30 }, (_, i) => i + 1), buildRighe(2026, 9, valorizzati))
    expect(result.completo).toBe(false)
  })
})

// ── Integrazione Timesheet.jsx ─────────────────────────────────────────────

describe('isFoglioCompleto — integrazione Timesheet.jsx (caso Mario Rossi)', () => {
  // Oggi = 20/9/2026. Per DIP_FT_5: obbligatori = feriali 1..20 (14 giorni)
  it('Mario: compila 1-18, mancano 19(Sab) e 20(Dom) → completo:true', () => {
    const valorizzati = new Set([1,2,3,4,7,8,9,10,11,14,15,16,17,18])
    const result = isFoglioCompleto(DIP_FT_5, 2026, 9, Array.from({ length: 30 }, (_, i) => i + 1), buildRighe(2026, 9, valorizzati))
    expect(result.completo).toBe(true)
    expect(result.warning).toBeUndefined()
  })
  it('Mario: compila anche 21-25 (futuro, ignorato) → completo:true', () => {
    const valorizzati = new Set([1,2,3,4,7,8,9,10,11,14,15,16,17,18,21,22,23,24,25])
    const result = isFoglioCompleto(DIP_FT_5, 2026, 9, Array.from({ length: 30 }, (_, i) => i + 1), buildRighe(2026, 9, valorizzati))
    expect(result.completo).toBe(true)
    expect(result.warning).toBeUndefined()
  })
  it('Mario: manca il giorno 4 (feriale) → incompleto (1 giorno)', () => {
    const valorizzati = new Set([1,2,3,5,7,8,9,10,11,14,15,16,17,18])
    const result = isFoglioCompleto(DIP_FT_5, 2026, 9, Array.from({ length: 30 }, (_, i) => i + 1), buildRighe(2026, 9, valorizzati))
    expect(result.completo).toBe(false)
    expect(result.message).toMatch(/1 giorno/)
  })
})

describe('isFoglioCompleto — CHECK 2 consecutività (warning soft)', () => {
  // Per DIP_FT_6 (6/7) e giorni=[1..6]: tutti obbligatori e compilati.
  // èFT5=false → il counter non si resetta al weekend (Dom 5 non resetta).
  // 1-6 = 6 consecutivi → max=6, soglia=6 → 6>6=false → no warning.

  it('DIP_FT_6 compila 1-6 → no warning (6 consecutivi = soglia)', () => {
    const result = isFoglioCompleto(DIP_FT_6, 2026, 4, [1,2,3,4,5,6], buildRighe(2026, 4, new Set([1,2,3,4,5,6])))
    expect(result.completo).toBe(true)
    expect(result.warning).toBeUndefined()
  })
  it('Senza giorni_lavorativi_settimanali → skip check consecutività', () => {
    const dip = { ...DIP_FT_6, giorni_lavorativi_settimanali: null }
    const result = isFoglioCompleto(dip, 2026, 4, [1,2,3,4,5,6], buildRighe(2026, 4, new Set([1,2,3,4,5,6])))
    expect(result.completo).toBe(true)
    expect(result.warning).toBeUndefined()
  })
  it('FT_5/7: week-end resetta il contatore (Mario scenario reale)', () => {
    // Mario compila feriali 1-4,7-11,14-18 + Sab19, Dom20.
    // èFT5=true → reset al Sab e Dom → max=5 (lun-ven) → 5>5=false → no warning.
    const valorizzati = new Set([1,2,3,4,7,8,9,10,11,14,15,16,17,18,19,20])
    const result = isFoglioCompleto(DIP_FT_5, 2026, 9, Array.from({ length: 30 }, (_, i) => i + 1), buildRighe(2026, 9, valorizzati))
    expect(result.completo).toBe(true)
    expect(result.warning).toBeUndefined()
  })
  it('giorni_lavorativi_settimanali=6: 7 giorni consecutivi (1-7 apr) → warning 7/6', () => {
    // Apr 2026: 1=Mer,2=Gio,3=Ven,4=Sab,5=Dom,6=Lun,7=Mar.
    // FT 6/7: sab lavora, dom no. Compilando 1-7, 1-4=4 e 6-7=2 → max=4 → no warning.
    // Compilando TUTTO (1-7 inclusi 5,6,7): èFT5=false → counter non resetta → 7 consecutivi → warning 7/6.
    const result = isFoglioCompleto(DIP_FT_6, 2026, 4, [1,2,3,4,5,6,7], buildRighe(2026, 4, new Set([1,2,3,4,5,6,7])))
    expect(result.completo).toBe(true)
    expect(result.warning).toMatch(/7.*6/)
  })
})
})