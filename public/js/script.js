const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

class Bot {
  constructor() {
    this.socket = io();

    this.languages = {
      pl: 'pl-PL',
      en: 'en-US',
    };
    this.lang = this.languages.en;
    this.listening = false;
    this.recognitionResult = '';
    this.waitTimeout = null;
    this.wordTimeout = 1000;

    this.htmlElements = {
      startButton: document.querySelector('button'),
      microphone: document.querySelector('.fa-microphone'),
      output: document.querySelector('.output'),
      loading: document.querySelector('.lds-ripple'),
      debugContainer: document.querySelector('#debug'),
    };

    this.recognition = new SpeechRecognition();
    this.recognition.lang = this.lang;
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;
    // this.speechRecognitionList = new SpeechGrammarList();
    this.synth = window.speechSynthesis;

    const voices = this.synth
      .getVoices()
      .filter(
        (v) => v.lang === 'en-US' || v.lang === 'en-UK' || v.lang === 'pl-PL',
      );
    this.botVoices = {
      [this.languages.pl]: voices.find((v) => v.lang === 'pl-PL'),
      [this.languages.en]:
        voices.find((v) => v.name === 'Rocko') ||
        voices.find((v) => v.lang === 'en-US') ||
        voices[0],
    };
    this.voice = this.botVoices[this.lang];

    this.messages = {
      hello: {
        [this.languages.pl]: 'W czym mogę Ci pomóc?',
        [this.languages.en]: 'How can I help you?',
      },
      listening: {
        [this.languages.pl]: 'Słucham..',
        [this.languages.en]: 'Listening..',
      },
      goodbye: {
        [this.languages.pl]: 'Mam nadzieję, że pomogłem!',
        // [this.languages.en]: "'Goodbye! I hope you enjoyed my service'",
        [this.languages.en]: 'Bye!',
      },
      sessionEnd: {
        [this.languages.pl]: 'Koniec sesji',
        [this.languages.en]: 'Session ends',
      },
    };

    this.addEventListeners();
    this.addSocketListeners();
    this.speak(this.messages.hello[this.lang]);
  }

  async wait(ms = 1000) {
    return await new Promise((res) => {
      setTimeout(() => res(), ms);
    });
  }

  async processCustomCommand() {
    if (this.query.includes('exit') || this.query.includes('quit')) {
      this.stop();
      return true;
    }

    if (
      (this.lang === this.languages.en &&
        this.query.includes('change') &&
        this.query.includes('language')) ||
      (this.query.includes('change') && this.query.includes('voice')) ||
      (this.lang === this.languages.pl &&
        ((this.query.includes('zmień') && this.query.includes('język')) ||
          (this.query.includes('zmień') && this.query.includes('głos'))))
    ) {
      if (this.query.includes('polish')) {
        if (!this.botVoices[this.languages.pl]) {
          await this.speak(
            'Unforntunately, there are no polish voices available',
          );
        } else {
          await this.speak('Changing language to polish');
          this.lang = this.languages.pl;
          this.voice = this.botVoices[this.languages.pl];
          this.recognition.lang = this.languages.pl;
          await this.speak('Zmieniono język na polski');
          this.start();
        }
      } else if (this.query.includes('angielski')) {
        if (!this.botVoices[this.languages.en]) {
          await this.speak(
            'Niestety, głosy dla języka angielskiego nie są dostępne',
          );
        } else {
          await this.speak('Zmieniam język na angielski');
          this.lang = this.languages.en;
          this.voice = this.botVoices[this.languages.en];
          this.recognition.lang = this.languages.en;
          await this.speak('Changed language to english');
          this.start();
        }
      } else {
        await this.speak(
          `Sorry, I don't understand. Did you say: "${this.query}"?`,
        );
        this.start();
      }
      return true;
    }
  }

  sendQueryToBe() {
    if (!this.query) {
      console.log('empty query, not sending');
      return;
    }
    console.log('sending query to BE', this.query);
    this.socket.emit('user_message', this.query);
    this.query = '';
  }

  waitForNextWord() {
    if (this.waitTimeout) {
      clearTimeout(this.waitTimeout);
    }

    this.waitTimeout = setTimeout(() => {
      this.stop();
    }, this.wordTimeout);
  }

  addSocketListeners() {
    this.socket.on('bot_message', async (answer) => {
      this.htmlElements.debugContainer.innerHTML = `Bot answer: ${answer.msg}`;

      const { msg, link } = answer;
      await this.speak(msg);
      if (link) {
        window.open(link, '_blank');
      }
      this.start();
    });
  }

  addEventListeners() {
    this.htmlElements.startButton.addEventListener('click', () => {
      this.listening ? this.stop() : this.start();
      this.listening = !this.listening;
    });

    this.recognition.onresult = async (e) => {
      const last = e.results.length - 1;
      this.query = e.results[last][0].transcript.toLowerCase();
      this.htmlElements.debugContainer.innerHTML = `Query: ${this.query}`;
      this.waitForNextWord();

      if (e.results[last].isFinal === true) {
        const isCustomCommand = await this.processCustomCommand();

        if (!isCustomCommand) {
          this.sendQueryToBe();
        }
      }
    };

    this.recognition.onstart = () => {
      console.log('Recognition start');
    };
    this.recognition.onaudiostart = () => {
      console.log('Audio start');
      // this.waitTimeout = setTimeout(this.recognition.stop, 3000);
    };
    this.recognition.onaudioend = () => {
      console.log('Audio capturing ended');
      this.stop();
    };
    this.recognition.onsoundstart = () => {
      console.log('Sound start');
    };
    this.recognition.onsoundend = () => {
      console.log('Sound ended');
    };
    this.recognition.onspeechstart = () => {
      console.log('Audio start');
    };
    this.recognition.onspeechend = () => {
      console.log('Speech ended');
    };

    this.recognition.onend = () => {
      console.log('end');
    };

    this.recognition.onnomatch = () => {
      console.log('No match');
      this.speak("Sorry, I don't understand");
      this.listening ? this.stop() : false;
      this.listening = !this.listening;
    };

    this.recognition.onerror = (e) => {
      console.log('Error: ', e);
      document.querySelector('#error_msg').innerHTML = `Error: ${e.error}`;
      // stop(`Unfortunately, there was an error with: ${e.error}. Powering down..`);
      this.stop();
    };
  }

  start() {
    this.recognition.start();
    this.htmlElements.output.textContent = this.messages.listening[this.lang];
    this.htmlElements.loading.classList.add('reveal');
    this.htmlElements.microphone.classList.add('hide');
  }

  stop() {
    this.recognition.stop();
    this.htmlElements.loading.classList.remove('reveal');
    this.htmlElements.microphone.classList.remove('hide');
  }

  async speak(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = this.voice;
    this.synth.speak(utterance);
    let isSpeaking = this.synth.speaking;

    while (isSpeaking) {
      await this.wait(100);
      isSpeaking = this.synth.speaking;
    }
  }
}

window.bot = new Bot();
