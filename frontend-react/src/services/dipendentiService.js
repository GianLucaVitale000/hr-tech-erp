import api from './api'

export const getDipendenti = () => api.get('/dipendenti')
export const getDipendente = (id) => api.get(`/dipendenti/${id}`)
export const createDipendente = (data) => api.post('/dipendenti', data)
export const updateDipendente = (id, data) => api.put(`/dipendenti/${id}`, data)
export const deleteDipendente = (id) => api.delete(`/dipendenti/${id}`)

export const getContratti = () => api.get('/contratti')
export const createContratto = (data) => api.post('/contratti', data)
