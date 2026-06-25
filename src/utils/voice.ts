/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ParsedVoiceCommand {
  originalText: string;
  action: 'search' | 'sell' | 'check' | 'unknown';
  medicineName?: string;
  quantity?: number;
}

export class VoiceCommandListener {
  private recognition: any | null = null;
  private isListening = false;
  
  onResult: (parsed: ParsedVoiceCommand) => void = () => {};
  onListeningStateChange: (listening: boolean) => void = () => {};
  onError: (error: string) => void = () => {};

  constructor() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.lang = 'en-US'; // English handles English/Banglish pronunciations best in Web Speech
      this.recognition.interimResults = false;
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        this.isListening = true;
        this.onListeningStateChange(true);
      };

      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        this.onError(event.error);
        this.isListening = false;
        this.onListeningStateChange(false);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.onListeningStateChange(false);
      };

      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        const parsed = this.parseCommand(transcript);
        this.onResult(parsed);
      };
    }
  }

  isSupported(): boolean {
    return !!this.recognition;
  }

  start() {
    if (!this.recognition) {
      this.onError('Speech Recognition is not supported in this browser.');
      return;
    }
    if (this.isListening) return;
    try {
      this.recognition.start();
    } catch (err) {
      console.error(err);
    }
  }

  stop() {
    if (!this.recognition || !this.isListening) return;
    try {
      this.recognition.stop();
    } catch (err) {
      console.error(err);
    }
  }

  parseCommand(text: string): ParsedVoiceCommand {
    const cleanText = text.trim().toLowerCase();
    
    // Command 1: SELL (e.g., "sell 2 Napa", "add 5 Napa Extra", "sell 10 Alatrol", "sell 5 Sergel 20")
    // Regex matches "sell/add [number] [medicine name]"
    const sellRegex = /^(sell|add|insert)\s+(\d+)\s+(.+)$/i;
    const sellMatch = cleanText.match(sellRegex);
    if (sellMatch) {
      return {
        originalText: text,
        action: 'sell',
        quantity: parseInt(sellMatch[2], 10),
        medicineName: this.capitalizeWords(sellMatch[3].trim())
      };
    }

    // Command 2: CHECK STOCK (e.g., "check Napa", "stock of Sergel", "how many Napa Extra")
    const checkRegexes = [
      /^(check|verify|stock\s+of|how\s+many)\s+(.+)$/i,
      /^(.+)\s+(stock|quantity)$/i
    ];
    
    for (const regex of checkRegexes) {
      const checkMatch = cleanText.match(regex);
      if (checkMatch) {
        // If it's the second regex, medicine name is in group 1, otherwise group 2
        const nameGroup = regex.source.includes('stock\\s+of') ? 2 : (regex.source.startsWith('(.+)') ? 1 : 2);
        const medicineName = checkMatch[nameGroup].trim();
        // Ignore general system filler words
        if (!['stock', 'quantity', 'how many', 'check'].includes(medicineName)) {
          return {
            originalText: text,
            action: 'check',
            medicineName: this.capitalizeWords(medicineName)
          };
        }
      }
    }

    // Command 3: FIND / SEARCH (e.g., "find Napa", "search Alatrol", "show Napa Extra")
    const findRegex = /^(find|search|show|lookup)\s+(.+)$/i;
    const findMatch = cleanText.match(findRegex);
    if (findMatch) {
      return {
        originalText: text,
        action: 'search',
        medicineName: this.capitalizeWords(findMatch[2].trim())
      };
    }

    // Default: Fallback to searching if they just said a medicine name directly, e.g. "Napa" or "Sergel"
    if (cleanText.length > 1) {
      return {
        originalText: text,
        action: 'search',
        medicineName: this.capitalizeWords(cleanText)
      };
    }

    return {
      originalText: text,
      action: 'unknown'
    };
  }

  private capitalizeWords(str: string): string {
    return str
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
