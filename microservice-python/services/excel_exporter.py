import pandas as pd
from io import BytesIO
from database import get_connection
from openpyxl.styles import Font

MAPPA_CODICI_PAGHE = {
    'lavoro': 'ORD',
    'ferie': 'FER',
    'permesso_rol': 'ROL',
    'malattia': 'MAL',
    'maternita': 'MAT',
    'infortunio': 'INF',
    'assemblea': 'ASS',
}

MAPPA_MODALITA = {
    'in_sede': 'In sede',
    'smart_working': 'Smart Working',
    'trasferta': 'Trasferta',
}

BASE_URL_STORAGE = "http://localhost:8000/storage/"


def genera_report_mensile(mese: int, anno: int) -> BytesIO:
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    query = """
        SELECT
            d.id AS dipendente_id,
            u.name AS nome_dipendente,
            d.codice_fiscale,
            d.percentuale_part_time,
            DATE_FORMAT(p.data, '%d/%m/%Y') AS data,
            DAYOFWEEK(p.data) - 1 AS giorno_settimana,  -- 0=Dom, 1=Lun, etc.
            p.ore_ordinarie,
            p.ore_eccedenti,
            p.ore_straordinarie,
            p.ore_causale,
            p.causale,
            p.modalita_lavoro,
            p.giustificativo_trasferta_path,
            p.protocollo_malattia,
            p.data_inizio_malattia,
            p.data_fine_malattia,
            p.giustificativo_infortunio_path,
            p.stato
        FROM presenze p
        JOIN dipendenti d ON d.id = p.dipendente_id
        JOIN users u ON u.id = d.user_id
        WHERE MONTH(p.data) = %s AND YEAR(p.data) = %s AND p.stato = 'approvato'
        ORDER BY u.name, p.data
    """

    cursor.execute(query, (mese, anno))
    righe = cursor.fetchall()
    
    # Ottieni le ore settimanali previste per ogni dipendente
    orari_query = """
        SELECT 
            d.id AS dipendente_id,
            d.percentuale_part_time,
            COALESCE(rc.ore_settimanali_teoriche, 40) AS ore_settimanali_teoriche
        FROM dipendenti d
        LEFT JOIN contratti c ON d.contratto_id = c.id
        LEFT JOIN (
            SELECT contratto_id, MAX(ore_settimanali_teoriche) as ore_settimanali_teoriche
            FROM regole_calcolo_contratto
            GROUP BY contratto_id
        ) rc ON c.id = rc.contratto_id
    """
    cursor.execute(orari_query)
    orari_dipendenti = cursor.fetchall()
    orari_map = {str(row['dipendente_id']): {
        'percentuale_part_time': float(row['percentuale_part_time']),
        'ore_settimanali_teoriche': float(row['ore_settimanali_teoriche'])
    } for row in orari_dipendenti}
    
    cursor.close()
    conn.close()

    colonne_dettaglio = [
        'Dipendente', 'Codice Fiscale', 'Data', 'Ore Ordinarie',
        'Ore Eccedenti', 'Ore Straordinarie', 'Codice Paga', 'Ore Causale', 'Modalità Lavoro',
        'Giustificativo Trasferta', 'Protocollo Malattia',
        'Giustificativo Infortunio'
    ]

    if not righe:
        df_dettaglio = pd.DataFrame(columns=colonne_dettaglio)
        df_riepilogo = pd.DataFrame(columns=[
            'Dipendente', 'Codice Fiscale', 'Periodo', 'Totale Ore Ordinarie',
            'Totale Ore Supplementari', 'Totale Ore Straordinarie', 'Totale Ferie', 'Totale Permessi',
            'Totale Malattia'
        ])
    else:
        df = pd.DataFrame(righe)
        df['codice_paga'] = df['causale'].map(MAPPA_CODICI_PAGHE)
        df['modalita_label'] = df['modalita_lavoro'].map(MAPPA_MODALITA).fillna('')

        def crea_link(path):
            if isinstance(path, str) and path.strip():
                return BASE_URL_STORAGE + path
            return ''

        df['link_trasferta'] = df['giustificativo_trasferta_path'].apply(crea_link)
        df['link_infortunio'] = df['giustificativo_infortunio_path'].apply(crea_link)
        
        # Per le righe di malattia, svuota il giustificativo Trasferta
        # (non dovrebbe esserci un allegato per la malattia)
        df.loc[df['causale'] == 'malattia', 'giustificativo_trasferta_path'] = None
        df.loc[df['causale'] == 'malattia', 'link_trasferta'] = ''

        df_dettaglio = df[[
            'nome_dipendente', 'codice_fiscale', 'data',
            'ore_ordinarie', 'ore_eccedenti', 'ore_straordinarie', 'codice_paga', 'ore_causale', 'modalita_label',
            'link_trasferta', 'protocollo_malattia',
            'link_infortunio'
        ]].copy()
        df_dettaglio.columns = colonne_dettaglio

        mesi_italiani = [
            '', 'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
            'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
        ]
        periodo = f"{mesi_italiani[mese]} {anno}"

        riepilogo = []
        for (nome, cf, pt), gruppo in df.groupby(['nome_dipendente', 'codice_fiscale', 'percentuale_part_time']):
            # Calcola totali per il dipendente
            totale_ordinarie = gruppo['ore_ordinarie'].astype(float).sum()
            totale_eccedenti = gruppo['ore_eccedenti'].astype(float).sum()
            totale_straordinarie_dirette = gruppo['ore_straordinarie'].astype(float).sum()
            
            # Ottieni ore settimanali previste per il dipendente (full-time del CCNL)
            dipendente_id = gruppo['dipendente_id'].iloc[0]
            orari_info = orari_map.get(str(dipendente_id), {})
            ore_settimanali_full_time_ccnl = orari_info.get('ore_settimanali_teoriche', 40.0)
            
            # Calcola limite mensile: 52 settimane / 12 mesi = 4.333... settimane/mese
            ore_mensili_full_time = ore_settimanali_full_time_ccnl * (52 / 12)
            
            # Per part-time: calcola supplementari mensili
            if float(pt) < 100:
                # Ore settimanali PT (già scontate dalla percentuale)
                ore_settimanali_pt = ore_settimanali_full_time_ccnl * (float(pt) / 100)
                ore_mensili_pt = ore_settimanali_pt * (52 / 12)
                
                # Calcola totale ore eccedenti mensili
                # Note: per part-time le straordinarie dirette dovrebbero essere 0,
                # ma le includiamo per retrocompatibilità con dati storici
                totale_ore_eccedenti_mensile = totale_eccedenti + totale_straordinarie_dirette
                
                # Logica di suddivisione MENSILE:
                # - Fino a ore_mensili_pt: sono ore ordinarie (già conteggiate in totale_ordinarie)
                # - Da ore_mensili_pt a ore_mensili_full_time: sono supplementari
                # - Oltre ore_mensili_full_time: sono straordinarie
                
                # Supplementari: la parte di eccedenti che non supera il full-time mensile del CCNL
                totale_supplementari = min(
                    totale_ore_eccedenti_mensile,
                    max(0, ore_mensili_full_time - ore_mensili_pt)
                )
                # Straordinarie: la parte che supera il full-time mensile del CCNL
                totale_straordinarie = max(0, totale_ore_eccedenti_mensile - totale_supplementari)
            else:
                # Per full-time: non ci sono supplementari
                totale_supplementari = 0
                totale_straordinarie = totale_straordinarie_dirette
            
            riepilogo.append({
                'Dipendente': nome,
                'Codice Fiscale': cf,
                'Periodo': periodo,
                'Totale Ore Ordinarie': totale_ordinarie,
                'Totale Ore Supplementari': totale_supplementari,
                'Totale Ore Straordinarie': totale_straordinarie,
                'Totale Ferie': gruppo[gruppo['causale'] == 'ferie']['ore_causale'].astype(float).sum(),
                'Totale Permessi': gruppo[gruppo['causale'] == 'permesso_rol']['ore_causale'].astype(float).sum(),
                'Totale Malattia': gruppo[gruppo['causale'] == 'malattia']['ore_causale'].astype(float).sum(),
            })
        df_riepilogo = pd.DataFrame(riepilogo)

    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df_riepilogo.to_excel(writer, sheet_name='Riepilogo', index=False)
        df_dettaglio.to_excel(writer, sheet_name='Dettaglio Giornaliero', index=False)

        # Trasforma i link in hyperlink cliccabili nel foglio Excel
        sheet = writer.sheets['Dettaglio Giornaliero']
        col_trasferta = colonne_dettaglio.index('Giustificativo Trasferta') + 1
        col_infortunio = colonne_dettaglio.index('Giustificativo Infortunio') + 1

        for row_idx in range(2, len(df_dettaglio) + 2):
            cella_trasferta = sheet.cell(row=row_idx, column=col_trasferta)
            if cella_trasferta.value:
                cella_trasferta.hyperlink = cella_trasferta.value
                cella_trasferta.value = "Apri allegato"
                cella_trasferta.font = Font(color="0563C1", underline="single")

            cella_infortunio = sheet.cell(row=row_idx, column=col_infortunio)
            if cella_infortunio.value:
                cella_infortunio.hyperlink = cella_infortunio.value
                cella_infortunio.value = "Apri allegato"
                cella_infortunio.font = Font(color="0563C1", underline="single")

    output.seek(0)
    return output