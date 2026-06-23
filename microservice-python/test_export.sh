#!/bin/bash
# Script di test per generare un file Excel di export al volo
# Uso: ./test_export.sh [mese] [anno]
# Esempio: ./test_export.sh 6 2026

MESE=${1:-6}
ANNO=${2:-2026}

mkdir -p test-output

echo "📊 Generazione report per $MESE/$ANNO..."

curl -s "http://localhost:8001/export/paghe?mese=$MESE&anno=$ANNO" \
  --output "test-output/paghe_${MESE}_${ANNO}.xlsx"

echo "✅ File generato: test-output/paghe_${MESE}_${ANNO}.xlsx"
echo ""
echo "Contenuto foglio Riepilogo:"

source venv/bin/activate
python3 -c "
import pandas as pd
df = pd.read_excel('test-output/paghe_${MESE}_${ANNO}.xlsx', sheet_name='Riepilogo')
print(df.to_string(index=False))
"
