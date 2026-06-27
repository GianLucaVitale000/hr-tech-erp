import api from './api'

// Recupera gli orari settimanali di un dipendente
export const getOrariSettimanali = (dipendenteId) => 
  api.get(`/dipendenti/${dipendenteId}/orari-settimanali`)

// Salva/aggiorna gli orari settimanali per un dipendente
export const saveOrariSettimanali = (dipendenteId, orari) => {
  console.log('🔴 API: Chiamata saveOrariSettimanali per dipendente:', dipendenteId, 'orari:', orari)
  return api.post(`/dipendenti/${dipendenteId}/orari-settimanali`, { orari })
    .then(response => {
      console.log('🔴 API: saveOrariSettimanali SUCCESSO - response:', response.data)
      return response
    })
    .catch(err => {
      console.log('🔴 API: saveOrariSettimanali ERRORE - err:', err)
      return Promise.reject(err)
    })
}

// Recupera l'orario previsto per un dipendente in una specifica data
export const getOrarioPerData = (dipendenteId, data) => 
  api.get(`/dipendenti/${dipendenteId}/orari-settimanali/per-data`, { params: { data } })
