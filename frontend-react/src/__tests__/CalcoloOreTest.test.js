/**
 * Test per il calcolo delle ore da timbrature QR Code
 * Scenario: 08:00-18:00 con 1 ora di pausa su un giorno con 8 ore previste
 * Risultato atteso: 8 ore ordinarie + 1 ora straordinaria
 */

// Funzione estrapolata da Timesheet.jsx per il test
function calcolaOreDaTimbrature(riga, dataStr, getOrePrevistePerGiorno) {
  if (!riga.ora_ingresso || !riga.ora_uscita) {
    return null;
  }

  try {
    // Parsa gli orari (formato HH:MM:SS o HH:MM)
    const [ingressoH, ingressoM, ingressoS = '0'] = riga.ora_ingresso.split(':');
    const [uscitaH, uscitaM, uscitaS = '0'] = riga.ora_uscita.split(':');

    const ingressoTotale = parseInt(ingressoH) * 3600 + parseInt(ingressoM) * 60 + parseInt(ingressoS);
    const uscitaTotale = parseInt(uscitaH) * 3600 + parseInt(uscitaM) * 60 + parseInt(uscitaS);

    const oreLavorateTotali = (uscitaTotale - ingressoTotale) / 3600;
    const orePausa = riga.pausa_ore || 0;
    const oreNette = oreLavorateTotali - orePausa;

    // Calcola ore ordinarie e straordinarie in base al contratto
    const [y, m, d] = dataStr.split('-');
    const oreOrdinarieMax = getOrePrevistePerGiorno(parseInt(y), parseInt(m), parseInt(d));
    const oreStraordinarie = Math.max(0, Math.round((oreNette - oreOrdinarieMax) * 4) / 4);
    const oreOrdinarie = Math.min(oreNette, oreOrdinarieMax);

    return {
      ore_ordinarie: Math.round(oreOrdinarie * 4) / 4,
      ore_straordinarie: Math.round(oreStraordinarie * 4) / 4,
      ore_eccedenti: 0,
    };
  } catch (e) {
    console.error('Errore nel calcolo delle ore:', e);
    return null;
  }
}

// Mock funzione per ottenere ore previste (8 ore per giorni lavorativi)
function mockGetOrePrevistePerGiorno(anno, mese, giorno) {
  const data = new Date(anno, mese - 1, giorno);
  const giornoSettimana = data.getDay(); // 0=Dom, 1=Lun, 2=Mar, etc.
  // Lunedì-Venerdì (1-5) = 8 ore, Sabato-Domenica = 0
  return giornoSettimana >= 1 && giornoSettimana <= 5 ? 8 : 0;
}

describe('Calcolo ore da timbrature QR Code', () => {
  describe('Scenario: 08:00-18:00 con 1 ora di pausa', () => {
    it('Dovrebbe calcolare 8 ore ordinarie e 1 straordinaria con orario 8 ore previsto', () => {
      const riga = {
        ora_ingresso: '08:00:00',
        ora_uscita: '18:00:00',
        pausa_ore: 1,
        causale: 'lavoro',
        modalita_lavoro: 'in_sede',
      };

      const dataStr = '2026-07-21'; // Lunedì
      const result = calcolaOreDaTimbrature(riga, dataStr, mockGetOrePrevistePerGiorno);

      expect(result).not.toBeNull();
      expect(result.ore_ordinarie).toBe(8);
      expect(result.ore_straordinarie).toBe(1);
      expect(result.ore_eccedenti).toBe(0);
    });

    it('Dovrebbe gestire il formato HH:MM senza secondi', () => {
      const riga = {
        ora_ingresso: '08:00',
        ora_uscita: '18:00',
        pausa_ore: 1,
      };

      const dataStr = '2026-07-21';
      const result = calcolaOreDaTimbrature(riga, dataStr, mockGetOrePrevistePerGiorno);

      expect(result).not.toBeNull();
      expect(result.ore_ordinarie).toBe(8);
      expect(result.ore_straordinarie).toBe(1);
    });

    it('Dovrebbe calcolare correttamente ore nette: 10 ore - 1 pausa = 9 ore', () => {
      const riga = {
        ora_ingresso: '08:00:00',
        ora_uscita: '18:00:00',
        pausa_ore: 1,
      };

      const dataStr = '2026-07-21';
      const result = calcolaOreDaTimbrature(riga, dataStr, mockGetOrePrevistePerGiorno);

      // 10 ore totali - 1 ora pausa = 9 ore nette
      // 9 ore nette - 8 ore previste = 1 straordinaria
      expect(result.ore_ordinarie + result.ore_straordinarie).toBe(9);
    });
  });

  describe('Altri scenari', () => {
    it('Dovrebbe restituire null se manca ora_ingresso o ora_uscita', () => {
      const riga1 = { ora_ingresso: '08:00:00', pausa_ore: 1 };
      const riga2 = { ora_uscita: '18:00:00', pausa_ore: 1 };

      expect(calcolaOreDaTimbrature(riga1, '2026-07-21', mockGetOrePrevistePerGiorno)).toBeNull();
      expect(calcolaOreDaTimbrature(riga2, '2026-07-21', mockGetOrePrevistePerGiorno)).toBeNull();
    });

    it('Dovrebbe gestire il Sabato con 0 ore previste', () => {
      const riga = {
        ora_ingresso: '08:00:00',
        ora_uscita: '18:00:00',
        pausa_ore: 1,
      };

      const dataStr = '2026-07-19'; // Sabato
      const result = calcolaOreDaTimbrature(riga, dataStr, mockGetOrePrevistePerGiorno);

      // 9 ore nette, ma 0 ore previste per Sabato
      expect(result.ore_ordinarie).toBe(0);
      expect(result.ore_straordinarie).toBe(9);
    });

    it('Dovrebbe gestire pausa = 0', () => {
      const riga = {
        ora_ingresso: '08:00:00',
        ora_uscita: '16:00:00',
        pausa_ore: 0,
      };

      const dataStr = '2026-07-21';
      const result = calcolaOreDaTimbrature(riga, dataStr, mockGetOrePrevistePerGiorno);

      // 8 ore totali - 0 pausa = 8 ore nette
      expect(result.ore_ordinarie).toBe(8);
      expect(result.ore_straordinarie).toBe(0);
    });
  });
});
