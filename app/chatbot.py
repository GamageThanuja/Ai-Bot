import os
from langchain_community.document_loaders import PyPDFLoader
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain.indexes import VectorstoreIndexCreator
from langchain.chains import RetrievalQA
from langchain.text_splitter import RecursiveCharacterTextSplitter
from dotenv import load_dotenv
load_dotenv()
os.environ["TOKENIZERS_PARALLELISM"] = "false"

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
llm = ChatOpenAI(model="gpt-4.1-mini", temperature=0, openai_api_key=OPENAI_API_KEY)

def load_chain():
    pdf_path = "hotemate.pdf"
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"{pdf_path} not found.")

    loader = PyPDFLoader(pdf_path)
    index = VectorstoreIndexCreator(
        embedding=OpenAIEmbeddings(openai_api_key=OPENAI_API_KEY),
        text_splitter=RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    ).from_loaders([loader])

    chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=index.vectorstore.as_retriever(search_kwargs={"k": 3}),
        return_source_documents=True
    )
    return chain