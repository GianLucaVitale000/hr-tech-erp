from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from services.excel_exporter import genera_report_mensile

app = FastAPI(title="HR-Tech ERP - Microservizio Python")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Microservizio Python attivo"}

@app.get("/export/paghe")
def export_paghe(mese: int, anno: int):
    file_excel = genera_report_mensile(mese, anno)

    return StreamingResponse(
        file_excel,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename=paghe_{mese}_{anno}.xlsx"
        }
    )