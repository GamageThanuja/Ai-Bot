import os
import pdfplumber
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain.indexes import VectorstoreIndexCreator
from langchain.chains import RetrievalQA
from langchain.text_splitter import RecursiveCharacterTextSplitter
from dotenv import load_dotenv
load_dotenv()
os.environ["TOKENIZERS_PARALLELISM"] = "false"

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
llm = ChatOpenAI(model="gpt-4.1-mini", temperature=0, openai_api_key=OPENAI_API_KEY)

HOTEL_KEYWORDS = [
    # Existing keywords...
    "hotel", "room", "reservation", "check-in", "check-out", "amenities", "service", "booking", "restaurant", "spa", "pool", "parking", "location", "price", "availability", "guest", "staff", "facilities", "wifi", "breakfast", "dining", "policies", "cancellation", "payment", "reviews", "accommodation", "suite", "conference", "event", "cleaning", "housekeeping", "security", "transport", "shuttle", "pet", "accessibility", "special request",
    
    # Add these missing keywords:
    "front desk", "layout", "meal plan", "invoice", "charges", "discount", "credit", "financials", "folio", "deposit", "document", "upload", "login", "password", "qr code", "property", "currency", "subscription", "plan", "signup", "verification", "code", "email address", "secure password",
    
    "smoking policy", "fitness center", "late checkout", "business center", "luggage", "noise policy", "towels", "group discounts", "ice machines", "lost and found", "receipt", "package deals", "pillows", "minibar", "pricing", "corporate rates", "seasonal", "promotions", "long-term", "rates",
    
    "emergency", "procedures", "medical", "dietary", "requirements", "maintenance", "billing", "inquiry", "insurance", "coverage", "damage", "identification", "meal plans", "extra beds", "excursion", "airport pickup", "half board", "full board", "vegetarian", "meals", "no-shows", "checkout time", "currencies", "tour packages", "laundry", "confirm", "tentative", "status", "visa", "rollback",
    
    "lunch", "dinner", "configure", "images", "types", "select", "profile", "setup", "steps", "process","sign up", "account", "designated", "areas"
]

DEFAULT_OUT_OF_DOMAIN_RESPONSE = (
    "I'm here to help with hotel-related questions. For other topics, please consult the appropriate resources or services."
)

SIMILARITY_THRESHOLD = 0.6  # Adjust as needed

def is_hotel_query(query: str) -> bool:
    query_lower = query.lower()
    
    # Exclude non-hotel contexts
    exclusions = [
        "paint a room", "painting", 
        "speak spanish", "learn spanish", "speak french", "learn french",
        "grow plants", "growing plants",
        "write code", "coding", "programming",
        "dinner tonight", "what's for dinner",
        "retirement planning", "investment planning"
    ]
    
    if any(exclusion in query_lower for exclusion in exclusions):
        return False
        
    return any(keyword in query_lower for keyword in HOTEL_KEYWORDS)

def filter_response(query: str, result: dict) -> str:
    # Check if query is hotel-related
    if not is_hotel_query(query):
        return DEFAULT_OUT_OF_DOMAIN_RESPONSE

    # Confidence thresholding: check similarity scores
    source_docs = result.get('source_documents', [])
    if source_docs:
        # If similarity score is available in metadata, use it
        for doc in source_docs:
            score = doc.metadata.get('similarity', None)
            if score is not None and score < SIMILARITY_THRESHOLD:
                return "I'm not confident enough to answer this question based on the available hotel information."
    # Otherwise, return the answer
    response = result.get('result', '')
    return response
def load_chain(pdf_folder="pdfs"):
    pdf_files = [os.path.join(pdf_folder, f) for f in os.listdir(pdf_folder) if f.lower().endswith(".pdf")]
    if not pdf_files:
        raise FileNotFoundError(f"No PDF files found in {pdf_folder}.")

    documents = []
    for pdf_file in pdf_files:
        with pdfplumber.open(pdf_file) as pdf:
            text = "\n".join(page.extract_text() or "" for page in pdf.pages)
        if text.strip():
            documents.append(Document(page_content=text, metadata={"source": pdf_file}))

    if not documents:
        raise ValueError("No text extracted from PDFs.")

    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    docs = text_splitter.split_documents(documents)
    embeddings = OpenAIEmbeddings(openai_api_key=OPENAI_API_KEY)
    index = VectorstoreIndexCreator(embedding=embeddings, text_splitter=text_splitter).from_documents(docs)

    chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=index.vectorstore.as_retriever(search_kwargs={"k": 3}),
        return_source_documents=True
    )
    return chain