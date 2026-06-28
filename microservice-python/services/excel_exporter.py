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
            p.ore_ordinarie,
            p.ore_supplementari,
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
    cursor.close()
    conn.close()

    colonne_dettaglio = [
        'Dipendente', 'Codice Fiscale', 'Data', 'Ore Ordinarie',
        'Ore Supplementari', 'Ore Straordinarie', 'Causale', 'Codice Paga', 'Modalità Lavoro',
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
            'ore_ordinarie', 'ore_supplementari', 'ore_straordinarie', 'causale', 'codice_paga',
            'modalita_label', 'link_trasferta', 'protocollo_malattia',
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
            # Calcola totale ore supplementari solo per part-time
            totale_supplementari = gruppo['ore_supplementari'].astype(float).sum() if float(pt) < 100 else 0
            
            riepilogo.append({
                'Dipendente': nome,
                'Codice Fiscale': cf,
                'Periodo': periodo,
                'Totale Ore Ordinarie': gruppo['ore_ordinarie'].astype(float).sum(),
                'Totale Ore Supplementari': totale_supplementari,
                'Totale Ore Straordinarie': gruppo['ore_straordinarie'].astype(float).sum(),
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