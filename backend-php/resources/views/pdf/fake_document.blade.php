<!DOCTYPE html>
<html>
<head>
    <title>{{ $tipo }}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            font-size: 12px;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 1px solid #ccc;
            padding-bottom: 10px;
        }
        .content {
            margin-top: 20px;
            line-height: 1.6;
        }
        .footer {
            margin-top: 40px;
            font-size: 10px;
            color: #666;
            text-align: center;
            border-top: 1px solid #ccc;
            padding-top: 10px;
        }
        strong {
            font-weight: bold;
        }
        h2 {
            margin: 0;
            font-size: 16px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h2>GIUSTIFICATIVO {{ strtoupper(str_replace('_', ' ', $tipo)) }}</h2>
        <p><strong>Protocollo:</strong> {{ $protocollo }}</p>
    </div>

    <div class="content">
        <p><strong>Dipendente:</strong> {{ $dipendente->user->name ?? ($dipendente->codice_fiscale ?? 'N/D') }}</p>
        <p><strong>Data:</strong> {{ $data->format('d/m/Y') }}</p>
        <p><strong>Contenuto:</strong></p>
        <p>{{ $contenuto }}</p>
    </div>

    <div class="footer">
        <p>Documento generato automaticamente - Non valido a fini legali</p>
        <p>Sistema HR-Tech ERP - Seeder Fake Data</p>
    </div>
</body>
</html>