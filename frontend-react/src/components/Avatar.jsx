import { useState } from 'react'

function Avatar({ name, url, className }) {
  const [failedUrl, setFailedUrl] = useState(null)

  const fallback = name?.charAt(0).toUpperCase() || 'U'

  return (
    <div className={className} title={name || 'Utente'}>
      {url && failedUrl !== url ? (
        <img
          src={url}
          alt=""
          onError={() => setFailedUrl(url)}
        />
      ) : (
        fallback
      )}
    </div>
  )
}

export default Avatar
