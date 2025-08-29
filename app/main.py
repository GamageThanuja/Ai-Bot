from fastapi import FastAPI, HTTPException, Request, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from app.chatbot import load_chain, filter_response, is_hotel_query, DEFAULT_OUT_OF_DOMAIN_RESPONSE
import base64
from langchain_core.messages import HumanMessage
from langchain_openai import ChatOpenAI

app = FastAPI()
app.mount("/static", StaticFiles(directory="app/static"), name="static")
qa_chain = load_chain()
templates = Jinja2Templates(directory="app/templates")

# Allowed image MIME types for attachments
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}

# A lightweight vision LLM instance for handling image questions directly
vision_llm = ChatOpenAI(model="gpt-4.1-mini", temperature=0)

# ---- Helpers ---------------------------------------------------------------
async def detect_hotel_from_image(b64_data: str, mime_type: str) -> tuple[bool, str]:
    """Use the vision model to quickly OCR/summarize the image and decide hotel-relevance.
    Returns (is_hotel_related, extracted_text_or_summary).
    """
    probe = [
        HumanMessage(content=[
            {"type": "text", "text": (
                "You will receive an image. First, read any visible text (OCR) and UI labels. "
                "Then produce a short summary (one paragraph). Finally, output ONLY a list of 8-15 keywords "
                "that best describe the domain (e.g., reservation, room, hotel, check-in, invoice, etc.). "
                "Format your response as JSON with keys: summary, keywords (array of strings).")},
            {"type": "image", "source_type": "base64", "mime_type": mime_type, "data": b64_data},
        ])
    ]
    try:
        msg = vision_llm.invoke(probe)
        text = getattr(msg, "content", "") or ""
    except Exception:
        return False, ""

    # Very light-weight JSON-ish extraction without importing json in case of minor format drift
    summary = ""
    keywords_blob = ""
    if '"summary"' in text:
        try:
            import json as _json
            obj = _json.loads(text)
            summary = obj.get("summary", "") or ""
            kws = obj.get("keywords", []) or []
            keywords_blob = ", ".join(kws)
        except Exception:
            summary = text
    else:
        summary = text

    combined_text = f"{summary}\n{keywords_blob}".strip()
    return is_hotel_query(combined_text), combined_text


def retrieve_context(query_text: str, limit_chars: int = 2000) -> str:
    """Pull relevant snippets from the PDF index to ground answers.
    Falls back gracefully if retriever is unavailable.
    """
    try:
        retriever = getattr(qa_chain, "retriever", None)
        if retriever is None:
            # Try invoking the chain to get source docs
            result = qa_chain.invoke({"query": query_text})
            source_docs = result.get("source_documents", [])
        else:
            source_docs = retriever.get_relevant_documents(query_text)
    except Exception:
        source_docs = []

    # Concatenate text with a soft limit
    buf = []
    total = 0
    for d in source_docs:
        chunk = getattr(d, "page_content", "") or ""
        if not chunk:
            continue
        if total + len(chunk) > limit_chars:
            chunk = chunk[: max(0, limit_chars - total)]
        buf.append(chunk)
        total += len(chunk)
        if total >= limit_chars:
            break
    return "\n\n".join(buf).strip()

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


# New endpoint: /chat-image
@app.post("/chat-image")
async def chat_image(query: str = Form(""), image: UploadFile = File(...)):
    """Handle a chat turn that includes ONE image attachment.
    Accepts: multipart/form-data with fields `image` (file) and optional `query` (text).
    Uses GPT-4.1-mini in vision mode to answer about the image.
    """
    # Determine if the request should be allowed (text OR image-derived hotel relevance)
    allow = is_hotel_query((query or ""))

    # Read and base64-encode the image so we can inspect it and pass it inline
    raw = await image.read()
    b64 = base64.b64encode(raw).decode("utf-8")

    extracted_from_image = ""
    if not allow:
        # Probe the image for hotel signals (OCR + keywords)
        allow, extracted_from_image = await detect_hotel_from_image(b64, image.content_type)

    if not allow:
        return {"response": DEFAULT_OUT_OF_DOMAIN_RESPONSE}

    if image.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=415, detail="Only JPEG, PNG, or WEBP images are supported.")

    # Build a retrieval query combining user text and any extracted hints
    retrieval_query = " ".join([s for s in [(query or "").strip(), extracted_from_image] if s]).strip() or "hotel reservation guidance"
    context_snippets = retrieve_context(retrieval_query)

    # Build multimodal message content (vision + RAG context)
    content_blocks = []
    user_instruction = (query or "Explain the image relevant to hotel operations.").strip()
    content_blocks.append({
        "type": "text",
        "text": (
            "You are a hotel-operations assistant. Answer clearly and step-by-step.\n" 
            + (f"User request: {user_instruction}\n" if user_instruction else "")
            + ("If any numbers/policies are unclear, say so.\n"))
    })

    if context_snippets:
        content_blocks.append({
            "type": "text",
            "text": (
                "Reference context from hotel PDFs (may be relevant):\n" + context_snippets[:2000]
            )
        })

    # Include a short image-derived summary so the model can tie it to context
    if extracted_from_image:
        content_blocks.append({"type": "text", "text": f"Image OCR/summary hints: {extracted_from_image[:800]}"})

    content_blocks.append({
        "type": "image",
        "source_type": "base64",
        "mime_type": image.content_type,
        "data": b64,
    })

    try:
        ai_msg = vision_llm.invoke([HumanMessage(content=content_blocks)])
        reply = getattr(ai_msg, "content", str(ai_msg)) or "I couldn't read that image. Try a clearer photo."

        # Normalize prefixes similar to /chat
        for prefix in ["According to the provided context, ", "According to the context, "]:
            if reply.startswith(prefix):
                reply = reply[len(prefix):]
        if reply and reply[0].islower():
            reply = reply[0].upper() + reply[1:]

        return {"response": reply}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))