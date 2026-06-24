import api from './api'

export const getPresenze = (dipendenteId, mese, anno) =>
  api.get(`/presenze?dipendente_id=${dipendenteId}&mese=${mese}&anno=${anno}`)

export const salvaPresenza = (data) => api.post('/presenze', data)

export const inviaMese = (dipendenteId, mese, anno) =>
  api.post('/presenze/invia-mese', { dipendente_id: dipendenteId, mese, anno })

export const getPresenzeInAttesa = () => api.get('/presenze/in-attesa')

export const aggiornaStatoMese = (dipendenteId, mese, anno, stato) =>
  api.post('/presenze/aggiorna-stato-mese', {
    dipendente_id: dipendenteId,
    mese: parseInt(mese),
    anno: parseInt(anno),
    stato
  })

export const registraMalattia = (dipendenteId, dataInizio, dataFine, protocollo) =>
  api.post('/presenze/registra-malattia', {
    dipendente_id: dipendenteId,
    data_inizio: dataInizio,
    data_fine: dataFine,
    protocollo
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
