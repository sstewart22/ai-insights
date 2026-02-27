import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { Readable } from 'stream';

@Injectable()
export class TranscriptionService {
  private client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  async transcribeBuffer(file: Express.Multer.File) {
    // OpenAI SDK expects a file-like stream/blob; we can pass a Readable stream with a filename
    const stream = Readable.from(file.buffer) as any;
    stream.path = file.originalname; // helps some tooling infer filename

    const transcript = await this.client.audio.transcriptions.create({
      model: 'gpt-4o-transcribe',
      file: stream,
    });

    // SDK usually returns { text: "...", ... }
    return transcript;
  }
}
