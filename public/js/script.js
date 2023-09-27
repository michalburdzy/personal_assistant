const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;
const SpeechGrammarList =
  window.SpeechGrammarList || window.webkitSpeechGrammarList;
const SpeechRecognitionEvent =
  window.SpeechRecognitionEvent || window.webkitSpeechRecognitionEvent;
const synth = window.speechSynthesis;

const voices = synth
  .getVoices()
  .filter((v) => v.lang === 'en-US' || v.lang === 'en-UK');

const voice = voices.find((v) => v.name === 'Rocko') || voices[0];

const languages = {
  pl: 'pl-PL',
  en: 'en-US',
};

const messages = {
  hello: {
    'pl-PL': 'W czym mogę Ci pomóc?',
    'en-US': 'How can I help you?',
  },
  listening: {
    'pl-PL': 'Słucham..',
    'en-US': 'Listening..',
  },
  goodbye: {
    'pl-PL': 'Mam nadzieję, że pomogłem!',
    // 'en-US': "'Goodbye! I hope you enjoyed my service'",
    'en-US': 'Bye!',
  },
  sessionEnd: {
    'pl-PL': 'Koniec sesji',
    'en-US': 'Session ends',
  },
};

class Bot {
  constructor() {
    this.socket = io();
    this.voice = voices.find((v) => v.name === 'Rocko') || voices[0];
    this.listening = false;
    this.lang = languages.en;
    this.recognition = new SpeechRecognition();
    this.recognition.lang = this.lang;
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;
    // this.speechRecognitionList = new SpeechGrammarList();

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

    this.addEventListeners();
    this.addSocketListeners();
    this.speak('Hi!');
  }

  async wait(ms = 1000) {
    return await new Promise((res) => {
      setTimeout(() => res(), ms);
    });
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
      this.htmlElements.debugContainer.innerHTML = '';

      const { msg, link } = answer;
      await this.speak(msg);
      if (link) {
        window.open(link, '_blank');
      }
    });
  }

  addEventListeners() {
    this.htmlElements.startButton.addEventListener('click', () => {
      this.listening ? this.stop() : this.start();
      this.listening = !this.listening;
    });

    this.recognition.onresult = (e) => {
      const last = e.results.length - 1;
      this.query = e.results[last][0].transcript;
      this.htmlElements.debugContainer.innerHTML = this.query;
      this.waitForNextWord();

      if (e.results[last].isFinal === true) {
        this.sendQueryToBe();
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
    this.speak(messages.hello[this.lang]);
    this.recognition.start();
    this.htmlElements.output.textContent = messages.listening[this.lang];
    this.htmlElements.loading.classList.add('reveal');
    this.htmlElements.microphone.classList.add('hide');
  }

  stop() {
    this.recognition.stop();
    this.htmlElements.loading.classList.remove('reveal');
    this.htmlElements.microphone.classList.remove('hide');
  }

  async speak(text) {
    console.log('bot speaking', text);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    synth.speak(utterance);
    let isSpeaking = synth.speaking;

    while (isSpeaking) {
      await this.wait(100);
      isSpeaking = synth.speaking;
    }
  }
}

window.bot = new Bot();
