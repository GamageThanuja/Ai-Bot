from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from app.chatbot import load_chain, filter_response

app = FastAPI()
app.mount("/static", StaticFiles(directory="app/static"), name="static")
qa_chain = load_chain()
templates = Jinja2Templates(directory="app/templates")

class QueryRequest(BaseModel):
    query: str

@app.get("/", response_class=HTMLResponse)
def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/chat")
def chat(request: QueryRequest):
    try:
        result = qa_chain.invoke({"query": request.query})
        response = filter_response(request.query, result)

        for prefix in ["According to the provided context, ", "According to the context, "]:
            if response.startswith(prefix):
                response = response[len(prefix):]
        if response and response[0].islower():
            response = response[0].upper() + response[1:]

        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))