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