# PDF Question Answering Backend with RAG (Langchain & Groq)

## Overview

This project is a Node.js backend service built with Express.js that allows users to upload PDF documents and ask questions about their content. It leverages the Retrieval-Augmented Generation (RAG) pattern using LangchainJS, Google Generative AI for embeddings, and Groq for fast Large Language Model (LLM) inference.

The core workflow involves:
1.  Accepting PDF file uploads.
2.  Processing the PDF: Loading content, splitting it into manageable chunks, and generating vector embeddings for each chunk.
3.  Storing these embeddings in an in-memory vector store.
4.  Providing an endpoint to receive user questions.
5.  Retrieving relevant document chunks based on the question's similarity to the stored embeddings.
6.  Generating a comprehensive answer by feeding the retrieved context and the original question to an LLM hosted on Groq.

**Disclaimer:** This implementation uses an **in-memory vector store**, meaning it only retains the context of the **last uploaded document** and the data is lost when the server restarts. It's suitable for demonstration or single-user scenarios but requires modification (e.g., using a persistent vector store like ChromaDB, Pinecone, Weaviate) for production or multi-user environments.

## Features

*   **PDF Upload:** Securely handles PDF file uploads using `multer`.
*   **Document Processing:** Loads and parses PDF content using `PDFLoader`.
*   **Text Chunking:** Splits documents intelligently into overlapping chunks using `RecursiveCharacterTextSplitter`.
*   **Vector Embeddings:** Generates high-quality document embeddings using Google's `text-embedding-004` model via `@langchain/google-genai`.
*   **In-Memory Vector Storage:** Stores document vectors using `MemoryVectorStore` for fast retrieval (with limitations mentioned above).
*   **Retrieval-Augmented Generation (RAG):**
    *   Uses `LangGraph` to define and execute a stateful RAG workflow.
    *   Retrieves relevant context chunks based on question similarity.
    *   Uses a pre-defined RAG prompt template pulled from Langchain Hub (`rlm/rag-prompt`).
*   **LLM Integration:** Generates answers using a powerful LLM (`llama-3.3-70b-versatile`) hosted on the Groq platform via `ChatGroq` for low-latency responses.
*   **API Endpoints:** Provides clear endpoints for uploading files and retrieving answers.

## Architecture & How it Works

The application follows the RAG pattern orchestrated by LangGraph:

1.  **File Upload (`/api/uploadFile`)**:
    *   A `POST` request with a `multipart/form-data` payload containing the PDF file (field name: `document`) is received.
    *   `multer` saves the file temporarily to the `temp_files` directory.
    *   `PDFLoader` loads the document content.
    *   `RecursiveCharacterTextSplitter` divides the document(s) into smaller, overlapping text chunks.
    *   `GoogleGenerativeAIEmbeddings` calculates vector embeddings for each chunk.
    *   A **new** `MemoryVectorStore` is created and populated with the chunks and their embeddings. **This replaces any previously stored vectors.**
    *   The temporary PDF file is deleted.
    *   A success message indicating the file is processed is returned.

2.  **Question Answering (`/api/retrieve`)**:
    *   A `POST` request with a JSON body containing the `question` is received.
    *   The `LangGraph` instance is invoked with the initial state (`question`).
    *   **`retrieve` Node:** This node accesses the globally stored `MemoryVectorStore` (containing the vectors from the *last* uploaded PDF) and performs a similarity search using the input `question`. It returns the most relevant document chunks (`context`).
    *   **`generate` Node:** This node receives the `question` and the retrieved `context`. It formats these into a prompt using the `ChatPromptTemplate` (pulled from Langchain Hub).
    *   The formatted prompt is sent to the `ChatGroq` LLM (`llama-3.3-70b-versatile`).
    *   The LLM generates an answer based on the provided context and question.
    *   The final state containing the `answer` is returned by the graph.
    *   The API responds with the generated `answer`.

## Technology Stack

*   **Backend Framework:**
    *   **Node.js:** JavaScript runtime environment.
    *   **Express.js:** Minimalist web application framework for Node.js, used for routing and handling HTTP requests.
*   **Middleware:**
    *   **`cors`:** Enables Cross-Origin Resource Sharing, allowing requests from different origins (e.g., a frontend application).
    *   **`multer`:** Middleware for handling `multipart/form-data`, primarily used for file uploads.
*   **AI / LangchainJS:**
    *   **`@langchain/community/document_loaders/fs/pdf` (`PDFLoader`):** Loads PDF documents from the filesystem.
    *   **`@langchain/textsplitters` (`RecursiveCharacterTextSplitter`):** Splits text into smaller chunks based on character count with overlap.
    *   **`@langchain/google-genai` (`GoogleGenerativeAIEmbeddings`):** Generates text embeddings using Google's AI models (specifically `text-embedding-004`). Embeddings convert text into numerical vectors for similarity comparisons.
    *   **`langchain/vectorstores/memory` (`MemoryVectorStore`):** An in-memory database for storing and searching vector embeddings. Simple but not persistent.
    *   **`@langchain/groq` (`ChatGroq`):** Integrates with the Groq API to access high-speed LLMs (like Llama 3).
    *   **`@langchain/core`, `@langchain/hub`:** Core Langchain utilities for prompts (`ChatPromptTemplate`) and accessing shared resources like prompt templates (`pull`).
    *   **`@langchain/langgraph` (`StateGraph`, `Annotation`):** Framework for building robust, stateful, multi-step AI applications by defining computation as a graph. Used here to structure the RAG flow (retrieve -> generate).
*   **Environment Variables:**
    *   **`dotenv`:** Loads environment variables from a `.env` file into `process.env`.

## Setup and Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd <your-repository-name>
    ```
2.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```
    *(Assuming your Node.js code resides in a `backend` subfolder. Adjust if your structure is different.)*
3.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```
4.  **Create an environment file:**
    Create a file named `.env` in the `backend` directory.
5.  **Add API Keys to `.env`:**
    You need API keys from Google AI and Groq.
    ```dotenv
    # .env file
    GROQ_API_KEY=gsk_YourGroqApiKeyHere
    GOOGLE_API_KEY=AIzaSyYourGoogleApiKeyHere

    # Optional: Define a port (defaults to 3001 if not set)
    # PORT=3001
    ```
    *   Get a Groq API key from [GroqCloud](https://console.groq.com/keys).
    *   Get a Google Generative AI API key from [Google AI Studio](https://aistudio.google.com/app/apikey). Ensure the "Generative Language API" is enabled for your project in Google Cloud Console if necessary.
6.  **Run the server:**
    ```bash
    npm start
    # or directly using node (if you don't have a start script)
    # node your_server_file_name.js
    ```
7.  The server should now be running (typically on `http://localhost:3001`). Check the console logs for confirmation and any warnings about the in-memory store.

## API Endpoints

### 1. Upload PDF

*   **URL:** `/api/uploadFile`
*   **Method:** `POST`
*   **Content-Type:** `multipart/form-data`
*   **Form Data:**
    *   `document`: The PDF file to be uploaded.
*   **Success Response (200):**
    ```json
    {
      "message": "File '<original_filename>' processed successfully. Ready for retrieval.",
      "fileName": "<original_filename>"
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: If no file is provided.
    *   `500 Internal Server Error`: If processing fails.

### 2. Retrieve Answer

*   **URL:** `/api/retrieve`
*   **Method:** `POST`
*   **Content-Type:** `application/json`
*   **Request Body:**
    ```json
    {
      "question": "Your question about the uploaded PDF content?"
    }
    ```
*   **Success Response (200):**
    ```json
    {
      "message": "Retrieval successful",
      "answer": "The answer generated by the LLM based on the document context.",
      "documentContext": "<original_filename_of_last_uploaded_pdf>"
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: If `question` is missing in the body or if no document has been uploaded yet.
    *   `500 Internal Server Error`: If the RAG graph execution fails.

## Limitations & Future Improvements

*   **Persistence:** The biggest limitation is the `MemoryVectorStore`.
    *   **Improvement:** Replace `MemoryVectorStore` with a persistent solution like:
        *   `@langchain/community/vectorstores/chroma` (ChromaDB - local or remote)
        *   `@langchain/pinecone` (Pinecone - cloud-based)
        *   `@langchain/weaviate` (Weaviate - cloud-based or self-hosted)
        *   Requires storing/retrieving vectors associated with specific document IDs or user sessions.
*   **Single Document Context:** Currently, queries only run against the *last* uploaded document.
    *   **Improvement:** Implement session management or pass a unique document identifier during the retrieve request to load the correct vector store context.
*   **Scalability:** The current setup is not designed for high concurrency due to the shared in-memory state. A persistent store and potentially stateless request handling would be needed.
*   **Error Handling:** Error handling is basic. More granular error handling and logging could be added.
*   **Configuration:** Models, chunk sizes, etc., are hardcoded. These could be made configurable via environment variables or a config file.
*   **Security:** CORS is set to `*`. In production, restrict it to specific frontend origins. Implement authentication/authorization if needed.
*   **Frontend:** This is only a backend. A frontend application would be needed for user interaction.
