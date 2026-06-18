#!/bin/bash

echo "🛑 Stop HR-Tech ERP..."
pkill -f "php artisan serve"
pkill -f "uvicorn"
pkill -f "vite"
echo "✅ Tutti i server fermati!"
