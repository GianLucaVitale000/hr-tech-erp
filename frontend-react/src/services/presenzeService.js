import api from './api'

export const getPresenze = (dipendenteId, mese, anno) =>
  api.get(`/presenze?dipendente_id=${dipendenteId}&mese=${mese}&anno=${anno}`)

export const salvaPresenza = (data) => api.post('/presenze', data)

export const inviaMese = (dipendenteId, mese, anno) =>
  api.post('/presenze/invia-mese', { dipendente_id: dipendenteId, mese, anno })
