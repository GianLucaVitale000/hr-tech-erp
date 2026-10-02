import { useEffect, useState, useMemo } from 'react'
import { getMioProfilo } from '../../services/dipendentiService'
import {
  getPresenze,
  salvaPresenza,
  eliminaPresenza,
  inviaMese,
  registraMalattia,
  registraCassaIntegrazione,
  uploadGiustificativoTrasferta,
  uploadGiustificativoInfortunio,
  generateQrToken,
} from '../../services/presenzeService'
import { isFoglioCompleto } from '../../utils/foglioCompleto'
import QrCodeModal from '../../components/Dipendente/QrCodeModal'
import '../../styles/dipendente-pages.css'

const CAUSALI = [
  { value: 'lavoro', label: '-- Nessuna --' },
  { value: 'ferie', label: 'Ferie' },
  { value: 'permesso_rol', label: 'Permesso/ROL' },
  { value: 'permesso_retribuito', label: 'Permessi Retribuiti (PR)' },
  { value: 'permesso_non_retribuito', label: 'Permessi Non Retribuiti (PNR)' },
  { value: 'malattia', label: 'Malattia' },
  { value: 'maternita', label: 'Maternità' },
  { value: 'infortunio', label: 'Infortunio' },
  { value: 'assemblea', label: 'Assemblea' },
  { value: 'sciopero', label: 'Sciopero' },
  { value: 'cassa_integrazione', label: 'Cassa Integrazione' },
]

const GIORNI_SETTIMANA_SHORT = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
const GIORNI_SETTIMANA_FULL = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']

const CAUSALI_CON_MODALITA = ['lavoro', 'permesso_rol', 'permesso_retribuito', 'permesso_non_retribuito', 'assemblea']

function getGiorniDelMese(mese, anno) {
  return new Date(anno, mese, 0).getDate()
}

function getNomeGiornoSettimana(anno, mese, giorno, esteso = false) {
  const data = new Date(anno, mese - 1, giorno)
  return esteso ? GIORNI_SETTIMANA_FULL[data.getDay()] : GIORNI_SETTIMANA_SHORT[data.getDay()]
}

function formattaData(dataIso) {
  if (!dataIso) return ''
  const [anno, mese, giorno] = dataIso.split('-')
  return `${giorno}/${mese}/${anno}`
}

function getDataStr(anno, mese, giorno) {
  return `${anno}-${String(mese).padStart(2, '0')}-${String(giorno).padStart(2, '0')}`
}

function CampoOre({ value, onChange, disabled, className, title, max }) {
  const [draft, setDraft] = useState(Number(value || 0).toFixed(2))

  const confermaValore = () => {
    const parsed = parseFloat(String(draft).replace(',', '.'))
    const normalized = Number.isFinite(parsed) ? parsed : 0
    setDraft(normalized.toFixed(2))
    onChange(normalized)
  }

  return (
    <input
      type="number"
      min="0"
      max={max}
      step="0.25"
      inputMode="decimal"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={confermaValore}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
      onFocus={(e) => e.currentTarget.select()}
      disabled={disabled}
      className={className}
      title={title}
    />
  )
}

function RigaGiorno({
  giorno, nomeGiorno, riga, onChange, onSalva, onElimina, salvando,
  onApriModaleMalattia, onApriModaleCassaIntegrazione, onUploadTrasferta, onUploadInfortunio, 
  onApriModaleQrSettings,
  isFullTime = false, statoFoglio = null, orariSettimanali = {}, anno, mese, disabled = false,
  isRiposo = false
}) {
  // Mostra modalità per lavoro, permessi, assemblea, OPPURE per cassa integrazione parziale (< 100%)
  const mostraModalita = CAUSALI_CON_MODALITA.includes(riga.causale) || 
                        (riga.causale === 'cassa_integrazione' && (riga.percentuale_cassa_integrazione ?? 100) < 100)
  const isMalattia = riga.causale === 'malattia'
  const isInfortunio = riga.causale === 'infortunio'
  const isTrasferta = riga.modalita_lavoro === 'trasferta'
  
  // Determina se la riga è stata salvata (ha un ID dal backend)
  const isSalvato = riga.id !== null && riga.id !== undefined
  
  // Determina lo stato del pulsante Salva in base allo stato del foglio
  const isFoglioApprovato = statoFoglio === 'approvato'
  const isFoglioInviato = statoFoglio === 'inviato'
  const isFoglioRifiutatoOReinviato = statoFoglio === 'rifiutato' || statoFoglio === 'reinviato'
  
  // Determina se i campi ore devono essere disabilitati
  // Se usa_qr è attivo MA non ci sono ancora timbrature, disabilita i campi ore
  // Se ci sono già le timbrature (ora_ingresso e/o ora_uscita), l'utente può vedere le ore calcolate
  // ma non può modificarle manualmente (verranno ricalcolate dal backend se la timbratura cambia)
  const isOreDisabled = riga.usa_qr && riga.fonte_dato === 'QR_CODE'

  const handleCausaleChange = (nuovaCausale) => {
    // 🔹 Se la causale cambia e non è 'lavoro', disattiva usa_qr
    const newRiga = { ...riga, causale: nuovaCausale }
    if (nuovaCausale !== 'lavoro') {
      newRiga.usa_qr = false
    }
    
    if (nuovaCausale === 'malattia') {
      onApriModaleMalattia(giorno)
      return
    }
    if (nuovaCausale === 'cassa_integrazione') {
      onApriModaleCassaIntegrazione(giorno)
      return
    }
    
    // Causali che sostituiscono completamente il lavoro (ore_ordinarie = 0, ore_causale = orePreviste)
    const causaliPiene = ['ferie', 'malattia', 'maternita', 'infortunio', 'cassa_integrazione']

    // Per causali piene: azzera ore_ordinarie e imposta ore_causale in base alla distribuzione oraria
    if (causaliPiene.includes(nuovaCausale) && Object.keys(orariSettimanali).length > 0) {
      const data = new Date(anno, mese - 1, giorno)
      const giornoSettimana = data.getDay()
      const orePreviste = orariSettimanali[giornoSettimana] || 0
      onChange({ ...newRiga, ore_causale: orePreviste, ore_ordinarie: 0, modalita_lavoro: null })
      return
    }

    // Per assemblea e sciopero: imposta ore_causale ma NON azzera ore_ordinarie (possono essere combinati)
    if ((nuovaCausale === 'assemblea' || nuovaCausale === 'sciopero') && Object.keys(orariSettimanali).length > 0) {
      const data = new Date(anno, mese - 1, giorno)
      const giornoSettimana = data.getDay()
      const orePreviste = orariSettimanali[giornoSettimana] || 0
      onChange({ ...newRiga, ore_causale: orePreviste, modalita_lavoro: null })
      return
    }

    // Per causali parziali (permesso_rol, permesso_retribuito, permesso_non_retribuito),
    // non azzerare ore_ordinarie: l'utente può inserire entrambi i valori
    onChange({ ...newRiga, modalita_lavoro: null })
  }

  return (
    <tr className={`rg-row ${isRiposo ? 'rg-row-riposo' : ''}`}>
      <td className="rg-cell">
        {giorno} <span className="rg-day-name">({nomeGiorno})</span>
      </td>

      <td className="rg-cell">
        <CampoOre
          key={`ordinarie-${riga.ore_ordinarie}`}
          value={riga.ore_ordinarie}
          onChange={(value) => onChange({ ...riga, ore_ordinarie: value })}
          disabled={disabled || isOreDisabled}
          className="rg-input-narrow"
          title={isOreDisabled ? 'Ore calcolate automaticamente dalle timbrature QR. Salva per aggiornare.' : ''}
        />
      </td>

      {!isFullTime && (
        <td className="rg-cell">
          <CampoOre
            key={`eccedenti-${riga.ore_eccedenti}`}
            value={riga.ore_eccedenti}
            onChange={(value) => onChange({ ...riga, ore_eccedenti: value })}
            disabled={disabled || isOreDisabled}
            className="rg-input-narrow"
            title={isOreDisabled ? 'Ore calcolate automaticamente dalle timbrature QR. Salva per aggiornare.' : 'Ore eccedenti (oltre il limite ordinario del giorno)'}
          />
        </td>
      )}

      {isFullTime && (
        <td className="rg-cell">
          <CampoOre
            key={`straordinarie-${riga.ore_straordinarie}`}
            value={riga.ore_straordinarie}
            onChange={(value) => onChange({ ...riga, ore_straordinarie: value })}
            disabled={disabled || isOreDisabled}
            className="rg-input-narrow"
            title={isOreDisabled ? 'Ore calcolate automaticamente dalle timbrature QR. Salva per aggiornare.' : ''}
          />
          {riga.ore_straordinarie > 4 && (
            <div className="rg-warning">
              Attenzione: superato limite consigliato di straordinario giornaliero
            </div>
          )}
        </td>
      )}

      <td className="rg-cell">
        <select
          value={riga.causale}
          onChange={(e) => handleCausaleChange(e.target.value)}
          disabled={disabled}
          className="rg-select"
        >
          {CAUSALI.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>

        {isMalattia && riga.protocollo_malattia && (
          <div className="rg-note">
            Prot. {riga.protocollo_malattia}<br/>
            Dal {formattaData(riga.data_inizio_malattia)} al {formattaData(riga.data_fine_malattia)}
          </div>
        )}

        {isInfortunio && (
          <div className="rg-file-wrap">
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => onUploadInfortunio(giorno, e.target.files[0])}
              className="rg-file-input"
            />
            {riga.giustificativo_infortunio_path && (
              <div className="rg-file-ok">✓ Allegato caricato</div>
            )}
          </div>
        )}
      </td>

      <td className="rg-cell">
        <input
          type="number"
          min="0"
          max="8"
          step="0.25"
          value={Number(riga.ore_causale || 0).toFixed(2)}
          onChange={(e) => onChange({ ...riga, ore_causale: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
          disabled={disabled}
          className="rg-input-narrow"
        />
      </td>

      <td className="rg-cell">
        {mostraModalita && (
          <div className="rg-modalita">
            <label>
              <input
                type="radio"
                name={`modalita-${giorno}`}
                checked={riga.modalita_lavoro === 'in_sede'}
                onChange={() => {
                  // Se cambia in 'in_sede', maintains usa_qr state
                  // Se cambia in altro, disattiva usa_qr
                  const newRiga = { ...riga, modalita_lavoro: 'in_sede' }
                  onChange(newRiga)
                }}
                disabled={disabled}
              /> In sede
            </label>
            <label>
              <input
                type="radio"
                name={`modalita-${giorno}`}
                checked={riga.modalita_lavoro === 'smart_working'}
                onChange={() => {
                  // Se cambia in 'smart_working', disattiva usa_qr
                  onChange({ ...riga, modalita_lavoro: 'smart_working', usa_qr: false })
                }}
                disabled={disabled}
              /> SW
            </label>
            <label>
              <input
                type="radio"
                name={`modalita-${giorno}`}
                checked={riga.modalita_lavoro === 'trasferta'}
                onChange={() => {
                  // Se cambia in 'trasferta', disattiva usa_qr
                  onChange({ ...riga, modalita_lavoro: 'trasferta', usa_qr: false })
                }}
                disabled={disabled}
              /> Trasferta
            </label>

            {isTrasferta && (
              <div className="rg-file-wrap">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => onUploadTrasferta(giorno, e.target.files[0])}
                  className="rg-file-input"
                />
                {riga.giustificativo_trasferta_path && (
                  <div className="rg-file-ok">✓ Allegato caricato</div>
                )}
              </div>
            )}

            {/* 🔹 Checkbox QR Code - integrato nella colonna Modalità (solo tempo pieno + causale lavoro + in_sede) */}
            {isFullTime && riga.causale === 'lavoro' && riga.modalita_lavoro === 'in_sede' && (
              <div className="rg-qr-toggle">
                <input
                  type="checkbox"
                  checked={riga.usa_qr || false}
                  onChange={(e) => {
                    const nuovaRiga = { ...riga, usa_qr: e.target.checked }
                    onChange(nuovaRiga)
                    // Se attivato, apri la modale per configurare pausa
                    if (e.target.checked) {
                      setTimeout(() => onApriModaleQrSettings(giorno), 100)
                    }
                  }}
                  disabled={disabled}
                  title="Attiva/disattiva timbratura tramite QR Code"
                  className="rg-qr-checkbox"
                />
                <span 
                  className={`rg-qr-label ${riga.usa_qr ? 'is-active' : ''} ${disabled ? 'is-blocked' : ''}`}
                  onClick={() => {
                    if (disabled) return
                    if (riga.usa_qr) {
                      onApriModaleQrSettings(giorno)
                    }
                  }}
                  title="Configura QR Code"
                >
                  QR Code
                </span>
              </div>
            )}
          </div>
        )}
      </td>



      <td className="rg-cell">
        {/* Mostra stato timbrature se usa_qr è attivo */}
        {riga.usa_qr && isSalvato && (
          <div className={`rg-qr-status ${riga.ora_ingresso && riga.ora_uscita ? 'is-complete' : 'is-waiting'}`}>
            {riga.ora_ingresso && riga.ora_uscita && (
              <span>In: {riga.ora_ingresso}<br/>Out: {riga.ora_uscita}</span>
            )}
            {riga.ora_ingresso && !riga.ora_uscita && (
              <span>In: {riga.ora_ingresso}<br/>Out: --:--</span>
            )}
            {!riga.ora_ingresso && (
              <span>In: --:--<br/>Out: --:--</span>
            )}
          </div>
        )}
        
        <button
          onClick={onSalva}
          disabled={salvando || isFoglioApprovato || isSalvato || (isFoglioInviato && isSalvato) || disabled}
          className={`rg-btn-save ${(isFoglioApprovato || disabled || isSalvato) ? 'is-disabled' : ''}`}
          title={disabled ? 'Non puoi salvare: contratto scaduto' : (isFoglioApprovato || isSalvato) ? (isFoglioApprovato ? 'Foglio approvato. Non è possibile modificare.' : 'Riga già salvata. Non è possibile modificare.') : (isFoglioInviato ? 'Foglio inviato. Non è possibile modificare.' : '')}
        >
          {salvando ? '...' : (isFoglioRifiutatoOReinviato ? 'Salva' : (isSalvato ? '✓ Salvato' : 'Salva'))}
        </button>

        {isSalvato && !isFoglioApprovato && !disabled && (
          <button
            onClick={onElimina}
            disabled={salvando}
            className="rg-btn-delete"
            title="Elimina presenza e resetta riga"
          >
            Reset
          </button>
        )}
        
      </td>
    </tr>
  )
}

function ModaleMalattia({ dataInizio, onConferma, onAnnulla }) {
  const [dataFine, setDataFine] = useState(dataInizio)
  const [protocollo, setProtocollo] = useState('')

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h3 className="modal-h3">Registra periodo di malattia</h3>

        <div className="modal-field">
          <label>dal </label>
          <input type="date" value={dataInizio} disabled className="modal-input" />
        </div>

        <div className="modal-field">
          <label>al </label>
          <input
            type="date"
            value={dataFine}
            min={dataInizio}
            onChange={(e) => setDataFine(e.target.value)}
            className="modal-input"
          />
        </div>

        <div className="modal-field-last">
          <label>Numero protocollo certificato </label>
          <input
            type="text"
            value={protocollo}
            onChange={(e) => setProtocollo(e.target.value)}
            placeholder="es. INPS-2026-XXXXX"
            className="modal-input"
          />
        </div>

        <div className="modal-actions">
          <button onClick={onAnnulla} className="btn btn-secondary">
            Annulla
          </button>
          <button
            onClick={() => onConferma(dataFine, protocollo)}
            disabled={!protocollo}
            className="btn btn-primary"
          >
            Conferma
          </button>
        </div>
      </div>
    </div>
  )
}

function ModaleCassaIntegrazione({ dataInizio, onConferma, onAnnulla }) {
  const [dataFine, setDataFine] = useState(dataInizio)
  const [percentuale, setPercentuale] = useState(100)

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h3 className="modal-h3">Registra periodo di CIG</h3>

        <div className="modal-field">
          <label>dal </label>
          <input type="date" value={dataInizio} disabled className="modal-input" />
        </div>

        <div className="modal-field">
          <label>al </label>
          <input
            type="date"
            value={dataFine}
            min={dataInizio}
            onChange={(e) => setDataFine(e.target.value)}
            className="modal-input"
          />
        </div>

        <div className="modal-field-last">
          <label>Percentuale (%) </label>
          <input
            type="number"
            value={percentuale}
            min="0"
            max="100"
            onChange={(e) => setPercentuale(parseInt(e.target.value) || 0)}
            className="modal-input"
          />
        </div>

        <div className="modal-actions">
          <button onClick={onAnnulla} className="btn btn-secondary">
            Annulla
          </button>
          <button
            onClick={() => onConferma(dataFine, percentuale)}
            disabled={percentuale <= 0 || percentuale > 100}
            className="btn btn-primary"
          >
            Conferma
          </button>
        </div>
      </div>
    </div>
  )
}

function ModaleQrSettings({
  riga, 
  onChange, 
  onGenerateQr, 
  onClose,
  onRefresh,
  disabled,
  dataStr
}) {
  // Calcola isSalvato internamente in base a riga.id
  const isSalvato = riga.id !== null && riga.id !== undefined

  const handlePausaChange = (value) => {
    onChange({ ...riga, pausa_ore: value === '' ? 0 : parseFloat(value) })
  }

  return (
    <div className="modal-overlay modal-overlay-top" onClick={(e) => {
      if (e.target === e.currentTarget) {
        onClose()
      }
    }}>
      <div className="modal-box modal-box-wide">
        <div className="modal-header">
          <h3 className="modal-title">Configurazione QR Code</h3>
          <button 
            onClick={onClose} 
            className="modal-close"
            title="Chiudi"
          >
            ×
          </button>
        </div>

        <div className="modal-field-last">
          <label className="modal-label-light">
            pausa non retribuita
          </label>
          <input
            type="number"
            min="0"
            max="8"
            step="0.25"
            value={Number(riga.pausa_ore || 0).toFixed(2)}
            onChange={(e) => handlePausaChange(e.target.value)}
            disabled={disabled}
            className="modal-input-dark"
            title="Ore di pausa (saranno sottratte dal totale)"
          />
          <p className="modal-hint">
            La pausa sarà sottratta dal totale calcolato
          </p>
        </div>

        {/* Pulsante Kiosk - sempre visibile */}
        <div className="modal-field-last">
          <button
            onClick={() => onGenerateQr && onGenerateQr(dataStr)}
            disabled={disabled}
            className="btn btn-kiosk"
            title="Apri kiosk per timbrare con QR Code"
          >
            Scansiona il QR code
          </button>
        </div>

        {/* Mostra stato timbrature */}
        {isSalvato && (
          <div className="modal-field">
            {riga.ora_ingresso && !riga.ora_uscita && (
              <div className="qr-status qr-status-waiting">
                ⏳ Ingresso: {riga.ora_ingresso} - Uscita: in attesa
              </div>
            )}
            {riga.ora_ingresso && riga.ora_uscita && (
              <div className="qr-status qr-status-complete">
                ✓ Ingresso: {riga.ora_ingresso} - Uscita: {riga.ora_uscita}
                {riga.ore_ordinarie && (
                  <div className="qr-status-detail">
                    Ore ordinarie: {Number(riga.ore_ordinarie).toFixed(2)} h
                    {riga.ore_straordinarie > 0 && (
                      <span>, Straordinarie: {Number(riga.ore_straordinarie).toFixed(2)} h</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="modal-actions modal-actions-top">
          {isSalvato && onRefresh && (
            <button 
              onClick={() => {
                // Ricarica la riga dal backend per vedere gli aggiornamenti
                onRefresh && onRefresh(dataStr)
              }} 
              className="btn btn-primary"
              title="Ricarica i dati dal server per vedere gli aggiornamenti delle timbrature"
            >
              Verifica timbratura
            </button>
          )}
        </div>
      </div>
    </div>
  )
}


function CardGiorno({
  giorno,
  nomeGiorno,
  nomeMese,
  riga,
  onChange,
  onSalva,
  onElimina,
  salvando,
  onApriModaleMalattia,
  onApriModaleCassaIntegrazione,
  onUploadTrasferta,
  onUploadInfortunio,
  onApriModaleQrSettings,
  isFullTime,
  statoFoglio,
  orariSettimanali,
  anno,
  mese,
  disabled,
  isRiposo = false
}) {
  const mostraModalita = CAUSALI_CON_MODALITA.includes(riga.causale) ||
                        (riga.causale === 'cassa_integrazione' && (riga.percentuale_cassa_integrazione ?? 100) < 100)
  const isMalattia = riga.causale === 'malattia'
  const isInfortunio = riga.causale === 'infortunio'
  const isTrasferta = riga.modalita_lavoro === 'trasferta'
  const isSalvato = riga.id !== null && riga.id !== undefined
  const isFoglioApprovato = statoFoglio === 'approvato'
  const isFoglioInviato = statoFoglio === 'inviato'
  const isFoglioRifiutatoOReinviato = statoFoglio === 'rifiutato' || statoFoglio === 'reinviato'
  const isOreDisabled = riga.usa_qr && riga.fonte_dato === 'QR_CODE'

  const handleCausaleChange = (nuovaCausale) => {
    const newRiga = { ...riga, causale: nuovaCausale }
    if (nuovaCausale !== 'lavoro') {
      newRiga.usa_qr = false
    }
    
    if (nuovaCausale === 'malattia') {
      onApriModaleMalattia(giorno)
      return
    }
    if (nuovaCausale === 'cassa_integrazione') {
      onApriModaleCassaIntegrazione(giorno)
      return
    }
    
    const causaliPiene = ['ferie', 'malattia', 'maternita', 'infortunio', 'sciopero', 'cassa_integrazione']
    
    if (causaliPiene.includes(nuovaCausale) && Object.keys(orariSettimanali).length > 0) {
      const data = new Date(anno, mese - 1, giorno)
      const giornoSettimana = data.getDay()
      const orePreviste = orariSettimanali[giornoSettimana] || 0
      onChange({ ...newRiga, ore_causale: orePreviste, ore_ordinarie: 0, modalita_lavoro: null })
      return
    }
    
    if (nuovaCausale === 'assemblea' && Object.keys(orariSettimanali).length > 0) {
      const data = new Date(anno, mese - 1, giorno)
      const giornoSettimana = data.getDay()
      const orePreviste = orariSettimanali[giornoSettimana] || 0
      onChange({ ...newRiga, ore_causale: orePreviste, modalita_lavoro: null })
      return
    }
    
    onChange({ ...newRiga, modalita_lavoro: null })
  }

  return (
    <div className={`card-giorno ${isRiposo ? 'card-giorno-riposo' : ''}`}>
      {/* Header con data */}
      <div className="card-giorno-header">
        <div className="card-giorno-date">{giorno} {nomeMese}</div>
        <div className="card-giorno-dayname">{nomeGiorno}</div>
      </div>

      {/* Campo Ore Ordinarie */}
      <div className="card-field">
        <label className="card-label">Ore Ordinarie</label>
        <CampoOre
          key={`mobile-ordinarie-${riga.ore_ordinarie}`}
          value={riga.ore_ordinarie}
          onChange={(value) => onChange({ ...riga, ore_ordinarie: value })}
          disabled={disabled || isOreDisabled}
          className="card-input"
        />
      </div>

      {/* Campo Ore */}
      {!isFullTime && (
        <div className="card-field">
          <label className="card-label">Ore Eccedenti</label>
          <CampoOre
            key={`mobile-eccedenti-${riga.ore_eccedenti}`}
            value={riga.ore_eccedenti}
            onChange={(value) => onChange({ ...riga, ore_eccedenti: value })}
            disabled={disabled || isOreDisabled}
            className="card-input"
          />
        </div>
      )}

      {isFullTime && (
        <div className="card-field">
          <label className="card-label">Ore Straordinarie</label>
          <CampoOre
            key={`mobile-straordinarie-${riga.ore_straordinarie}`}
            value={riga.ore_straordinarie}
            onChange={(value) => onChange({ ...riga, ore_straordinarie: value })}
            disabled={disabled || isOreDisabled}
            className="card-input"
          />
        </div>
      )}

      {/* Causale */}
      <div className="card-field">
        <label className="card-label">Causale (altro da Lavoro)</label>
        <select
          value={riga.causale}
          onChange={(e) => handleCausaleChange(e.target.value)}
          disabled={disabled}
          className="card-select"
        >
          {CAUSALI.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>

        {isMalattia && riga.protocollo_malattia && (
          <div className="card-note">
            Prot. {riga.protocollo_malattia}<br/>
            Dal {formattaData(riga.data_inizio_malattia)} al {formattaData(riga.data_fine_malattia)}
          </div>
        )}

        {isInfortunio && (
          <div className="card-subfield">
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => onUploadInfortunio(giorno, e.target.files[0])}
              className="card-file-input"
            />
            {riga.giustificativo_infortunio_path && (
              <div className="card-file-ok">✓ Allegato caricato</div>
            )}
          </div>
        )}
      </div>

      {/* Ore Causale */}
      <div className="card-field">
        <label className="card-label">Ore Causale</label>
        <input
          type="number"
          min="0"
          max="8"
          step="0.25"
          value={Number(riga.ore_causale || 0).toFixed(2)}
          onChange={(e) => onChange({ ...riga, ore_causale: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
          disabled={disabled}
          className="card-input card-input-causale"
        />
      </div>

      {/* Modalità */}
      {mostraModalita && (
        <div className="card-field">
          <label className="card-label card-label-spaced">Modalità</label>
          
          <div className="card-mode-row">
            <label className={`card-mode-btn ${riga.modalita_lavoro === 'in_sede' ? 'is-active' : ''} ${disabled ? 'is-blocked' : ''}`}>
              <input
                type="radio"
                name={`modalita-mobile-${giorno}`}
                checked={riga.modalita_lavoro === 'in_sede'}
                onChange={() => onChange({ ...riga, modalita_lavoro: 'in_sede' })}
                disabled={disabled}
                className="card-mode-radio-hidden"
              />
              In sede
            </label>
            <label className={`card-mode-btn ${riga.modalita_lavoro === 'smart_working' ? 'is-active' : ''} ${disabled ? 'is-blocked' : ''}`}>
              <input
                type="radio"
                name={`modalita-mobile-${giorno}`}
                checked={riga.modalita_lavoro === 'smart_working'}
                onChange={() => onChange({ ...riga, modalita_lavoro: 'smart_working', usa_qr: false })}
                disabled={disabled}
                className="card-mode-radio-hidden"
              />
              SW
            </label>
            <label className={`card-mode-btn ${riga.modalita_lavoro === 'trasferta' ? 'is-active' : ''} ${disabled ? 'is-blocked' : ''}`}>
              <input
                type="radio"
                name={`modalita-mobile-${giorno}`}
                checked={riga.modalita_lavoro === 'trasferta'}
                onChange={() => onChange({ ...riga, modalita_lavoro: 'trasferta', usa_qr: false })}
                disabled={disabled}
                className="card-mode-radio-hidden"
              />
              Trasferta
            </label>
          </div>

          {isTrasferta && (
            <div className="card-subfield">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => onUploadTrasferta(giorno, e.target.files[0])}
                className="card-file-input"
              />
              {riga.giustificativo_trasferta_path && (
                <div className="card-file-ok">✓ Allegato caricato</div>
              )}
            </div>
          )}

          {/* QR Code Checkbox */}
          {isFullTime && riga.causale === 'lavoro' && riga.modalita_lavoro === 'in_sede' && (
            <div className="card-qr-row">
              <input
                type="checkbox"
                checked={riga.usa_qr || false}
                onChange={(e) => {
                  const nuovaRiga = { ...riga, usa_qr: e.target.checked }
                  onChange(nuovaRiga)
                  if (e.target.checked) {
                    setTimeout(() => onApriModaleQrSettings(giorno), 100)
                  }
                }}
                disabled={disabled}
                id={`qr-checkbox-mobile-${giorno}`}
              />
              <label 
                htmlFor={`qr-checkbox-mobile-${giorno}`}
                className={`card-qr-label ${riga.usa_qr ? 'is-active' : ''} ${disabled ? 'is-blocked' : ''}`}
              >
                QR Code
              </label>
            </div>
          )}
        </div>
      )}

      {/* Stato timbrature QR */}
      {riga.usa_qr && isSalvato && (
        <div className={`card-qr-status ${riga.ora_ingresso && riga.ora_uscita ? 'is-complete' : 'is-waiting'}`}>
          {riga.ora_ingresso && riga.ora_uscita && (
            <span>In: {riga.ora_ingresso} - Out: {riga.ora_uscita}</span>
          )}
          {riga.ora_ingresso && !riga.ora_uscita && (
            <span>In: {riga.ora_ingresso} - Out: --:--</span>
          )}
          {!riga.ora_ingresso && (
            <span>In: --:-- - Out: --:--</span>
          )}
        </div>
      )}

      {/* Pulsante Salva */}
      <button
        onClick={onSalva}
        disabled={salvando || isFoglioApprovato || isSalvato || (isFoglioInviato && isSalvato) || disabled}
        className={`card-btn-save ${(isFoglioApprovato || disabled || isSalvato) ? 'is-disabled' : ''}`}
      >
        {salvando ? '...' : (isFoglioRifiutatoOReinviato ? 'Salva' : (isSalvato ? '✓ Salvato' : 'Salva'))}
      </button>

      {isSalvato && !isFoglioApprovato && !disabled && (
        <button
          onClick={onElimina}
          disabled={salvando}
          className="card-btn-delete"
          title="Elimina presenza e resetta riga"
        >
          Reset
        </button>
      )}
    </div>
  )
}
function Timesheet() {
  const oggi = new Date()
  const [mese, setMese] = useState(oggi.getMonth() + 1)
  const [anno, setAnno] = useState(oggi.getFullYear())
  const [dipendente, setDipendente] = useState(null)
  const [righe, setRighe] = useState({})
  const [salvataggioInCorso, setSalvataggioInCorso] = useState(null)
  const [loading, setLoading] = useState(true)
  const [messaggio, setMessaggio] = useState('')
  const [errore, setErrore] = useState('')
  const [modaleMalattiaGiorno, setModaleMalattiaGiorno] = useState(null)
  const [modaleCassaIntegrazioneGiorno, setModaleCassaIntegrazioneGiorno] = useState(null)
  const [modaleQrSettingsGiorno, setModaleQrSettingsGiorno] = useState(null)
  const [statoFoglio, setStatoFoglio] = useState(null)
  const [orariSettimanali, setOrariSettimanali] = useState({})
  // 🔹 States per QR Code
  const [showQrModal, setShowQrModal] = useState(false)
  const [qrToken, setQrToken] = useState('')
  const [giornoSelezionato, setGiornoSelezionato] = useState(oggi.getDate())
  const [selectedPresence, setSelectedPresence] = useState(null)

  // 🔹 Funzione per calcolare le ore lavorate da ora_ingresso e ora_uscita
  const calcolaOreDaTimbrature = (riga, dataStr) => {
    if (!riga.ora_ingresso || !riga.ora_uscita) {
      return null
    }
    
    try {
      // Parsa gli orari (formato HH:MM:SS o HH:MM)
      const [ingressoH, ingressoM, ingressoS = '0'] = riga.ora_ingresso.split(':')
      const [uscitaH, uscitaM, uscitaS = '0'] = riga.ora_uscita.split(':')
      
      const ingressoTotale = parseInt(ingressoH) * 3600 + parseInt(ingressoM) * 60 + parseInt(ingressoS)
      const uscitaTotale = parseInt(uscitaH) * 3600 + parseInt(uscitaM) * 60 + parseInt(uscitaS)
      
      const oreLavorateTotali = (uscitaTotale - ingressoTotale) / 3600
      const orePausa = riga.pausa_ore || 0
      const oreNette = oreLavorateTotali - orePausa
      
      // Calcola ore ordinarie e straordinarie in base al contratto
      const [y, m, d] = dataStr.split('-')
      const oreOrdinarieMax = getOrePrevistePerGiorno(parseInt(y), parseInt(m), parseInt(d))
      const oreStraordinarie = Math.max(0, Math.round((oreNette - oreOrdinarieMax) * 100) / 100)
      const oreOrdinarie = Math.min(oreNette, oreOrdinarieMax)
      
      return {
        ore_ordinarie: Math.round(oreOrdinarie * 100) / 100,
        ore_straordinarie: oreStraordinarie,
        ore_eccedenti: 0
      }
    } catch (e) {
      console.error('Errore nel calcolo delle ore:', e)
      return null
    }
  }

  const NOMI_MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']

  const normalizzaRiga = (p = {}) => {
    // Normalizza la data: se è una stringa con orario, estrai solo la parte data
    let dataNormalizzata = p.data;
    if (typeof dataNormalizzata === 'string' && dataNormalizzata.includes(' ')) {
      dataNormalizzata = dataNormalizzata.split(' ')[0];
    }
    
    // Arrotonda tutti i valori numerici a 2 decimali per evitare problemi di floating-point
    const round2 = (val) => {
      if (val === null || val === undefined) return 0;
      if (typeof val === 'string') {
        val = val.replace(',', '.');
      }
      const num = parseFloat(val);
      return isNaN(num) ? 0 : Math.round(num * 100) / 100;
    };
    
    return {
      data: dataNormalizzata,
      ore_ordinarie: round2(p.ore_ordinarie),
      ore_eccedenti: round2(p.ore_eccedenti),
      ore_straordinarie: round2(p.ore_straordinarie),
      ore_causale: round2(p.ore_causale),
      causale: p.causale || 'lavoro',
      modalita_lavoro: p.modalita_lavoro || null,
      giustificativo_trasferta_path: p.giustificativo_trasferta_path || null,
      giustificativo_infortunio_path: p.giustificativo_infortunio_path || null,
      protocollo_malattia: p.protocollo_malattia || null,
      data_inizio_malattia: p.data_inizio_malattia || null,
      data_fine_malattia: p.data_fine_malattia || null,
      data_inizio_cassa_integrazione: p.data_inizio_cassa_integrazione || null,
      data_fine_cassa_integrazione: p.data_fine_cassa_integrazione || null,
      percentuale_cassa_integrazione: p.percentuale_cassa_integrazione || null,
      id: p.id || null,
      warning: p.warning || null,
      // 🔹 Nuovi campi per QR Code
      usa_qr: p.usa_qr || false,
      pausa_ore: round2(p.pausa_ore),
      ora_ingresso: p.ora_ingresso || null,
      ora_uscita: p.ora_uscita || null,
      fonte_dato: p.fonte_dato || 'MANUALE',
    };
  }

useEffect(() => {
  getMioProfilo().then((res) => {
    const profilo = res.data
    setDipendente(profilo)
    // Estrae gli orari settimanali in un oggetto indexato per giorno_settimana
    // Laravel restitusce la relazione in snake_case: orari_settimanali
    const orariMap = {}
    if (profilo.orari_settimanali && profilo.orari_settimanali.length > 0) {
      profilo.orari_settimanali.forEach(o => {
        orariMap[o.giorno_settimana] = parseFloat(o.ore_giornaliere_previste) || 0
      })
    }
    setOrariSettimanali(orariMap)
  })
}, [])

useEffect(() => {
  if (dipendente) {
    const fetchPresenze = async () => {
      setLoading(true)
      setSalvataggioInCorso(null)
      const res = await getPresenze(dipendente.id, mese, anno)
      const mappa = {}
      let statoDelMese = null
      res.data.forEach((p) => {
        mappa[p.data] = normalizzaRiga(p)
        if (p.stato) {
          statoDelMese = p.stato
        }
      })
      setRighe(mappa)
      setStatoFoglio(statoDelMese)
      setLoading(false)
    }
    fetchPresenze()
  }
}, [dipendente, mese, anno])

// Reset salvataggioInCorso quando il foglio cambia stato
useEffect(() => {
  if (statoFoglio === 'rifiutato' || statoFoglio === 'reinviato' || statoFoglio === 'inviato') {
    setTimeout(() => setSalvataggioInCorso(null), 0)
  }
}, [statoFoglio])

  const giorni = Array.from(
    { length: getGiorniDelMese(mese, anno) },
    (_, i) => i + 1
  )

  const getRiga = (dataStr) => righe[dataStr] || normalizzaRiga({ data: dataStr })

  const handleChange = (dataStr, nuovaRiga) => {
    const normalizza = (val) => {
      if (typeof val === 'string') {
        val = val.replace(',', '.');
      }
      const num = parseFloat(val)
      return isNaN(num) ? 0 : num
    }
    
    // Applica normalizzazione a tutti i campi numerici
    nuovaRiga = {
      ...nuovaRiga,
      ore_ordinarie: normalizza(nuovaRiga.ore_ordinarie),
      ore_straordinarie: normalizza(nuovaRiga.ore_straordinarie),
      ore_eccedenti: normalizza(nuovaRiga.ore_eccedenti),
      ore_causale: normalizza(nuovaRiga.ore_causale),
    }
    
    // 🔹 Se usa QR e ha entrambi gli orari, calcola automaticamente le ore
    if (nuovaRiga.usa_qr && nuovaRiga.ora_ingresso && nuovaRiga.ora_uscita && 
        Object.keys(orariSettimanali).length > 0) {
      const calcolate = calcolaOreDaTimbrature(nuovaRiga, dataStr)
      if (calcolate) {
        nuovaRiga = {
          ...nuovaRiga,
          ...calcolate
        }
      }
    }
    
    if (nuovaRiga.usa_qr && !nuovaRiga.fonte_dato) {
      nuovaRiga.fonte_dato = 'QR_CODE'
    }
    if (!nuovaRiga.usa_qr && nuovaRiga.fonte_dato === 'QR_CODE') {
      nuovaRiga.fonte_dato = 'MANUALE'
    }
    
    // Gestione automatica e SPLIT delle ore ordinarie eccedenti il limite giornaliero
    {
      const [y, m, d] = dataStr.split('-')
      const oreOrdinarieMax = getOrePrevistePerGiorno(parseInt(y), parseInt(m), parseInt(d))
      
      const oreOrdinarie = nuovaRiga.ore_ordinarie || 0
      const causale = nuovaRiga.causale || 'lavoro'
      
      if (causale === 'lavoro' && oreOrdinarieMax > 0 && oreOrdinarie > oreOrdinarieMax) {
        const oreEccedenti = Math.round((oreOrdinarie - oreOrdinarieMax) * 100) / 100
        nuovaRiga.ore_ordinarie = oreOrdinarieMax
        nuovaRiga.ore_causale = 0
        if (isFullTime) {
          nuovaRiga.ore_straordinarie = oreEccedenti
        } else {
          nuovaRiga.ore_eccedenti = (nuovaRiga.ore_eccedenti || 0) + oreEccedenti
        }
      }
    }
    
    setRighe((prev) => ({ ...prev, [dataStr]: nuovaRiga }))
  }

  const handleSalva = async (dataStr) => {
    setSalvataggioInCorso(dataStr)
    setErrore('')

    try {
      const riga = getRiga(dataStr)
      
      // Validazione: se la causale richiede modalità di lavoro, verificare che sia specificata
      const causaleRichiedeModalita = CAUSALI_CON_MODALITA.includes(riga.causale) || 
                                        (riga.causale === 'cassa_integrazione' && (riga.percentuale_cassa_integrazione ?? 100) < 100)
      if (causaleRichiedeModalita && !riga.modalita_lavoro) {
        setSalvataggioInCorso(null)
        alert('Attenzione: per questa causale è obbligatorio specificare una modalità di lavoro (In sede, SW o Trasferta)')
        return
      }
      
      // Validazione frontend per causali con ore_causale: limite basato sulla distribuzione oraria settimanale
      // Controlla che la somma di ore_ordinarie + ore_causale non superi le ore previste
      // Escludi 'lavoro' e 'assemblea' (per assemblea, l'eccedenza va in ore_eccedenti)
      if (riga.causale !== 'lavoro' && riga.causale !== 'assemblea' && Object.keys(orariSettimanali).length > 0) {
        const [y, m, d] = dataStr.split('-')
        const orePreviste = getOrePrevistePerGiorno(parseInt(y), parseInt(m), parseInt(d))
        const oreOrdinarie = parseFloat(riga.ore_ordinarie) || 0
        const oreCausale = parseFloat(riga.ore_causale) || 0
        const totaleOre = oreOrdinarie + oreCausale
        
        if (totaleOre > orePreviste) {
          setSalvataggioInCorso(null)
          alert(`Attenzione: la somma di ore ordinarie (${oreOrdinarie}) e ore causale (${oreCausale}) non può superare ${orePreviste} ore previste per questo giorno secondo la tua distribuzione oraria settimanale. Causale: ${riga.causale}`)
          return
        }
      }
      
      // Per part-time, non inviare ore_eccedenti in modo che il backend possa calcolarlo
      const payload = {
        dipendente_id: dipendente.id,
        data: dataStr,
        ore_ordinarie: parseFloat(riga.ore_ordinarie) || 0,
        ore_straordinarie: parseFloat(riga.ore_straordinarie) || 0,
        ore_causale: parseFloat(riga.ore_causale) || 0,
        ore_eccedenti: parseFloat(riga.ore_eccedenti) || 0,
        causale: riga.causale,
        modalita_lavoro: riga.modalita_lavoro,
        // 🔹 Campi QR Code
        usa_qr: riga.usa_qr || false,
        pausa_ore: riga.pausa_ore || 0,
        ora_ingresso: riga.ora_ingresso || null,
        ora_uscita: riga.ora_uscita || null,
        fonte_dato: riga.fonte_dato || 'MANUALE',
        // Preserva campi specifici per non perderli durante l'aggiornamento
        protocollo_malattia: riga.protocollo_malattia || null,
        data_inizio_malattia: riga.data_inizio_malattia || null,
        data_fine_malattia: riga.data_fine_malattia || null,
        data_inizio_cassa_integrazione: riga.data_inizio_cassa_integrazione || null,
        data_fine_cassa_integrazione: riga.data_fine_cassa_integrazione || null,
        percentuale_cassa_integrazione: riga.percentuale_cassa_integrazione || null,
        giustificativo_trasferta_path: riga.giustificativo_trasferta_path || null,
        giustificativo_infortunio_path: riga.giustificativo_infortunio_path || null,
      }

      await salvaPresenza(payload)
      // Ricarica tutte le presenze per avere i dati aggiornati dal backend
      const resPresenze = await getPresenze(dipendente.id, mese, anno)
      const mappa = {}
      resPresenze.data.forEach((p) => {
        mappa[p.data] = normalizzaRiga(p)
      })
      setRighe(mappa)
    } catch (error) {
      const errorMessage = error.response?.data?.message || 
                           error.response?.data?.error ||
                           'Errore nel salvataggio. Verifica i dati inseriti.'
      setErrore(errorMessage)
      setTimeout(() => setErrore(''), 5000)
    } finally {
      setSalvataggioInCorso(null)
    }
  }

  const handleElimina = async (dataStr) => {
    const riga = getRiga(dataStr)

    if (!riga.id) {
      // Resetta immediatamente i valori nel frontend se non ha ID
      setRighe((prev) => ({
        ...prev,
        [dataStr]: normalizzaRiga({ data: dataStr })
      }))
      return
    }

    if (!window.confirm('Sei sicuro di voler eliminare/resettare questa presenza salvata?')) {
      return
    }

    // Resetta immediatamente i valori nel frontend (stato locale) per azzerare i campi della riga visivamente
    setRighe((prev) => ({
      ...prev,
      [dataStr]: normalizzaRiga({ data: dataStr })
    }))

    setSalvataggioInCorso(dataStr)
    setErrore('')

    try {
      await eliminaPresenza(riga.id)
      // Rimuovi esplicitamente la riga dallo stato locale senza sovrascriverla con dati obsoleti dal server
      setRighe((prev) => {
        const nuovo = { ...prev }
        delete nuovo[dataStr]
        return nuovo
      })
      setMessaggio(`Presenza del ${dataStr} eliminata con successo`)
      setTimeout(() => setMessaggio(''), 3000)
    } catch (error) {
      const errorMessage = error.response?.data?.message || 
                           error.response?.data?.error ||
                           'Errore durante l\'eliminazione della presenza.'
      setErrore(errorMessage)
      setTimeout(() => setErrore(''), 5000)
    } finally {
      setSalvataggioInCorso(null)
    }
  }

  const handleApriModaleMalattia = (giorno) => {
    setModaleMalattiaGiorno(giorno)
  }

  const handleConfermaMalattia = async (dataFine, protocollo) => {
    const dataInizioStr = getDataStr(anno, mese, modaleMalattiaGiorno)
    await registraMalattia(dipendente.id, dataInizioStr, dataFine, protocollo)
    setModaleMalattiaGiorno(null)

    const res = await getPresenze(dipendente.id, mese, anno)
    const mappa = {}
    res.data.forEach((p) => {
      mappa[p.data] = normalizzaRiga(p)
    })
    setRighe(mappa)
  }

  const handleApriModaleCassaIntegrazione = (giorno) => {
    setModaleCassaIntegrazioneGiorno(giorno)
  }

  const handleConfermaCassaIntegrazione = async (dataFine, percentuale) => {
    const dataInizioStr = getDataStr(anno, mese, modaleCassaIntegrazioneGiorno)
    await registraCassaIntegrazione(dipendente.id, dataInizioStr, dataFine, percentuale)
    setModaleCassaIntegrazioneGiorno(null)

    const res = await getPresenze(dipendente.id, mese, anno)
    const mappa = {}
    res.data.forEach((p) => {
      mappa[p.data] = normalizzaRiga(p)
    })
    setRighe(mappa)
  }

  const handleUploadTrasferta = async (giorno, file) => {
    const dataStr = getDataStr(anno, mese, giorno)
    const riga = getRiga(dataStr)
    if (!riga.id) {
      alert('Salva prima la riga prima di caricare il giustificativo.')
      return
    }
    const res = await uploadGiustificativoTrasferta(riga.id, file)
    setRighe((prev) => ({ ...prev, [dataStr]: normalizzaRiga(res.data) }))
  }

  const handleUploadInfortunio = async (giorno, file) => {
    const dataStr = getDataStr(anno, mese, giorno)
    const riga = getRiga(dataStr)
    if (!riga.id) {
      alert('Salva prima la riga prima di caricare il giustificativo.')
      return
    }
    const res = await uploadGiustificativoInfortunio(riga.id, file)
    setRighe((prev) => ({ ...prev, [dataStr]: normalizzaRiga(res.data) }))
  }

  const handleApriModaleQrSettings = (giorno) => {
    setModaleQrSettingsGiorno(giorno)
  }

  const handleChiudiModaleQrSettings = () => {
    setModaleQrSettingsGiorno(null)
  }

  // 🔹 Funzione per ricaricare una singola riga dal backend
  const handleRefreshRiga = async (dataStr) => {
    try {
      const res = await getPresenze(dipendente.id, mese, anno)
      const mappa = {}
      res.data.forEach((p) => {
        mappa[p.data] = normalizzaRiga(p)
      })
      // Mostra messaggio di aggiornamento
      const rigaAggiornata = mappa[dataStr]
      if (rigaAggiornata) {
        setRighe(mappa)
        setMessaggio(`Dati aggiornati per il ${dataStr}`)
        setTimeout(() => setMessaggio(''), 3000)
      }
    } catch (error) {
      setErrore(error.message || 'Errore nel ricaricare i dati')
      setTimeout(() => setErrore(''), 3000)
    }
  }

  // 🔹 Funzione per generare QR Code
  const handleGenerateQr = async (dataStr) => {
    const riga = getRiga(dataStr)
    
    // Se la riga non ha un ID, salvala prima automaticamente
    let presenzaId = riga.id
    if (!presenzaId) {
      try {
        // Crea un payload minimo per salvare la riga
        // Tutti i campi ore sono richiesti dal database (non nullable)
        const payload = {
          dipendente_id: dipendente.id,
          data: dataStr,
          ore_ordinarie: 0,
          ore_straordinarie: 0,
          ore_eccedenti: 0,
          ore_causale: 0,
          causale: riga.causale || 'lavoro',
          modalita_lavoro: riga.modalita_lavoro || 'in_sede',
          usa_qr: true,
          pausa_ore: riga.pausa_ore || 0,
          fonte_dato: 'QR_CODE',
        }
        
        const response = await salvaPresenza(payload)
        presenzaId = response.data.id
        
        // Aggiorna lo stato locale con la riga salvata
        setRighe((prev) => ({
          ...prev,
          [dataStr]: normalizzaRiga(response.data)
        }))
        
        // Aspetta un po' per assicurarsi che lo stato sia aggiornato
        await new Promise(resolve => setTimeout(resolve, 300))
        
      } catch (error) {
        const errorMessage = error.response?.data?.message || 
                           error.response?.data?.error ||
                           'Errore nel salvare la riga'
        alert('Errore nel salvare la riga: ' + errorMessage)
        return
      }
    }
    
    // Ora abbiamo l'ID, generiamo il token
    try {
      const token = await generateQrToken(presenzaId)
      setQrToken(token)
      setSelectedPresence(getRiga(dataStr))
      setShowQrModal(true)
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Errore nella generazione del QR Code'
      alert(errorMessage)
    }
  }

  // 🔹 Validazione completezza foglio (memoizzata — prima dell'early return)
  const foglioCompletoInfo = useMemo(() => {
    if (!dipendente) {
      return { completo: false, message: 'Anagrafica dipendente mancante' }
    }
    return isFoglioCompleto(dipendente, anno, mese, giorni, righe)
  }, [dipendente, anno, mese, giorni, righe])

  // Funzione per verificare se il dipendente può inserire presenze
  const puoInserirePresenze = () => {
    if (!dipendente) return true
    const tipoContratto = dipendente.tipo_contratto
    const dataScadenza = dipendente.data_scadenza_contratto
    if (!dataScadenza && tipoContratto === 'indeterminato') return true
    if (dataScadenza) {
      const scadenzaDate = new Date(dataScadenza)
      const inizioMeseSelezionato = new Date(anno, mese - 1, 1)
      return inizioMeseSelezionato <= scadenzaDate
    }
    return true
  }

  // Variabile unificata per lo stato disabled del bottone
  const isDisabled =
    statoFoglio === 'inviato' ||
    statoFoglio === 'approvato' ||
    statoFoglio === 'reinviato' ||
    !puoInserirePresenze() ||
    !foglioCompletoInfo.completo

  const handleInvia = async () => {
    try {
      // 🔹 Validazione completezza foglio prima dell'invio
      if (dipendente) {
        const check = isFoglioCompleto(dipendente, anno, mese, giorni, righe)
        if (!check.completo) {
          const msg = check.message || 'Foglio non completo'
          setErrore(`⚠️ Impossibile inviare: ${msg}`)
          setTimeout(() => setErrore(''), 10000)
          return
        }
      }

      await inviaMese(dipendente.id, mese, anno)
      // Ricarica le presenze per ottenere lo stato aggiornato (inviato o reinviato)
      const res = await getPresenze(dipendente.id, mese, anno)
      const nuovoStato = res.data[0]?.stato || 'inviato'
      setStatoFoglio(nuovoStato)
      setMessaggio('✅ Mese inviato per approvazione!')
      setErrore('')
    } catch (error) {
      const errorMessage = error.response?.data?.error ||
                          error.response?.data?.message ||
                          'Errore durante l\'invio. Riprova.'
      setErrore(errorMessage)
      setTimeout(() => setErrore(''), 8000)
    }
  }

  if (loading) return <p className="loading-state">Caricamento...</p>

  // Determina se il dipendente è full-time (gestisce sia numero che stringa)
  const isFullTime = Number(dipendente?.percentuale_part_time) === 100;

  const messaggioBlocco = !puoInserirePresenze()
    ? `Non puoi inserire presenze. Scadenza contratto: ${dipendente?.data_scadenza_contratto ? new Date(dipendente.data_scadenza_contratto).toLocaleDateString('it-IT') : 'N/D'}.`
    : null

  // Funzione per ottenere le ore previste per un giorno specifico
  const getOrePrevistePerGiorno = (anno, mese, giorno) => {
    const isFullTime = Number(dipendente?.percentuale_part_time ?? 100) >= 100;
    if (isFullTime) {
      const oreSettimanali = parseFloat(dipendente?.regola_calcolo?.ore_settimanali_teoriche) ||
        parseFloat(dipendente?.contratto?.ore_settimanali_teoriche) ||
        parseFloat(dipendente?.ore_settimanali);
      const giorniLavorativi = parseInt(dipendente?.giorni_lavorativi_settimanali) || 5;
      if (oreSettimanali && oreSettimanali > 0) {
        return oreSettimanali / giorniLavorativi;
      }
      return 0;
    }
    const data = new Date(anno, mese - 1, giorno)
    const giornoSettimana = data.getDay() // 0=Dom, 1=Lun, etc.
    return orariSettimanali[giornoSettimana] || 0
  }

  // Per i part-time configurati, la distribuzione settimanale determina i riposi.
  const getIsRiposo = (dataStr) => {
    if (!dipendente) return false
    const [y, m, d] = dataStr.split('-')
    const dataObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
    const jsDay = dataObj.getDay() // 0-6 (0=Dom, 1=Lun... 6=Sab)
    const giornoSettimanaNum = jsDay === 0 ? 7 : jsDay // 1-7 (1=Lun... 7=Dom)

    if (Number(dipendente.percentuale_part_time ?? 100) < 100 && Object.prototype.hasOwnProperty.call(orariSettimanali, jsDay)) {
      return Number(orariSettimanali[jsDay]) <= 0
    }

    const condizioneGiorno = dipendente?.condizioni_contrattuali?.find(c => {
      const inizio = c.data_inizio
      const fine = c.data_fine || '9999-12-31'
      return dataStr >= inizio && dataStr <= fine
    }) || dipendente

    const r1 = condizioneGiorno?.R1 ?? dipendente?.R1
    const r2 = condizioneGiorno?.R2 ?? dipendente?.R2

    if (r1 === null || r1 === undefined) {
      // fallback default se non impostato: 6 (Sabato) e 7 (Domenica)
      const isDefR1 = 6 === giornoSettimanaNum || 6 === jsDay
      const isDefR2 = 7 === giornoSettimanaNum || 7 === jsDay || 0 === jsDay
      return Boolean(isDefR1 || isDefR2)
    }

    const r1Num = Number(r1)
    const r2Num = Number(r2)

    const matchR1 = (r1Num === giornoSettimanaNum) || (r1Num === jsDay) || (r1Num === 7 && jsDay === 0) || (r1Num === 0 && jsDay === 0)
    const matchR2 = !isNaN(r2Num) && ((r2Num === giornoSettimanaNum) || (r2Num === jsDay) || (r2Num === 7 && jsDay === 0) || (r2Num === 0 && jsDay === 0))

    return Boolean(matchR1 || matchR2)
  }

  const totaleOrdinarie = Object.values(righe).reduce(
    (acc, r) => acc + (parseFloat(r.ore_ordinarie) || 0), 0
  )
  const totaleEccedenti = Object.values(righe).reduce(
    (acc, r) => acc + (parseFloat(r.ore_eccedenti) || 0), 0
  )
  const totaleStraordinarie = Object.values(righe).reduce(
    (acc, r) => acc + (parseFloat(r.ore_straordinarie) || 0), 0
  )
  
  // Nuovi contatori
  const totaleFeriePermessi = Object.values(righe).reduce(
    (acc, r) => acc + (r.causale === 'ferie' || r.causale === 'permesso_rol' ? (parseFloat(r.ore_causale) || 0) : 0), 0
  )
  const totalePermessiRetribuiti = Object.values(righe).reduce(
    (acc, r) => acc + (r.causale === 'permesso_retribuito' ? (parseFloat(r.ore_causale) || 0) : 0), 0
  )
  const totalePermessiNonRetribuiti = Object.values(righe).reduce(
    (acc, r) => acc + (r.causale === 'permesso_non_retribuito' ? (parseFloat(r.ore_causale) || 0) : 0), 0
  )
  const totaleOreINPS = Object.values(righe).reduce(
    (acc, r) => acc + (r.causale === 'malattia' || r.causale === 'maternita' ? (parseFloat(r.ore_causale) || 0) : 0), 0
  )
  const totaleOreINAIL = Object.values(righe).reduce(
    (acc, r) => acc + (r.causale === 'infortunio' ? (parseFloat(r.ore_causale) || 0) : 0), 0
  )
  const totaleCassaIntegrazione = Object.values(righe).reduce(
    (acc, r) => acc + (r.causale === 'cassa_integrazione' ? (parseFloat(r.ore_causale) || 0) : 0), 0
  )

  const handleMeseCorrente = () => {
    setMese(oggi.getMonth() + 1)
    setAnno(oggi.getFullYear())
  }

  return (
    <div className="presenze-page">
      <div className="page-header">
        <h1 className="page-title">
          Presenze - {NOMI_MESI[mese - 1]} {anno}
        </h1>
      </div>
      
      {messaggioBlocco && (
        <div className="alert-danger">
          ⚠️ {messaggioBlocco}
        </div>
      )}

      <div className="toolbar">
        <select
          value={mese}
          onChange={(e) => setMese(parseInt(e.target.value))}
          className="select-control"
        >
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>{NOMI_MESI[i]}</option>
          ))}
        </select>
        <select
          value={anno}
          onChange={(e) => setAnno(parseInt(e.target.value))}
          className="select-control"
        >
          {Array.from({ length: 5 }, (_, i) => {
            const y = oggi.getFullYear() - 2 + i
            return <option key={y} value={y}>{y}</option>
          })}
        </select>
        <button
          onClick={handleMeseCorrente}
          className="btn btn-secondary"
        >
          Mese corrente
        </button>
      </div>

      <div className="totals-row">
  {/* Primo gruppo */}
  <div className="totals-group">
    <div className="badge badge-blue">
      <strong>Ore Ordinarie:</strong> {Number(totaleOrdinarie).toFixed(2)}
    </div>

    {!isFullTime && (
      <div className="badge badge-amber">
        <strong>Ore Eccedenti:</strong> {Number(totaleEccedenti).toFixed(2)}
      </div>
    )}

    {isFullTime && (
      <div className="badge badge-amber">
        <strong>Straordinari:</strong> {Number(totaleStraordinarie).toFixed(2)}
      </div>
    )}
  </div>

  {/* Secondo gruppo */}
  <div className="totals-group">
    <div className="badge badge-green">
      <strong>Ferie/Permessi:</strong> {Number(totaleFeriePermessi).toFixed(2)}
    </div>

    <div className="badge badge-green">
      <strong>PR:</strong> {Number(totalePermessiRetribuiti).toFixed(2)}
    </div>

    <div className="badge badge-green">
      <strong>PNR:</strong> {Number(totalePermessiNonRetribuiti).toFixed(2)}
    </div>
  </div>

  {/* Terzo gruppo */}
  <div className="totals-group">
    <div className="badge badge-yellow">
      <strong>INPS:</strong> {Number(totaleOreINPS).toFixed(2)}
    </div>

    <div className="badge badge-red">
      <strong>INAIL:</strong> {Number(totaleOreINAIL).toFixed(2)}
    </div>

    <div className="badge badge-indigo">
      <strong>CIG:</strong> {Number(totaleCassaIntegrazione).toFixed(2)}
    </div>
  </div>
</div>


      <div className="invia-wrap">
        <button
          onClick={handleInvia}
          disabled={isDisabled}
          className={`btn-invia ${isDisabled ? 'is-disabled' : ''}`}
          title={
            !puoInserirePresenze() ? 'Non puoi inviare: contratto scaduto' :
            statoFoglio === 'approvato' ? 'Foglio già approvato. Non è possibile reinviare.' :
            statoFoglio === 'reinviato' ? 'Foglio già reinviato. Attendere l\'approvazione.' :
            statoFoglio === 'inviato' ? 'Foglio già inviato. Attendere l\'approvazione.' :
            !foglioCompletoInfo.completo ? `Foglio non completo: ${foglioCompletoInfo.message}` :
            ''
          }
        >
          Invia al Manager
        </button>
        {/* Banner inline: errore se compilazione incompleta */}
        {!foglioCompletoInfo.completo && (
          <p className="banner-error">
            🚫 {foglioCompletoInfo.message}
          </p>
        )}
        {/* Banner inline: warning se saltati riposi */}
        {foglioCompletoInfo.completo && foglioCompletoInfo.warning && (
          <p className="banner-warn">
            ⚠️ {foglioCompletoInfo.warning}
          </p>
        )}
      </div>

      {messaggio && <p className="text-success">{messaggio}</p>}
      {errore && <p className="text-error">{errore}</p>}
      {/* Selettore giorno per Mobile - Calendario */}
      <div className="mobile-day-selector">
        <div className="mobile-day-selector-inner">
          <label className="mobile-day-label"> seleziona il giorno:</label>
          <input
            type="date"
            value={`${anno}-${String(mese).padStart(2, '0')}-${String(giornoSelezionato).padStart(2, '0')}`}
            min={`${anno}-${String(mese).padStart(2, '0')}-01`}
            max={`${anno}-${String(mese).padStart(2, '0')}-${String(giorni.length).padStart(2, '0')}`}
            onChange={(e) => {
              const [y, m, d] = e.target.value.split('-')
              if (parseInt(y) === anno && parseInt(m) === mese) {
                setGiornoSelezionato(parseInt(d))
              }
            }}
            className="mobile-date-input"
          />
        </div>
      </div>

      {/* Card Giorno per Mobile */}
      <div className="mobile-day-card">
        {(() => {
          const dataStr = getDataStr(anno, mese, giornoSelezionato)
          const riga = getRiga(dataStr)
          const isRiposo = getIsRiposo(dataStr)
          return (
            <CardGiorno
              giorno={giornoSelezionato}
              nomeGiorno={getNomeGiornoSettimana(anno, mese, giornoSelezionato, true)}
              nomeMese={NOMI_MESI[mese - 1]}
              riga={riga}
              onChange={(nuovaRiga) => handleChange(dataStr, nuovaRiga)}
              onSalva={() => handleSalva(dataStr)}
              onElimina={() => handleElimina(dataStr)}
              salvando={salvataggioInCorso === dataStr}
              onApriModaleMalattia={handleApriModaleMalattia}
              onApriModaleCassaIntegrazione={handleApriModaleCassaIntegrazione}
              onUploadTrasferta={handleUploadTrasferta}
              onUploadInfortunio={handleUploadInfortunio}
              onApriModaleQrSettings={handleApriModaleQrSettings}
              isFullTime={isFullTime}
              statoFoglio={statoFoglio}
              orariSettimanali={orariSettimanali}
              anno={anno}
              mese={mese}
              disabled={!puoInserirePresenze()}
              isRiposo={isRiposo}
            />
          )
        })()}
      </div>

      {/* Tabella Desktop */}
      <div className="desktop-table">

      <table className="presenze-table">
        <thead>
          <tr className="presenze-table-head">
            <th></th>
            <th>Ore Ordinarie</th>
            {!isFullTime && <th>Ore Eccedenti</th>}
            {isFullTime && <th>Ore Straordinarie</th>}
            <th>Causale <br />(se diversa da Lavoro)</th>
            <th>Altro</th>
            <th>Modalità</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {giorni.map((giorno) => {
            const dataStr = getDataStr(anno, mese, giorno)
            const riga = getRiga(dataStr)
            const isRiposo = getIsRiposo(dataStr)

            return (
              <RigaGiorno
                key={dataStr}
                giorno={giorno}
                nomeGiorno={getNomeGiornoSettimana(anno, mese, giorno)}
                riga={riga}
                onChange={(nuovaRiga) => handleChange(dataStr, nuovaRiga)}
                onSalva={() => handleSalva(dataStr)}
                onElimina={() => handleElimina(dataStr)}
                salvando={salvataggioInCorso === dataStr}
                onApriModaleMalattia={handleApriModaleMalattia}
                onApriModaleCassaIntegrazione={handleApriModaleCassaIntegrazione}
                onUploadTrasferta={handleUploadTrasferta}
                onUploadInfortunio={handleUploadInfortunio}
                onApriModaleQrSettings={handleApriModaleQrSettings}
                isFullTime={isFullTime}
                statoFoglio={statoFoglio}
                orariSettimanali={orariSettimanali}
                anno={anno}
                mese={mese}
                disabled={!puoInserirePresenze()}
                isRiposo={isRiposo}
              />
            )
          })}
        </tbody>
      </table>
      </div>

      {modaleMalattiaGiorno && (
        <ModaleMalattia
          dataInizio={getDataStr(anno, mese, modaleMalattiaGiorno)}
          onConferma={handleConfermaMalattia}
          onAnnulla={() => setModaleMalattiaGiorno(null)}
        />
      )}
      {modaleCassaIntegrazioneGiorno && (
        <ModaleCassaIntegrazione
          dataInizio={getDataStr(anno, mese, modaleCassaIntegrazioneGiorno)}
          onConferma={handleConfermaCassaIntegrazione}
          onAnnulla={() => setModaleCassaIntegrazioneGiorno(null)}
        />
      )}
      
      {/* Modale QR Settings */}
      {modaleQrSettingsGiorno && (
        <ModaleQrSettings
          giorno={modaleQrSettingsGiorno}
          nomeGiorno={getNomeGiornoSettimana(anno, mese, modaleQrSettingsGiorno)}
          riga={getRiga(getDataStr(anno, mese, modaleQrSettingsGiorno))}
          onChange={(nuovaRiga) => handleChange(getDataStr(anno, mese, modaleQrSettingsGiorno), nuovaRiga)}
          onGenerateQr={handleGenerateQr}
          onClose={handleChiudiModaleQrSettings}
          onRefresh={handleRefreshRiga}
          disabled={!puoInserirePresenze()}
          dataStr={getDataStr(anno, mese, modaleQrSettingsGiorno)}
        />
      )}
      
      {/* 🔹 Modale QR Code */}
      {showQrModal && selectedPresence && (
        <QrCodeModal
          qrToken={qrToken}
          presence={selectedPresence}
          onClose={() => {
            setShowQrModal(false)
            setQrToken('')
            setSelectedPresence(null)
          }}
        />
      )}
    </div>
  )
}

export default Timesheet