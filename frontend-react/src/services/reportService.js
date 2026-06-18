export const downloadExcelReport = async (mese, anno) => {
  const response = await fetch(
    `http://localhost:8001/export/paghe?mese=${mese}&anno=${anno}`,
    { method: 'GET' }
  );
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `paghe_${mese}_${anno}.xlsx`;
  a.click();
};
