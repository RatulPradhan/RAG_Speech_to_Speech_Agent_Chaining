import { loadPdfTexts, prepareDocs } from "./email_loader.js";

(async () => {
	try {
		const dirPath = "./data/Email_pdfs/";
		const rawEmails = await loadPdfTexts(dirPath);
		await prepareDocs(rawEmails);
		console.log(
			"Emails parsed, cleaned, chunked, and saved to ./data/Email_parsed/"
		);
	} catch (error) {
		console.error("Error processing emails:", error);
	}
})();
