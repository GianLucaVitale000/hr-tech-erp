import pandas as pd
from io import BytesIO
from database import get_connection

# Mappa le causali interne sui codici standard richiesti dal software paghe
MAPPA_CODICI_PAGHE = {
    'lavoro': 'ORD',
    'ferie': 'FER',
    'permesso_rol': 'ROL',
    'malattia': 'MAL',
    'maternita': 'MAT',
    'infortunio': 'INF',
    'assemblea': 'ASS',
}

def genera_report_mensile(mese: int, anno: int) -> BytesIO:
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    query = """
        SELECT
            d.id AS dipendente_id,
            u.name AS nome_dipendente,
            d.codice_fiscale,
            DATE_FORMAT(p.data, '%d/%m/%Y') AS data,
            p.ore_ordinarie,
            p.ore_straordinarie,
            p.ore_causale,
            p.causale,
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

    if not righe:
        df_dettaglio = pd.DataFrame(columns=[
            'Dipendente', 'Codice Fiscale', 'Data', 'Ore Ordinarie',
            'Ore Straordinarie', 'Causale', 'Codice Paga'
        ])
        df_riepilogo = pd.DataFrame(columns=[
            'Dipendente', 'Codice Fiscale', 'Periodo', 'Totale Ore Ordinarie',
            'Totale Ore Straordinarie', 'Totale Ferie', 'Totale Permessi',
            'Totale Malattia'
        ])
    else:
        df = pd.DataFrame(righe)
        df['codice_paga'] = df['causale'].map(MAPPA_CODICI_PAGHE)

        # Foglio 1: Dettaglio giornaliero
        df_dettaglio = df[[
            'nome_dipendente', 'codice_fiscale', 'data',
            'ore_ordinarie', 'ore_straordinarie', 'causale', 'codice_paga'
        ]].rename(columns={
            'nome_dipendente': 'Dipendente',
            'codice_fiscale': 'Codice Fiscale',
            'data': 'Data',
            'ore_ordinarie': 'Ore Ordinarie',
            'ore_straordinarie': 'Ore Straordinarie',
            'causale': 'Causale',
            'codice_paga': 'Codice Paga'
        })

        # Foglio 2: Riepilogo per dipendente
        mesi_italiani = [
            '', 'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
            'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
        ]
        periodo = f"{mesi_italiani[mese]} {anno}"

        riepilogo = []
        for (nome, cf), gruppo in df.groupby(['nome_dipendente', 'codice_fiscale']):
            riepilogo.append({
                'Dipendente': nome,
                'Codice Fiscale': cf,
                'Periodo': periodo,
                'Totale Ore Ordinarie': gruppo['ore_ordinarie'].astype(float).sum(),
                'Totale Ore Straordinarie': gruppo['ore_straordinarie'].astype(float).sum(),
                'Totale Ferie': gruppo[gruppo['causale'] == 'ferie']['ore_causale'].astype(float).sum(),
                'Totale Permessi': gruppo[gruppo['causale'] == 'permesso_rol']['ore_causale'].astype(float).sum(),
                'Totale Malattia': gruppo[gruppo['causale'] == 'malattia']['ore_causale'].astype(float).sum(),
            })
        df_riepilogo = pd.DataFrame(riepilogo)

    # Scrive entrambi i fogli in un unico file Excel in memoria
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df_riepilogo.to_excel(writer, sheet_name='Riepilogo', index=False)
        df_dettaglio.to_excel(writer, sheet_name='Dettaglio Giornaliero', index=False)

    output.seek(0)
    return output
