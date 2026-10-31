import { Controller, Get, Logger, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../../common/auth/decorators.js';

@ApiTags('ai-voice')
@Controller({ path: 'ai', version: '1' })
export class VoiceController {
  private readonly logger = new Logger(VoiceController.name);

  @Public()
  @Get('voice-stream')
  @ApiOperation({ summary: 'Stream high quality spoken audio in Bengali, Hindi, or English' })
  async streamVoice(
    @Query('lang') lang: string,
    @Query('text') text: string,
    @Res() res: Response,
  ) {
    if (!text || text.trim().length === 0) {
      res.status(400).send('Missing text parameter');
      return;
    }
    const safeLang = (lang === 'bn' || lang === 'hi' || lang === 'en') ? lang : 'bn';
    const cleanText = encodeURIComponent(text.trim().slice(0, 200));
    const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${safeLang}&client=tw-ob&q=${cleanText}`;

    try {
      const response = await fetch(googleTtsUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://translate.google.com/',
        },
      });

      if (!response.ok) {
        this.logger.warn(`Google TTS responded with status ${response.status}`);
        res.status(502).send('Failed to fetch voice audio');
        return;
      }

      const buffer = await response.arrayBuffer();
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(Buffer.from(buffer));
    } catch (err) {
      this.logger.error('Voice stream error', err);
      res.status(500).send('TTS streaming failed');
    }
  }
}
