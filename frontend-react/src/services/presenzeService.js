import api from './api'

export const getPresenze = (dipendenteId, mese, anno) =>
  api.get(`/presenze?dipendente_id=${dipendenteId}&mese=${mese}&anno=${anno}`)

export const salvaPresenza = (data) => api.post('/presenze', data)

export const eliminaPresenza = (id) => api.delete(`/presenze/${id}`)

export const inviaMese = (dipendenteId, mese, anno) =>
  api.post('/presenze/invia-mese', { dipendente_id: dipendenteId, mese, anno })

export const getPresenzeInAttesa = () => api.get('/presenze/in-attesa')

export const getMesiApprovati = () => api.get('/presenze/mesi-approvati')

export const aggiornaStatoMese = (dipendenteId, mese, anno, stato) =>
  api.post('/presenze/aggiorna-stato-mese', {
    dipendente_id: dipendenteId,
    mese: parseInt(mese),
    anno: parseInt(anno),
    stato
  })

export const getComunicazioniPresenza = (params = {}) =>
  api.get('/presenza-comunicazioni', { params })

export const creaComunicazionePresenza = (data) =>
  api.post('/presenza-comunicazioni', data)

export const segnaComunicazioneComeLetta = (id) =>
  api.post(`/presenza-comunicazioni/${id}/letta`)

export const registraMalattia = (dipendenteId, dataInizio, dataFine, protocollo) =>
  api.post('/presenze/registra-malattia', {
    dipendente_id: dipendenteId,
    data_inizio: dataInizio,
    data_fine: dataFine,
    protocollo
  })

export const registraCassaIntegrazione = (dipendenteId, dataInizio, dataFine, percentuale) =>
  api.post('/presenze/registra-cassa-integrazione', {
    dipendente_id: dipendenteId,
    data_inizio: dataInizio,
    data_fine: dataFine,
    percentuale: parseFloat(percentuale)
  })

export const uploadGiustificativoTrasferta = (presenzaId, file) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post(`/presenze/${presenzaId}/giustificativo-trasferta`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export const uploadGiustificativoInfortunio = (presenzaId, file) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post(`/presenze/${presenzaId}/giustificativo-infortunio`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

// 🔹 Funzione per generare token QR Code per una presenza
export const generateQrToken = async (presenzaId) => {
  const response = await api.get(`/presenze/${presenzaId}/generate-qr`)
  return response.data.qr_token
}

// 🔹 Funzione per inviare la scansione QR dal tablet
export const scanQrCode = async (qrToken, kioskToken) => {
  const normalizedQrToken = qrToken
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()

  const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/presenze/scan-qr`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Kiosk-Token': kioskToken,
    },
    body: JSON.stringify({ qr_token: normalizedQrToken }),
  })
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || errorData.message || 'Errore nel server')
  }
  
  return await response.json()
}
