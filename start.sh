#!/bin/bash

echo "🚀 Avvio HR-Tech ERP..."

# Laravel (porta 8000)
cd ~/hr-tech-erp/backend-php
php artisan serve --port=8000 &

# Aspetta che Laravel parta
sleep 3

# Python (porta 8001)
cd ~/hr-tech-erp/microservice-python
source venv/bin/activate
uvicorn main:app --reload --port=8001 &

# Aspetta che Python parta
sleep 2

# React (porta 5173)
cd ~/hr-tech-erp/frontend-react
npm run dev -- --port=5173 &

echo "✅ Tutti i server sono avviati!"
echo "   Laravel  → http://localhost:8000"
echo "   React    → http://localhost:5173"
echo "   Python   → http://localhost:8001"
echo ""
echo "Per fermare tutto: ./stop.sh"
