import { Injectable } from '@nestjs/common';

type DiarizedTurn = {
  speaker: number;
  start: number;
  end: number;
  text: string;
};

function smoothTurns(turns: DiarizedTurn[]) {
  const out: DiarizedTurn[] = [];

  for (const t of turns) {
    const text = (t.text || '').trim();
    const dur = (t.end ?? 0) - (t.start ?? 0);
    const wc = text ? text.split(/\s+/).length : 0;

    const prev = out[out.length - 1];

    // Merge adjacent same-speaker
    if (prev && prev.speaker === t.speaker) {
      prev.end = Math.max(prev.end, t.end);
      prev.text = `${prev.text} ${text}`.trim();
      continue;
    }

    // Merge “tiny” turns into previous (even if speaker differs)
    const tiny = (dur > 0 && dur < 0.8) || (wc > 0 && wc <= 3);
    if (tiny && prev) {
      prev.end = Math.max(prev.end, t.end);
      prev.text = `${prev.text} ${text}`.trim();
      continue;
    }

    out.push({ ...t, text });
  }

  return out;
}

@Injectable()
export class TranscriptionDeepgramService {
  private readonly apiKey = process.env.DEEPGRAM_API_KEY;

  async transcribeUrl(url: string) {
    if (!this.apiKey) throw new Error('Missing DEEPGRAM_API_KEY');

    //nova-2-phonecall
    const endpoint =
      'https://api.deepgram.com/v1/listen' +
      '?model=nova-2-phonecall' +
      '&diarize=true' +
      '&utterances=true' +
      '&smart_format=true' +
      '&punctuate=true';

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Token ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    const textOrJson = await res.text();
    if (!res.ok) {
      throw new Error(`Deepgram error ${res.status}: ${textOrJson}`);
    }

    // We already read text, so parse once here.
    const json = JSON.parse(textOrJson);

    // console.log('debug deepgam result', json);
    // console.log(
    //   'debug deepgram utterances',
    //   JSON.stringify(json?.results?.utterances, null, 2),
    // );
    // const turns: DiarizedTurn[] =
    //   json?.results?.utterances?.map((u: any) => ({
    //     speaker: u.speaker,
    //     start: u.start,
    //     end: u.end,
    //     text: u.transcript,
    //   })) ?? [];

    const utterances = json?.results?.utterances ?? [];

    const turnsRaw: DiarizedTurn[] = utterances.map((u: any) => ({
      speaker: u.speaker,
      start: u.start,
      end: u.end,
      text: u.transcript,
    }));

    const turns = turnsRaw;

    //console.log(Object.keys(json.results));
    //console.log(Object.keys(json.results.channels[0].alternatives[0]));
    //console.log('utterances length', utterances.length);
    //console.dir(utterances.slice(0, 2), { depth: null });

    const fullText =
      json?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? '';

    return {
      provider: 'deepgram',
      text: fullText,
      turns,
      // raw: json, // keep for testing; remove for production
    };
  }
}
