import { describe, expect, it } from '@jest/globals'
import { calcolaSupplementariEStraordinarieMensili } from '../utils/analisiHRUtils'

describe('calcolaSupplementariEStraordinarieMensili', () => {
  it('considera le ore eccedenti già separate dal backend per un part-time', () => {
    const risultato = calcolaSupplementariEStraordinarieMensili(
      Array.from({ length: 15 }, (_, index) => ({
        data: `2026-10-${String(index + 1).padStart(2, '0')}`,
        causale: 'lavoro',
        ore_ordinarie: 4,
        ore_eccedenti: 2,
        ore_straordinarie: 0,
      })),
      false,
      40,
      50
    )

    expect(risultato.ordinarie).toBe(90)
    expect(risultato.supplementari).toBe(3.4)
    expect(risultato.straordinarie).toBe(0)
  })

  it('considera le ore straordinarie già separate per un full-time', () => {
    const risultato = calcolaSupplementariEStraordinarieMensili(
      [{
        data: '2026-10-01',
        causale: 'lavoro',
        ore_ordinarie: 8,
        ore_eccedenti: 0,
        ore_straordinarie: 2,
      }],
      true,
      40,
      100
    )

    expect(risultato.ordinarie).toBe(10)
    expect(risultato.supplementari).toBe(0)
    expect(risultato.straordinarie).toBe(2)
  })
})
