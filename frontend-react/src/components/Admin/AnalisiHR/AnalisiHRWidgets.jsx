import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

export function AnalisiHRWidgets({ datiAnnuali, formatValue }) {
  const giorniLavoratiData = [
    { name: 'Lavorati', value: datiAnnuali.giorniLavorati, color: '#3b82f6' },
    { 
      name: 'Non lavorati', 
      value: Math.max(0, datiAnnuali.giorniTeoriciLavorabili - datiAnnuali.giorniLavorati), 
      color: 'var(--donut-stroke)'
    }
  ]

  return (
    <div className="analisi-hr-widgets">
      {/* Ore Ordinarie */}
      <div className="analisi-hr-widget">
        <div className="analisi-hr-widget-title">Ore Ordinarie</div>
        <div className="analisi-hr-widget-value">{formatValue(datiAnnuali.oreOrdinarie)} ore</div>
        <div className="analisi-hr-widget-subtitle">Totale annuale</div>
      </div>

      {/* Straordinari / Eccedenti */}
      {datiAnnuali.isFullTime && (
        <div className="analisi-hr-widget">
          <div className="analisi-hr-widget-title">Straordinari</div>
          <div className="analisi-hr-widget-value">{formatValue(datiAnnuali.oreStraordinarie)} ore</div>
          <div className="analisi-hr-widget-subtitle">Tempo Pieno</div>
        </div>
      )}
      {!datiAnnuali.isFullTime && (
        <div className="analisi-hr-widget">
          <div className="analisi-hr-widget-title">Ore Eccedenti</div>
          <div className="analisi-hr-widget-value">{formatValue(datiAnnuali.oreEccedenti)} ore</div>
          <div className="analisi-hr-widget-subtitle">Part-time</div>
        </div>
      )}

      {/* Giorni Lavorati - Donut Chart */}
      <div className="analisi-hr-widget">
        <div className="analisi-hr-widget-title">Giorni Lavorati</div>
        <div className="analisi-hr-widget-content analisi-hr-widget-donut">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={giorniLavoratiData}
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={40}
                fill="#8884d8"
                dataKey="value"
                labelLine={false}
                isAnimationActive={false}
              >
                {giorniLavoratiData.map((entry, index) => (
                  <Cell key={`cell-giorni-${index}`} fill={entry.color} />
                ))}
              </Pie> 
            </PieChart>
          </ResponsiveContainer>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: 'var(--text-color)',
            fontSize: '0.65rem',
            fontWeight: '700',
            paddingLeft: '6px',
            paddingRight: '6px'
          }}>
            {datiAnnuali.giorniLavorati} gg
          </div>
        </div>
      </div>

      {/* Giorni Teorici Lavorabili */}
      <div className="analisi-hr-widget">
        <div className="analisi-hr-widget-title">Giorni Teorici</div>
        <div className="analisi-hr-widget-value">{datiAnnuali.giorniTeoriciLavorabili} gg</div>
        <div className="analisi-hr-widget-subtitle">{datiAnnuali.giorniSettimanali} gg./sett.</div>
      </div>

      {/* Ferie/Permessi - UNIFICATO */}
      <div className="analisi-hr-widget">
        <div className="analisi-hr-widget-title">Ferie/Permessi</div>
        <div className="analisi-hr-widget-value">{formatValue(datiAnnuali.feriePermessi)} ore</div>
        <div className="analisi-hr-widget-subtitle">Goduto aggregato</div>
      </div>

      {/* PR */}
      <div className="analisi-hr-widget">
        <div className="analisi-hr-widget-title">PR</div>
        <div className="analisi-hr-widget-value">{formatValue(datiAnnuali.pr)} ore</div>
        <div className="analisi-hr-widget-subtitle">Permessi Retribuiti</div>
      </div>

      {/* PNR */}
      <div className="analisi-hr-widget">
        <div className="analisi-hr-widget-title">PNR</div>
        <div className="analisi-hr-widget-value">{formatValue(datiAnnuali.pnr)} ore</div>
        <div className="analisi-hr-widget-subtitle">Permessi Non Retribuiti</div>
      </div>

      {/* INPS */}
      <div className="analisi-hr-widget">
        <div className="analisi-hr-widget-title">INPS</div>
        <div className="analisi-hr-widget-value">{formatValue(datiAnnuali.inps)} ore</div>
        <div className="analisi-hr-widget-subtitle">Malattia + Maternità</div>
      </div>

      {/* INAIL */}
      <div className="analisi-hr-widget">
        <div className="analisi-hr-widget-title">INAIL</div>
        <div className="analisi-hr-widget-value">{formatValue(datiAnnuali.inail)} ore</div>
        <div className="analisi-hr-widget-subtitle">Infortunio</div>
      </div>

      {/* CIG */}
      <div className="analisi-hr-widget">
        <div className="analisi-hr-widget-title">CIG</div>
        <div className="analisi-hr-widget-value">{formatValue(datiAnnuali.cig)} ore</div>
        <div className="analisi-hr-widget-subtitle">Cassa Integrazione</div>
      </div>

      {/* Sindacale */}
      <div className="analisi-hr-widget">
        <div className="analisi-hr-widget-title">Sindacale</div>
        <div className="analisi-hr-widget-value">{formatValue(datiAnnuali.sindacale)} ore</div>
        <div className="analisi-hr-widget-subtitle">Assemblea + Sciopero</div>
      </div>
    </div>
  )
}
