import express from "express";
import path from 'path';
import fs from 'fs/promises';
import multer from "multer";
import cors from 'cors';
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
import { pull } from "langchain/hub";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { Annotation, StateGraph } from "@langchain/langgraph";
import { ChatGroq } from "@langchain/groq";
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = 3001;
const uploadDir = 'temp_files';

app.use(cors({ origin: '*' }));
app.use(express.json());

// Ensure upload directory exists
fs.mkdir(uploadDir, { recursive: true }).catch(console.error);

// Multer setup
const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, uploadDir);
    },
    filename(req, file, cb) {
        const suffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${file.fieldname}-${suffix}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage });

// Global state: vector store and graph
let globalGraph = null;

// Configure LLM once
const llm = new ChatGroq({
    model: "llama-3.3-70b-versatile",
    temperature: 0,
    apiKey: process.env.GROQ_API_KEY || "YOUR_GROQ_KEY"
});

// Upload & initialize graph
app.post('/api/uploadFile', upload.single('document'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    try {
        // Load PDF
        const loader = new PDFLoader(req.file.path, { splitPages: false });
        const docs = await loader.load();

        // Split text
        const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
        const splits = await splitter.splitDocuments(docs);

        // Embeddings & vector store
        const embeddings = new GoogleGenerativeAIEmbeddings({
            model: "text-embedding-004",
            taskType: TaskType.RETRIEVAL_DOCUMENT,
            title: req.file.originalname,
            apiKey: process.env.GOOGLE_API_KEY || "YOUR_GENAI_KEY"
        });
        const vectorStore = new MemoryVectorStore(embeddings);
        await vectorStore.addDocuments(splits);

        // Load prompt
        const promptTemplate = await pull("rlm/rag-prompt");

        // Define annotations
        const StateAnnotation = Annotation.Root({ question: Annotation, context: Annotation, answer: Annotation });

        // Retrieval node\    
        const retrieve = async (state) => {
            const retrieved = await vectorStore.similaritySearch(state.question);
            return { context: retrieved.map(d => d.pageContent).join("\n") };
        };

        // Generation node
        const generate = async (state) => {
            const messages = await promptTemplate.invoke({ question: state.question, context: state.context });
            const response = await llm.invoke(messages);
            return { answer: response.content };
        };

        // Build graph
        globalGraph = new StateGraph(StateAnnotation)
            .addNode("retrieve", retrieve)
            .addNode("generate", generate)
            .addEdge("__start__", "retrieve")
            .addEdge("retrieve", "generate")
            .addEdge("generate", "__end__")
            .compile();

        res.status(200).json({ message: 'File processed and graph initialized.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Processing failed.' });
    }
});

// Retrieve endpoint: use initialized graph
app.post('/api/retrieve', async (req, res) => {
    const { question } = req.body;
    if (!globalGraph) {
        return res.status(400).json({ error: 'Graph not initialized. Upload a file first.' });
    }

    try {
        const result = await globalGraph.invoke({ question });
        res.status(200).json({ answer: result.answer });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to retrieve answer.' });
    }
});

app.listen(port, () => console.log(`Server listening on port ${port}`));
