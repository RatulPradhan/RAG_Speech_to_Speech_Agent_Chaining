// 1. Importing required modules i.e. npm install mic sound-play wav stream openai langchain elevenlabs-node dotenv
import mic from "mic";
import sound from "sound-play";
import { Writer } from "wav";
import { Writable } from "stream";
import fs, { createWriteStream } from "fs";
import { OpenAI } from "openai";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import voice from "elevenlabs-node";
import dotenv from "dotenv";
import { ragChain } from "./rag.js";
dotenv.config();

// 2. Setup for OpenAI and keyword detection.

const playAudio = process.env.PLAY_AUDIO === "true"; // Toggle based on environment variable

const openai = new OpenAI();
const keyword = "maven";
// 3. Initial microphone setup.
let micInstance = mic({
	rate: "16000",
	channels: "1",
	debug: false,
	exitOnSilence: 6,
});
let micInputStream = micInstance.getAudioStream();
let isRecording = false;
let audioChunks = [];

// 4. Initiate recording.
const startRecordingProcess = () => {
	console.log("Starting listening process...");
	micInstance.stop();
	micInputStream.unpipe();
	micInstance = mic({
		rate: "16000",
		channels: "1",
		debug: false,
		exitOnSilence: 10,
	});
	micInputStream = micInstance.getAudioStream();
	audioChunks = [];
	isRecording = true;
	micInputStream.pipe(
		new Writable({
			write(chunk, _, callback) {
				if (!isRecording) return callback();
				audioChunks.push(chunk);
				callback();
			},
		})
	);
	micInputStream.on("silence", handleSilence);
	micInstance.start();
};
// 5. Handle silence and detection.
const handleSilence = async () => {
	console.log("Detected silence...");
	if (!isRecording) return;
	isRecording = false;
	micInstance.stop();
	const audioFilename = await saveAudio(audioChunks);
	const message = await transcribeAudio(audioFilename);
	console.log("Transcribed message:", message);

	if (message && message.toLowerCase().includes(keyword)) {
		console.log("Keyword detected, processing...");
		const responseText = await getOpenAIResponse(message);
		console.log("Assistant response:", responseText);
		if (playAudio) {
			const fileName = await convertResponseToAudio(responseText);
			console.log("Playing audio...");
			await sound.play("./audio/" + fileName);
			console.log("Playback finished...");
		} else {
			console.log("Audio playback is disabled.");
		}
	} else {
		console.log("Keyword not detected, restarting...");
	}

	startRecordingProcess();
};
const saveAudio = async (audioChunks) => {
	return new Promise((resolve, reject) => {
		console.log("Saving audio...");
		const audioBuffer = Buffer.concat(audioChunks);
		const wavWriter = new Writer({ sampleRate: 16000, channels: 1 });
		const filename = `${Date.now()}.wav`;
		const filePath = "./audio/" + filename;
		wavWriter.pipe(createWriteStream(filePath));
		wavWriter.on("finish", () => {
			resolve(filename);
		});
		wavWriter.on("error", (err) => {
			reject(err);
		});
		wavWriter.end(audioBuffer);
	});
};
// 7. Transcribe audio.
const transcribeAudio = async (filename) => {
	console.log("Transcribing audio...");
	const audioFile = fs.createReadStream("./audio/" + filename);
	const transcriptionResponse = await openai.audio.transcriptions.create({
		file: audioFile,
		model: "whisper-1",
	});
	return transcriptionResponse.text;
};
// 8. Communicate with OpenAI.

const getOpenAIResponse = async (message) => {
	console.log("Running Retrieval‑Augmented QA…");
	const result = await ragChain.call({ query: message });
	return result.text ?? result;
};

// 9. Convert response to audio using Eleven Labs.
const convertResponseToAudio = async (text) => {
	const apiKey = process.env.ELEVEN_LABS_API_KEY;
	const voiceID = "0avvJtcYX1y1iR3PYcZG";
	const fileName = `${Date.now()}.mp3`;
	console.log("Converting response to audio...");
	const audioStream = await voice.textToSpeechStream(apiKey, voiceID, text);
	const fileWriteStream = fs.createWriteStream("./audio/" + fileName);
	audioStream.pipe(fileWriteStream);
	return new Promise((resolve, reject) => {
		fileWriteStream.on("finish", () => {
			console.log("Audio conversion done...");
			resolve(fileName);
		});
		audioStream.on("error", reject);
	});
};

// 10. Start the application and keep it alive.
startRecordingProcess();
process.stdin.resume();

//. Helper functions
