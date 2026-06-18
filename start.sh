#!/bin/bash

echo "🚀 Avvio HR-Tech ERP..."

# Laravel
cd ~/hr-tech-erp/backend-php
php artisan serve &

# Python
cd ~/hr-tech-erp/microservice-python
source venv/bin/activate
uvicorn main:app --reload --port 8001 &

# React
cd ~/hr-tech-erp/frontend-react
npm run dev &

echo "✅ Tutti i server sono avviati!"
echo "   Laravel  → http://localhost:8000"
echo "   React    → http://localhost:5173"
echo "   Python   → http://localhost:8001"
echo ""
echo "Per fermare tutto: ./stop.sh"
