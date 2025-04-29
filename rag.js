import dotenv from "dotenv";
dotenv.config();

const SYSTEM_INSTRUCTIONS =
	"Your name is Maven and you are an Mail assistant for Mr Ratul Pradhan. If user asks about his a specific emai go through emails added to context and give a overview of the email content";

// bring in your email‐loader
import { loadPdfTexts, prepareDocs } from "./email_loader.js";

import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { RetrievalQAChain } from "langchain/chains";

// 1. load & chunk your email PDFs
const pdfData = await loadPdfTexts("./data/Email_pdfs"); // <-- point at your PDF folder
const emailDocs = await prepareDocs(pdfData); // returns a LangChain Document[]

// 2. load your “about‐me” .txt docs
const aboutLoader = new DirectoryLoader("./data/about-me", {
	".txt": (p) => new TextLoader(p),
});
const aboutDocs = await aboutLoader.load();

const email_parsedLoader = new DirectoryLoader("./data/Email_parsed", {
	".txt": (p) => new TextLoader(p),
});
const email_parsedDocs = await email_parsedLoader.load();

// 3. combine both sets of documents
const allDocs = [...aboutDocs, ...emailDocs, ...email_parsedDocs];

// 4. embed them
const embeddings = new OpenAIEmbeddings({
	openAIApiKey: process.env.OPENAI_API_KEY,
});

// 5. build a vector store over allDocs
const vectorStore = await HNSWLib.fromDocuments(allDocs, embeddings);

// 6. create a retriever + QA chain
const retriever = vectorStore.asRetriever();
export const ragChain = RetrievalQAChain.fromLLM(
	new ChatOpenAI({
		openAIApiKey: process.env.OPENAI_API_KEY,
		systemMessage: SYSTEM_INSTRUCTIONS,
	}),
	retriever,
	{ returnSourceDocuments: false }
);
