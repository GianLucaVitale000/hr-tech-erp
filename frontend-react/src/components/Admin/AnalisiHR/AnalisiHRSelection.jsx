export function AnalisiHRSelection({
  dipendenti,
  dipendenteSelezionato,
  handleDipendenteChange,
  annoSelezionato,
  setAnnoSelezionato,
  annoAssunzioneSelezionato,
  annoCorrente,
  getDipendenteInfo
}) {
  return (
    <div className="analisi-hr-selection">
      <div>
        <label className="analisi-hr-label">
          Dipendente
        </label>
        <select className="analisi-hr-select"
          value={dipendenteSelezionato}
          onChange={handleDipendenteChange}
        >
          <option value="">Seleziona dipendente...</option>
          {dipendenti.map((d) => (
            <option key={d.id} value={d.id}>
              {getDipendenteInfo(d)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="analisi-hr-label">
          Periodo ({annoAssunzioneSelezionato} - {annoCorrente})
        </label>
        <select className="analisi-hr-select analisi-hr-select-small"
          value={annoSelezionato}
          onChange={(e) => setAnnoSelezionato(parseInt(e.target.value))}
          disabled={!dipendenteSelezionato}
        >
          {Array.from(
            { length: annoCorrente - annoAssunzioneSelezionato + 1 },
            (_, i) => annoAssunzioneSelezionato + i
          ).map((anno) => (
            <option key={anno} value={anno}>
              {anno}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
