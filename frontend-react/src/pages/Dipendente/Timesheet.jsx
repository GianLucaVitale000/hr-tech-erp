import { useEffect, useState, useMemo } from 'react'
import { getMioProfilo } from '../../services/dipendentiService'
import {
  getPresenze,
  salvaPresenza,
  inviaMese,
  registraMalattia,
  registraCassaIntegrazione,
  uploadGiustificativoTrasferta,
  uploadGiustificativoInfortunio,
  generateQrToken,
} from '../../services/presenzeService'
import { isFoglioCompleto } from '../../utils/foglioCompleto'
import QrCodeModal from '../../components/QrCodeModal'

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

function RigaGiorno({
  giorno, nomeGiorno, riga, onChange, onSalva, salvando,
  onApriModaleMalattia, onApriModaleCassaIntegrazione, onUploadTrasferta, onUploadInfortunio, 
  onApriModaleQrSettings,
  isFullTime = false, statoFoglio = null, orariSettimanali = {}, anno, mese, disabled = false
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
    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
      <td style={{ padding: '0.5rem' }}>
        {giorno} <span style={{ opacity: 0.7 }}>({nomeGiorno})</span>
      </td>

      <td style={{ padding: '0.5rem' }}>
        <input
          type="number"
          min="0"
          step="0.25"
          value={Number(riga.ore_ordinarie || 0).toFixed(2)}
          onChange={(e) => onChange({ ...riga, ore_ordinarie: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
          disabled={disabled || isOreDisabled}
          style={{ width: '60px', padding: '0.25rem' }}
          title={isOreDisabled ? 'Ore calcolate automaticamente dalle timbrature QR. Salva per aggiornare.' : ''}
        />
      </td>

      {!isFullTime && (
        <td style={{ padding: '0.5rem' }}>
          <input
            type="number"
            min="0"
            step="0.25"
            value={Number(riga.ore_eccedenti || 0).toFixed(2)}
            onChange={(e) => onChange({ ...riga, ore_eccedenti: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
            disabled={disabled || isOreDisabled}
            style={{ width: '60px', padding: '0.25rem' }}
            title={isOreDisabled ? 'Ore calcolate automaticamente dalle timbrature QR. Salva per aggiornare.' : 'Ore eccedenti (oltre il limite ordinario del giorno)'}
          />
        </td>
      )}

      {isFullTime && (
        <td style={{ padding: '0.5rem' }}>
          <input
            type="number"
            min="0"
            step="0.25"
            value={Number(riga.ore_straordinarie || 0).toFixed(2)}
            onChange={(e) => onChange({ ...riga, ore_straordinarie: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
            disabled={disabled || isOreDisabled}
            style={{ width: '60px', padding: '0.25rem' }}
            title={isOreDisabled ? 'Ore calcolate automaticamente dalle timbrature QR. Salva per aggiornare.' : ''}
          />
          {riga.ore_straordinarie > 4 && (
            <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '0.25rem' }}>
              Attenzione: superato limite consigliato di straordinario giornaliero
            </div>
          )}
        </td>
      )}

      <td style={{ padding: '0.5rem' }}>
        <select
          value={riga.causale}
          onChange={(e) => handleCausaleChange(e.target.value)}
          disabled={disabled}
          style={{ padding: '0.25rem' }}
        >
          {CAUSALI.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>

        {isMalattia && riga.protocollo_malattia && (
          <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '0.25rem' }}>
            Prot. {riga.protocollo_malattia}<br/>
            Dal {formattaData(riga.data_inizio_malattia)} al {formattaData(riga.data_fine_malattia)}
          </div>
        )}

        {isInfortunio && (
          <div style={{ marginTop: '0.4rem' }}>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => onUploadInfortunio(giorno, e.target.files[0])}
              style={{ fontSize: '0.75rem', width: '160px' }}
            />
            {riga.giustificativo_infortunio_path && (
              <div style={{ fontSize: '0.75rem', color: '#16a34a' }}>✓ Allegato caricato</div>
            )}
          </div>
        )}
      </td>

      <td style={{ padding: '0.5rem' }}>
        <input
          type="number"
          min="0"
          max="8"
          step="0.25"
          value={Number(riga.ore_causale || 0).toFixed(2)}
          onChange={(e) => onChange({ ...riga, ore_causale: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
          disabled={disabled}
          style={{ width: '60px', padding: '0.25rem' }}
        />
      </td>

      <td style={{ padding: '0.5rem' }}>
        {mostraModalita && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.75rem', alignItems: 'flex-start' }}>
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
              <div style={{ marginTop: '0.3rem' }}>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => onUploadTrasferta(giorno, e.target.files[0])}
                  style={{ fontSize: '0.75rem', width: '160px' }}
                />
                {riga.giustificativo_trasferta_path && (
                  <div style={{ fontSize: '0.75rem', color: '#16a34a' }}>✓ Allegato caricato</div>
                )}
              </div>
            )}

            {/* 🔹 Checkbox QR Code - integrato nella colonna Modalità (solo tempo pieno + causale lavoro + in_sede) */}
            {isFullTime && riga.causale === 'lavoro' && riga.modalita_lavoro === 'in_sede' && (
              <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center' }}>
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
                  style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
                />
                <span 
                  style={{ 
                    marginLeft: '0.5rem', 
                    fontSize: '0.8rem',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.6 : 1,
                    color: riga.usa_qr ? '#3b82f6' : 'inherit'
                  }}
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



      <td style={{ padding: '0.5rem' }}>
        {/* Mostra stato timbrature se usa_qr è attivo */}
        {riga.usa_qr && isSalvato && (
          <div style={{ 
            fontSize: '0.75rem', 
            marginBottom: '0.25rem',
            padding: '0.25rem 0.5rem',
            borderRadius: '4px',
            backgroundColor: riga.ora_ingresso && riga.ora_uscita ? '#dcfce7' : '#fef3c7',
            color: riga.ora_ingresso && riga.ora_uscita ? '#166534' : '#92400e'
          }}>
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
          style={{
            padding: '0.25rem 0.75rem',
            backgroundColor: (isFoglioApprovato || disabled || isSalvato) ? '#93c5fd' : '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: (salvando || isFoglioApprovato || isSalvato || (isFoglioInviato && isSalvato) || disabled) ? 'not-allowed' : 'pointer',
            fontSize: '0.85rem',
            opacity: (isFoglioApprovato || disabled || isSalvato) ? 0.6 : 1,
            display: 'block',
            width: '100%'
          }}
          title={disabled ? 'Non puoi salvare: contratto scaduto' : (isFoglioApprovato || isSalvato) ? (isFoglioApprovato ? 'Foglio approvato. Non è possibile modificare.' : 'Riga già salvata. Non è possibile modificare.') : (isFoglioInviato ? 'Foglio inviato. Non è possibile modificare.' : '')}
        >
          {salvando ? '...' : (isFoglioRifiutatoOReinviato ? 'Salva' : (isSalvato ? '✓ Salvato' : 'Salva'))}
        </button>
      </td>
    </tr>
  )
}

function ModaleMalattia({ dataInizio, onConferma, onAnnulla }) {
  const [dataFine, setDataFine] = useState(dataInizio)
  const [protocollo, setProtocollo] = useState('')

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{ backgroundColor: '#1f2937', padding: '1.5rem', borderRadius: '8px', width: '360px' }}>
        <h3 style={{ marginTop: 0 }}>Registra periodo di malattia</h3>

        <div style={{ marginBottom: '1rem' }}>
          <label>Dal</label>
          <input type="date" value={dataInizio} disabled style={{ display: 'block', width: '100%', padding: '0.4rem' }} />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Al</label>
          <input
            type="date"
            value={dataFine}
            min={dataInizio}
            onChange={(e) => setDataFine(e.target.value)}
            style={{ display: 'block', width: '100%', padding: '0.4rem' }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label>Numero protocollo certificato</label>
          <input
            type="text"
            value={protocollo}
            onChange={(e) => setProtocollo(e.target.value)}
            placeholder="es. INPS-2026-XXXXX"
            style={{ display: 'block', width: '100%', padding: '0.4rem' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button onClick={onAnnulla} style={{ padding: '0.5rem 1rem', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Annulla
          </button>
          <button
            onClick={() => onConferma(dataFine, protocollo)}
            disabled={!protocollo}
            style={{ padding: '0.5rem 1rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
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
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{ backgroundColor: '#1f2937', padding: '1.5rem', borderRadius: '8px', width: '360px' }}>
        <h3 style={{ marginTop: 0 }}>Registra periodo di Cassa Integrazione</h3>

        <div style={{ marginBottom: '1rem' }}>
          <label>Dal</label>
          <input type="date" value={dataInizio} disabled style={{ display: 'block', width: '100%', padding: '0.4rem' }} />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Al</label>
          <input
            type="date"
            value={dataFine}
            min={dataInizio}
            onChange={(e) => setDataFine(e.target.value)}
            style={{ display: 'block', width: '100%', padding: '0.4rem' }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label>Percentuale (%)</label>
          <input
            type="number"
            value={percentuale}
            min="0"
            max="100"
            onChange={(e) => setPercentuale(parseInt(e.target.value) || 0)}
            style={{ display: 'block', width: '100%', padding: '0.4rem' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button onClick={onAnnulla} style={{ padding: '0.5rem 1rem', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Annulla
          </button>
          <button
            onClick={() => onConferma(dataFine, percentuale)}
            disabled={percentuale <= 0 || percentuale > 100}
            style={{ padding: '0.5rem 1rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
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
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1001
    }} onClick={(e) => {
      if (e.target === e.currentTarget) {
        onClose()
      }
    }}>
      <div style={{ 
        backgroundColor: '#1f2937', 
        padding: '1.5rem', 
        borderRadius: '8px', 
        width: '400px',
        maxWidth: '90vw'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ marginTop: 0, color: 'white', marginBottom: 0 }}>Configurazione QR Code</h3>
          <button 
            onClick={onClose} 
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'white', 
              fontSize: '1.5rem', 
              cursor: 'pointer',
              padding: '0 0.25rem',
              lineHeight: 1
            }}
            title="Chiudi"
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', color: 'white', marginBottom: '0.5rem' }}>
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
            style={{ 
              width: '100%', 
              padding: '0.5rem', 
              borderRadius: '4px',
              border: '1px solid #4b5563'
            }}
            title="Ore di pausa (saranno sottratte dal totale)"
          />
          <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
            Le ore di pausa verranno sottratte dal totale calcolato
          </p>
        </div>

        {/* Pulsante Kiosk - sempre visibile */}
        <div style={{ marginBottom: '1.5rem' }}>
          <button
            onClick={() => onGenerateQr && onGenerateQr(dataStr)}
            disabled={disabled}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: disabled ? 'not-allowed' : 'pointer',
              fontSize: '0.85rem',
              width: '100%'
            }}
            title="Apri kiosk per timbrare con QR Code"
          >
            📱 Scansiona il QR code
          </button>
        </div>

        {/* Mostra stato timbrature */}
        {isSalvato && (
          <div style={{ marginBottom: '1rem' }}>
            {riga.ora_ingresso && !riga.ora_uscita && (
              <div style={{ 
                fontSize: '0.75rem', 
                color: '#fbbf24', 
                padding: '0.5rem',
                backgroundColor: 'rgba(251, 191, 36, 0.1)',
                borderRadius: '4px',
                textAlign: 'center'
              }}>
                ⏳ Ingresso: {riga.ora_ingresso} - Uscita: in attesa
              </div>
            )}
            {riga.ora_ingresso && riga.ora_uscita && (
              <div style={{ 
                fontSize: '0.75rem', 
                color: '#34d399', 
                padding: '0.5rem',
                backgroundColor: 'rgba(52, 211, 153, 0.1)',
                borderRadius: '4px',
                textAlign: 'center'
              }}>
                ✓ Ingresso: {riga.ora_ingresso} - Uscita: {riga.ora_uscita}
                {riga.ore_ordinarie && (
                  <div style={{ marginTop: '0.25rem', fontSize: '0.7rem' }}>
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

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
          {isSalvato && onRefresh && (
            <button 
              onClick={() => {
                // Ricarica la riga dal backend per vedere gli aggiornamenti
                onRefresh && onRefresh(dataStr)
              }} 
              style={{ 
                padding: '0.5rem 1rem', 
                backgroundColor: '#2563eb', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: 'pointer'
              }}
              title="Ricarica i dati dal server per vedere gli aggiornamenti delle timbrature"
            >
              Verifica scansione
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
  disabled
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
    <div style={{ backgroundColor: '#1f2937', borderRadius: '12px', padding: '1rem', marginBottom: '1rem' }}>
      {/* Header con data */}
      <div style={{ textAlign: 'center', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #374151' }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f3f4f6' }}>{giorno} {nomeMese}</div>
        <div style={{ fontSize: '0.9rem', color: '#9ca3af' }}>{nomeGiorno}</div>
      </div>

      {/* Campo Ore Ordinarie */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', color: '#d1d5db', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Ore Ordinarie</label>
        <input
          type="number"
          min="0"
          step="0.25"
          value={Number(riga.ore_ordinarie || 0).toFixed(2)}
          onChange={(e) => onChange({ ...riga, ore_ordinarie: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
          disabled={disabled || isOreDisabled}
          style={{ width: '80px', padding: '0.5rem', borderRadius: '6px', border: '1px solid #4b5563', backgroundColor: '#374151', color: '#f3f4f6' }}
        />
      </div>

      {/* Campo Ore */}
      {!isFullTime && (
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', color: '#d1d5db', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Ore Eccedenti</label>
          <input
            type="number"
            min="0"
            step="0.25"
            value={Number(riga.ore_eccedenti || 0).toFixed(2)}
            onChange={(e) => onChange({ ...riga, ore_eccedenti: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
            disabled={disabled || isOreDisabled}
            style={{ width: '80px', padding: '0.5rem', borderRadius: '6px', border: '1px solid #4b5563', backgroundColor: '#374151', color: '#f3f4f6' }}
          />
        </div>
      )}

      {isFullTime && (
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', color: '#d1d5db', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Ore Straordinarie</label>
          <input
            type="number"
            min="0"
            step="0.25"
            value={Number(riga.ore_straordinarie || 0).toFixed(2)}
            onChange={(e) => onChange({ ...riga, ore_straordinarie: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
            disabled={disabled || isOreDisabled}
            style={{ width: '80px', padding: '0.5rem', borderRadius: '6px', border: '1px solid #4b5563', backgroundColor: '#374151', color: '#f3f4f6' }}
          />
        </div>
      )}

      {/* Causale */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', color: '#d1d5db', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Causale (altro da Lavoro)</label>
        <select
          value={riga.causale}
          onChange={(e) => handleCausaleChange(e.target.value)}
          disabled={disabled}
          style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #4b5563', backgroundColor: '#374151', color: '#f3f4f6' }}
        >
          {CAUSALI.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>

        {isMalattia && riga.protocollo_malattia && (
          <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#9ca3af' }}>
            Prot. {riga.protocollo_malattia}<br/>
            Dal {formattaData(riga.data_inizio_malattia)} al {formattaData(riga.data_fine_malattia)}
          </div>
        )}

        {isInfortunio && (
          <div style={{ marginTop: '0.5rem' }}>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => onUploadInfortunio(giorno, e.target.files[0])}
              style={{ fontSize: '0.75rem', width: '100%', color: '#9ca3af' }}
            />
            {riga.giustificativo_infortunio_path && (
              <div style={{ fontSize: '0.75rem', color: '#34d399' }}>✓ Allegato caricato</div>
            )}
          </div>
        )}
      </div>

      {/* Ore Causale */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', color: '#d1d5db', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Ore Causale</label>
        <input
          type="number"
          min="0"
          max="8"
          step="0.25"
          value={Number(riga.ore_causale || 0).toFixed(2)}
          onChange={(e) => onChange({ ...riga, ore_causale: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
          disabled={disabled}
          style={{ width: '80px', padding: '0.6rem', borderRadius: '6px', border: '1px solid #4b5563', backgroundColor: '#374151', color: '#f3f4f6' }}
        />
      </div>

      {/* Modalità */}
      {mostraModalita && (
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', color: '#d1d5db', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Modalità</label>
          
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.5rem', backgroundColor: riga.modalita_lavoro === 'in_sede' ? '#2563eb' : '#374151', borderRadius: '6px', cursor: disabled ? 'not-allowed' : 'pointer', color: '#f3f4f6', fontSize: '0.85rem' }}>
              <input
                type="radio"
                name={`modalita-mobile-${giorno}`}
                checked={riga.modalita_lavoro === 'in_sede'}
                onChange={() => onChange({ ...riga, modalita_lavoro: 'in_sede' })}
                disabled={disabled}
                style={{ display: 'none' }}
              />
              In sede
            </label>
            <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.5rem', backgroundColor: riga.modalita_lavoro === 'smart_working' ? '#2563eb' : '#374151', borderRadius: '6px', cursor: disabled ? 'not-allowed' : 'pointer', color: '#f3f4f6', fontSize: '0.85rem' }}>
              <input
                type="radio"
                name={`modalita-mobile-${giorno}`}
                checked={riga.modalita_lavoro === 'smart_working'}
                onChange={() => onChange({ ...riga, modalita_lavoro: 'smart_working', usa_qr: false })}
                disabled={disabled}
                style={{ display: 'none' }}
              />
              SW
            </label>
            <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.5rem', backgroundColor: riga.modalita_lavoro === 'trasferta' ? '#2563eb' : '#374151', borderRadius: '6px', cursor: disabled ? 'not-allowed' : 'pointer', color: '#f3f4f6', fontSize: '0.85rem' }}>
              <input
                type="radio"
                name={`modalita-mobile-${giorno}`}
                checked={riga.modalita_lavoro === 'trasferta'}
                onChange={() => onChange({ ...riga, modalita_lavoro: 'trasferta', usa_qr: false })}
                disabled={disabled}
                style={{ display: 'none' }}
              />
              Trasferta
            </label>
          </div>

          {isTrasferta && (
            <div style={{ marginTop: '0.5rem' }}>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => onUploadTrasferta(giorno, e.target.files[0])}
                style={{ fontSize: '0.75rem', width: '100%', color: '#9ca3af' }}
              />
              {riga.giustificativo_trasferta_path && (
                <div style={{ fontSize: '0.75rem', color: '#34d399' }}>✓ Allegato caricato</div>
              )}
            </div>
          )}

          {/* QR Code Checkbox */}
          {isFullTime && riga.causale === 'lavoro' && riga.modalita_lavoro === 'in_sede' && (
            <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                style={{ color: riga.usa_qr ? '#60a5fa' : '#9ca3af', cursor: disabled ? 'not-allowed' : 'pointer', fontSize: '0.85rem' }}
              >
                QR Code
              </label>
            </div>
          )}
        </div>
      )}

      {/* Stato timbrature QR */}
      {riga.usa_qr && isSalvato && (
        <div style={{ 
          marginBottom: '1rem',
          padding: '0.75rem',
          borderRadius: '6px',
          backgroundColor: riga.ora_ingresso && riga.ora_uscita ? 'rgba(52, 211, 153, 0.1)' : 'rgba(251, 191, 36, 0.1)',
          color: riga.ora_ingresso && riga.ora_uscita ? '#34d399' : '#fbbf24',
          fontSize: '0.85rem',
          textAlign: 'center'
        }}>
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
        style={{
          width: '100%',
          padding: '0.75rem',
          backgroundColor: (isFoglioApprovato || disabled || isSalvato) ? '#4b5563' : '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: (salvando || isFoglioApprovato || isSalvato || (isFoglioInviato && isSalvato) || disabled) ? 'not-allowed' : 'pointer',
          fontSize: '1rem',
          fontWeight: 'bold'
        }}
      >
        {salvando ? '...' : (isFoglioRifiutatoOReinviato ? 'Salva' : (isSalvato ? '✓ Salvato' : 'Salva'))}
      </button>
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
      const oreStraordinarie = Math.max(0, Math.round((oreNette - oreOrdinarieMax) * 4) / 4)
      const oreOrdinarie = Math.min(oreNette, oreOrdinarieMax)
      
      return {
        ore_ordinarie: Math.round(oreOrdinarie * 4) / 4,
        ore_straordinarie: Math.round(oreStraordinarie * 4) / 4,
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
      const num = parseFloat(val);
      return Math.round(num * 100) / 100;
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

  const getRiga = (dataStr) => righe[dataStr] || normalizzaRiga()

  const handleChange = (dataStr, nuovaRiga) => {
    // Normalizza tutti i valori numerici per assicurare che siano numeri
    const normalizza = (val) => {
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
    // Questo permette all'utente di vedere le ore calcolate prima di salvare
    if (nuovaRiga.usa_qr && nuovaRiga.ora_ingresso && nuovaRiga.ora_uscita && 
        Object.keys(orariSettimanali).length > 0) {
      const calcolate = calcolaOreDaTimbrature(nuovaRiga, dataStr)
      if (calcolate) {
        // Sovrascrivi le ore calcolate, ma mantieni gli altri campi
        nuovaRiga = {
          ...nuovaRiga,
          ...calcolate
        }
      }
    }
    
    // 🔹 Se usa_qr viene attivato, imposta fonte_dato a QR_CODE
    if (nuovaRiga.usa_qr && !nuovaRiga.fonte_dato) {
      nuovaRiga.fonte_dato = 'QR_CODE'
    }
    
    // 🔹 Se usa_qr viene disattivato, imposta fonte_dato a MANUALE
    if (!nuovaRiga.usa_qr && nuovaRiga.fonte_dato === 'QR_CODE') {
      nuovaRiga.fonte_dato = 'MANUALE'
    }
    
    // Gestione automatica delle ore per tutti i dipendenti
    // (sia full-time che part-time)
    if (Object.keys(orariSettimanali).length > 0) {
      const [y, m, d] = dataStr.split('-')
      const oreOrdinarieMax = getOrePrevistePerGiorno(parseInt(y), parseInt(m), parseInt(d))
      
      const oreOrdinarie = nuovaRiga.ore_ordinarie || 0
      const oreCausale = nuovaRiga.ore_causale || 0
      const causale = nuovaRiga.causale || 'lavoro'
      
      // Per lavoro: sposta l'eccedenza in ore_eccedenti
      if (causale === 'lavoro') {
        const oreEccedenti = oreOrdinarie > oreOrdinarieMax ? oreOrdinarie - oreOrdinarieMax : 0
        setRighe((prev) => ({
          ...prev,
          [dataStr]: {
            ...nuovaRiga,
            ore_causale: 0, // Azzera ore_causale per lavoro
            ore_eccedenti: oreEccedenti
          }
        }))
        return
      }
      
      // Per causali diverse da 'lavoro': mantieni entrambi i valori (ore_ordinarie + ore_causale)
      // ma non applichiamo limiti automatici qui - la validazione avviene al salvataggio
      if (causale !== 'lavoro') {
        setRighe((prev) => ({
          ...prev,
          [dataStr]: {
            ...nuovaRiga,
            ore_causale: oreCausale,
            ore_ordinarie: oreOrdinarie
          }
        }))
        return
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
      
      // Auto-refresh ogni 25 secondi (il token scade dopo 30s)
      const interval = setInterval(async () => {
        try {
          // Controlla se la presenza è completata (entrata e uscita registrate)
          const currentRiga = getRiga(dataStr)
          if (currentRiga.ora_ingresso && currentRiga.ora_uscita) {
            // Presenza completata, ferma il refresh automatico
            clearInterval(interval)
            setShowQrModal(false)
            return
          }
          
          const newToken = await generateQrToken(presenzaId)
          setQrToken(newToken)
        } catch (error) {
          // Se l'errore è 400 (presenza completata), chiudi senza alert
          if (error.response?.status === 400) {
            clearInterval(interval)
            setShowQrModal(false)
          } else {
            clearInterval(interval)
            setShowQrModal(false)
            alert('Errore nel generare il nuovo QR Code: ' + error.message)
          }
        }
      }, 25000)
      
      // Salva l'intervallo per pulirlo alla chiusura
      return () => clearInterval(interval)
      
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

  if (loading) return <p style={{ padding: '2rem' }}>Caricamento...</p>

  // Determina se il dipendente è full-time (gestisce sia numero che stringa)
  const isFullTime = Number(dipendente?.percentuale_part_time) === 100;

  const messaggioBlocco = !puoInserirePresenze()
    ? `Non puoi inserire presenze. Scadenza contratto: ${dipendente?.data_scadenza_contratto ? new Date(dipendente.data_scadenza_contratto).toLocaleDateString('it-IT') : 'N/D'}.`
    : null

  // Funzione per ottenere le ore previste per un giorno specifico
  const getOrePrevistePerGiorno = (anno, mese, giorno) => {
    const data = new Date(anno, mese - 1, giorno)
    const giornoSettimana = data.getDay() // 0=Dom, 1=Lun, etc.
    return orariSettimanali[giornoSettimana] || 0
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
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
<div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 className="page-title" style={{ margin: 0, fontSize: '1.5rem', lineHeight: '1.4', flex: '1 1 200px' }}>
          Presenze - {NOMI_MESI[mese - 1]} {anno}
        </h1>
      </div>
      
      {messaggioBlocco && (
        <div style={{
          padding: '1rem', 
          backgroundColor: '#fca5a5', 
          color: '#991b1b', 
          borderRadius: '8px',
          marginBottom: '1.5rem',
          fontWeight: '500',
          textAlign: 'center'
        }}>
          ⚠️ {messaggioBlocco}
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
        <select
          value={mese}
          onChange={(e) => setMese(parseInt(e.target.value))}
          style={{ padding: '0.5rem', borderRadius: '4px' }}
        >
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>{NOMI_MESI[i]}</option>
          ))}
        </select>
        <select
          value={anno}
          onChange={(e) => setAnno(parseInt(e.target.value))}
          style={{ padding: '0.5rem', borderRadius: '4px' }}
        >
          {Array.from({ length: 5 }, (_, i) => {
            const y = oggi.getFullYear() - 2 + i
            return <option key={y} value={y}>{y}</option>
          })}
        </select>
        <button
          onClick={handleMeseCorrente}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Mese corrente
        </button>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#eff6ff', borderRadius: '6px', fontSize: '0.85rem' }}>
          <strong>Ore Ordinarie:</strong> {totaleOrdinarie}
        </div>
        {!isFullTime && (
          <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#fef3c7', borderRadius: '6px', fontSize: '0.85rem' }}>
            <strong>Ore Eccedenti:</strong> {totaleEccedenti}
          </div>
        )}
        {isFullTime && (
          <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#fef3c7', borderRadius: '6px', fontSize: '0.85rem' }}>
            <strong>Straordinari:</strong> {totaleStraordinarie}
          </div>
        )}
        <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#d1fae5', borderRadius: '6px', fontSize: '0.85rem' }}>
          <strong>Ferie/Permessi:</strong> {totaleFeriePermessi}
        </div>
        <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#d1fae5', borderRadius: '6px', fontSize: '0.85rem' }}>
          <strong>PR:</strong> {totalePermessiRetribuiti}
        </div>
        <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#d1fae5', borderRadius: '6px', fontSize: '0.85rem' }}>
          <strong>PNR:</strong> {totalePermessiNonRetribuiti}
        </div>
        <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#fde68a', borderRadius: '6px', fontSize: '0.85rem' }}>
          <strong>INPS:</strong> {totaleOreINPS}
        </div>
        <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#fca5a5', borderRadius: '6px', fontSize: '0.85rem' }}>
          <strong>INAIL:</strong> {totaleOreINAIL}
        </div>
        <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#e0e7ff', borderRadius: '6px', fontSize: '0.85rem' }}>
          <strong>CIG:</strong> {totaleCassaIntegrazione}
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <button
          onClick={handleInvia}
          disabled={isDisabled}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: isDisabled ? '#93c5fd' : '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            fontSize: '0.85rem',
            display: 'block',
            margin: '0 auto'
          }}
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
          <p style={{
            color: '#dc2626',
            fontSize: '0.8rem',
            textAlign: 'center',
            marginTop: '0.5rem',
            marginBottom: 0,
          }}>
            🚫 {foglioCompletoInfo.message}
          </p>
        )}
        {/* Banner inline: warning se saltati riposi */}
        {foglioCompletoInfo.completo && foglioCompletoInfo.warning && (
          <p style={{
            color: '#92400e',
            backgroundColor: '#fef3c7',
            fontSize: '0.8rem',
            textAlign: 'center',
            marginTop: '0.5rem',
            marginBottom: 0,
            padding: '0.25rem 0.5rem',
            borderRadius: '4px',
          }}>
            ⚠️ {foglioCompletoInfo.warning}
          </p>
        )}
      </div>

      {messaggio && <p style={{ color: 'green' }}>{messaggio}</p>}
      {errore && <p style={{ color: 'red' }}>{errore}</p>}
      {/* Selettore giorno per Mobile - Calendario */}
      <div className="mobile-day-selector" style={{ display: 'none', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
          <label style={{ color: '#d1d5db', fontSize: '0.9rem' }}> seleziona il giorno:</label>
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
            style={{
              padding: '0.5rem',
              borderRadius: '6px',
              border: '1px solid #4b5563',
              backgroundColor: '#374151',
              color: '#f3f4f6',
              fontSize: '1rem',
              cursor: 'pointer',
              colorScheme: 'dark'
            }}
          />
        </div>
      </div>

      {/* Card Giorno per Mobile */}
      <div className="mobile-day-card" style={{ display: 'none' }}>
        {(() => {
          const dataStr = getDataStr(anno, mese, giornoSelezionato)
          const riga = getRiga(dataStr)
          return (
            <CardGiorno
              giorno={giornoSelezionato}
              nomeGiorno={getNomeGiornoSettimana(anno, mese, giornoSelezionato, true)}
              nomeMese={NOMI_MESI[mese - 1]}
              riga={riga}
              onChange={(nuovaRiga) => handleChange(dataStr, nuovaRiga)}
              onSalva={() => handleSalva(dataStr)}
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
            />
          )
        })()}
      </div>

      {/* Tabella Desktop */}
      <div className="desktop-table">

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f3f4f6', textAlign: 'center' }}>
            <th style={{ padding: '0.5rem' }}></th>
            <th style={{ padding: '0.5rem' }}>Ore Ordinarie</th>
            {!isFullTime && <th style={{ padding: '0.5rem' }}>Ore Eccedenti</th>}
            {isFullTime && <th style={{ padding: '0.5rem' }}>Ore Straordinarie</th>}
            <th style={{ padding: '0.5rem' }}>Causale (altro da Lavoro)</th>
            <th style={{ padding: '0.5rem' }}>Altro</th>
            <th style={{ padding: '0.5rem' }}>Modalità</th>
            <th style={{ padding: '0.5rem' }}></th>
          </tr>
        </thead>
        <tbody>
          {giorni.map((giorno) => {
            const dataStr = getDataStr(anno, mese, giorno)
            const riga = getRiga(dataStr)

            return (
              <RigaGiorno
                key={dataStr}
                giorno={giorno}
                nomeGiorno={getNomeGiornoSettimana(anno, mese, giorno)}
                riga={riga}
                onChange={(nuovaRiga) => handleChange(dataStr, nuovaRiga)}
                onSalva={() => handleSalva(dataStr)}
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
      <style>
        {`
          .page-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
            flex-wrap: wrap;
            gap: 1rem;
          }
          .page-title {
            margin: 0;
            font-size: 1.5rem;
            line-height: 1.4;
            flex: 1 1 200px;
          }
          @media (max-width: 768px) {
            .page-title {
              font-size: 1.25rem;
              line-height: 1.5;
              width: 100%;
              margin-bottom: 0.5rem;
            }
            .mobile-day-selector,
            .mobile-day-card {
              display: block !important;
            }
            .desktop-table {
              display: none !important;
            }
          }
          @media (min-width: 769px) {
            .mobile-day-selector,
            .mobile-day-card {
              display: none !important;
            }
            .desktop-table {
              display: block !important;
            }
          }
        `}
      </style>
    </div>
  )
}

export default Timesheet