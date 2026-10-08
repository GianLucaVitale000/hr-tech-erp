import api from './api'

// === UTENTI ===
export const getUsers = () => api.get('/users')
export const getUser = (id) => api.get(`/users/${id}`)
export const createUser = (data) => api.post('/users', data)
export const uploadUserAvatar = (id, avatar) => {
  const data = new FormData()
  data.append('avatar', avatar)
  return api.post(`/users/${id}/avatar`, data)
}
export const updateUser = (id, data) => (
  data instanceof FormData
    ? api.post(`/users/${id}`, data)
    : api.put(`/users/${id}`, data)
)
export const deleteUser = (id) => api.delete(`/users/${id}`)
export const getPrivacyAcknowledgments = (dipendenteId) => api.get(`/dipendenti/${dipendenteId}/privacy-acknowledgments`)
export const createPrivacyAcknowledgment = (dipendenteId, data) => api.post(`/dipendenti/${dipendenteId}/privacy-acknowledgments`, data)

// === DIPENDENTI ===
export const getDipendenti = () => api.get('/dipendenti')
export const getDipendente = (id) => api.get(`/dipendenti/${id}`)
export const getAnalisiFerie = (id, anno) => api.get(`/dipendenti/${id}/analisi-ferie`, { params: { anno } })
export const createDipendente = (data) => api.post('/dipendenti', data)
export const updateDipendente = (id, data) => api.put(`/dipendenti/${id}`, data)
export const deleteDipendente = (id) => api.delete(`/dipendenti/${id}`)
export const getMioProfilo = () => api.get('/dipendenti/me')

// === CONTRATTI ===
export const getContratti = () => api.get('/contratti', { params: { all: true } })
export const getContrattiAllVersions = () => api.get('/contratti', { params: { all: true, grouped: false } })
export const getContratto = (id) => api.get(`/contratti/${id}`)
export const createContratto = (data) => api.post('/contratti', data)
export const updateContratto = (id, data) => api.put(`/contratti/${id}`, data)
export const deleteContratto = (id) => api.delete(`/contratti/${id}`)

// === REGOLE DI CALCOLO ===
export const getRegoleCalcolo = () => api.get('/regole-calcolo')
export const getRegolaCalcolo = (id) => api.get(`/regole-calcolo/${id}`)
export const createRegolaCalcolo = (data) => api.post('/regole-calcolo', data)
export const updateRegolaCalcolo = (id, data) => api.put(`/regole-calcolo/${id}`, data)
export const deleteRegolaCalcolo = (id) => api.delete(`/regole-calcolo/${id}`)
export const getDipendentiByContratto = (contrattoId) => api.get(`/contratti/${contrattoId}/dipendenti`)
export const getDipendentiByCodiceContratto = (codice) => api.get(`/contratti/by-codice/${codice}/dipendenti`)
