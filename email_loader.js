// email_loader.js

import fs from "fs";
import path from "path";
import pdfParse from "pdf-parse/lib/pdf-parse.js"; // skip the broken index
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

// Utility to extract rough date (customize if needed)
function extractDateFromPdfText(text) {
	const match = text.match(
		/\b(?:\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}[./-]\d{2}[./-]\d{2})\b/
	);
	return match ? match[0] : null;
}

// Load and parse PDFs from a directory, skipping missing or unreadable files
export const loadPdfTexts = async (dirPath) => {
	if (!fs.existsSync(dirPath)) {
		throw new Error(`Directory not found: ${dirPath}`);
	}
	const files = fs
		.readdirSync(dirPath)
		.filter((f) => f.toLowerCase().endsWith(".pdf"));
	const allTexts = [];

	for (const file of files) {
		const filePath = path.join(dirPath, file);
		if (!fs.existsSync(filePath)) {
			console.warn(`File not found, skipping: ${filePath}`);
			continue;
		}
		try {
			const buffer = fs.readFileSync(filePath);
			const data = await pdfParse(buffer);
			allTexts.push({
				text: data.text,
				metadata: {
					source: filePath,
					filename: file,
					date: extractDateFromPdfText(data.text),
				},
			});
		} catch (err) {
			console.error(`Error parsing PDF ${filePath}:`, err.message);
		}
	}

	return allTexts;
};

// Clean email-style PDF text
function cleanEmailText(rawText) {
	return rawText
		.replace(/On\s.*wrote:/gi, "")
		.replace(/From:.*\n/gi, "")
		.replace(/Sent:.*\n/gi, "")
		.replace(/To:.*\n/gi, "")
		.replace(/Subject:.*\n/gi, "")
		.replace(/Cc:.*\n/gi, "")
		.replace(/Attachments:.*\n/gi, "")
		.replace(/-{2,}\s*Forwarded message\s*-{2,}/gi, "")
		.replace(/-{2,}\s*Original Message\s*-{2,}/gi, "")
		.replace(/mailto:[^\s]+/gi, "")
		.replace(/\n{2,}/g, "\n\n")
		.trim();
}

// Split a block of email text into individual emails based on standard headers
function splitEmailSegments(cleanedText) {
  // Lookahead for lines starting with From:, capturing each segment
  return cleanedText.split(/\n(?=From: .+)/g).filter(segment => segment.trim().length > 0);
}

// Save each chunked document to .data/Email_parsed/*.txt
function saveChunksToFiles(chunks, outputDir = "./data/Email_parsed") {
	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true });
	}

	chunks.forEach((chunk, index) => {
		const fileName = `chunk_${index + 1}.txt`;
		const filePath = path.join(outputDir, fileName);
		const content = `Filename: ${chunk.metadata.filename}\nDate: ${chunk.metadata.date}\n\n${chunk.pageContent}`;
		fs.writeFileSync(filePath, content, "utf-8");
	});
}

// Split cleaned text into documents with metadata and save
export const prepareDocs = async (pdfData) => {
	const textSplitter = new RecursiveCharacterTextSplitter({
		chunkSize: 1000,
		chunkOverlap: 200,
	});

	let docs = [];
	for (const item of pdfData) {
		const cleaned = cleanEmailText(item.text);
		// Split into individual email segments
		const segments = splitEmailSegments(cleaned);
		for (const segment of segments) {
			// Extract metadata per segment
			const date = extractDateFromPdfText(segment) || item.metadata.date || "";
			const subjectMatch = segment.match(/Subject:\s*(.+)/i);
			const subject = subjectMatch ? subjectMatch[1].trim() : "";
			const splits = await textSplitter.createDocuments(
				[segment],
				[
					{ key: "source", value: item.metadata.source },
					{ key: "filename", value: item.metadata.filename },
					{ key: "date", value: date },
					{ key: "subject", value: subject },
				]
			);
			docs = docs.concat(splits);
		}
	}

	// saveChunksToFiles(docs); // Save to disk
	saveChunksToFiles(docs);
	return docs;
};
