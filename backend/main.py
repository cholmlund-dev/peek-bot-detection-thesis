from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
import asyncio
import os

app = FastAPI()

@app.post("/verify")
async def verify_user(request: Request):
    data = await request.json()
    print("Backend mottog data:", data)
    
    await asyncio.sleep(2) 
    
    return {"status": "success", "message": "Verifiering godkänd."}

@app.get("/", response_class=HTMLResponse)
async def serve_frontend():
    # Peka ut sökvägen till er HTML-fil
    html_file_path = os.path.join("frontend", "index.html")
    
    # Läs innehållet i filen och returnera det
    with open(html_file_path, "r", encoding="utf-8") as file:
        html_content = file.read()
        
    return html_content