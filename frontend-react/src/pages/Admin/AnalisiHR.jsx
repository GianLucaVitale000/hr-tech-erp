import { useAnalisiHRData } from '../../hooks/useAnalisiHRData'
import { AnalisiHRSelection } from '../../components/Admin/AnalisiHR/AnalisiHRSelection'
import { AnalisiHRWidgets } from '../../components/Admin/AnalisiHR/AnalisiHRWidgets'
import { TassoAssenzaCard } from '../../components/Admin/AnalisiHR/TassoAssenzaCard'
import { PermessiLavoroCard } from '../../components/Admin/AnalisiHR/PermessiLavoroCard'
import { FeriePermessiCard } from '../../components/Admin/AnalisiHR/FeriePermessiCard'
import { OreExtraordinarieCard } from '../../components/Admin/AnalisiHR/OreExtraordinarieCard'

export default function AnalisiHR() {
  const {
    dipendenti,
    dipendenteSelezionato,
    handleDipendenteChange,
    annoSelezionato,
    setAnnoSelezionato,
    analisiFerie,
    datiMensualiOreExtraordinarie,
    mesiConsecutiviSelezionati,
    setMesiConsecutiviSelezionati,
    datiAnnuali,
    datiDipendentePerAnalisi,
    annoCorrente,
    annoAssunzioneSelezionato,
    getDipendenteInfo,
    formatValue
  } = useAnalisiHRData()

  return (
    <div className="analisi-hr-container">
      <h1 className="analisi-hr-title">Analisi HR</h1>

      {/* Selezione Dipendente e Anno */}
      <AnalisiHRSelection
        dipendenti={dipendenti}
        dipendenteSelezionato={dipendenteSelezionato}
        handleDipendenteChange={handleDipendenteChange}
        annoSelezionato={annoSelezionato}
        setAnnoSelezionato={setAnnoSelezionato}
        annoAssunzioneSelezionato={annoAssunzioneSelezionato}
        annoCorrente={annoCorrente}
        getDipendenteInfo={getDipendenteInfo}
      />

      {/* Widget con contatori annuali - Ricalco esatto fogli presenze */}
      <AnalisiHRWidgets
        datiAnnuali={datiAnnuali}
        formatValue={formatValue}
      />

      {/* Prima riga: Card 1 e Card 2 */}
      <div className="analisi-hr-row-center">
        {/* Card 1: Tasso di assenza individuale */}
        <TassoAssenzaCard
          dipendenteSelezionato={dipendenteSelezionato}
          annoSelezionato={annoSelezionato}
          datiAnnuali={datiAnnuali}
          formatValue={formatValue}
        />

        {/* Card 2: Ripartizione PR, PNR, CIG, Sind / Modalità lavoro */}
        <PermessiLavoroCard
          dipendenteSelezionato={dipendenteSelezionato}
          annoSelezionato={annoSelezionato}
          datiAnnuali={datiAnnuali}
          formatValue={formatValue}
        />
      </div>

      {/* Seconda riga: Card 3 e Card 4 */}
      <div className="analisi-hr-row-wrap">
        {/* Card 3: Ferie/Permessi */}
        <FeriePermessiCard
          dipendenteSelezionato={dipendenteSelezionato}
          annoSelezionato={annoSelezionato}
          analisiFerie={analisiFerie}
          formatValue={formatValue}
        />

        {/* Card 4: Ore Straordinarie / Eccedenti */}
        <OreExtraordinarieCard
          dipendenteSelezionato={dipendenteSelezionato}
          annoSelezionato={annoSelezionato}
          datiAnnuali={datiAnnuali}
          datiMensualiOreExtraordinarie={datiMensualiOreExtraordinarie}
          mesiConsecutiviSelezionati={mesiConsecutiviSelezionati}
          setMesiConsecutiviSelezionati={setMesiConsecutiviSelezionati}
          datiDipendentePerAnalisi={datiDipendentePerAnalisi}
          formatValue={formatValue}
        />
      </div>
    </div>
  )
}
