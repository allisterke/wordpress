function delay(t) {
    return new Promise((resolve) => {
        setTimeout(resolve, t);
    })
}

function Array2d(n1, n2) {
    let dp = [];
    for(let i = 0; i < n1; ++ i) {
        let row = [];
        for(let j = 0; j < n2; ++ j) {
            row.push(0);
        }
        dp.push(row);
    }
    return dp;
}

function contains(a, s) {
    for(let i = 0; i < a.length; ++ i) {
        if(editDistance(a[i], s) < 5) {
            return true;
        }
    }
    return false;
}

function editDistance(a, b) {
    let dp = Array2d(a.length+1, b.length+1);
    for(let i = 0; i <= a.length; ++ i) {
        for(let j = 0; j <= b.length; ++ j) {
            if(i == 0 || j == 0) {
                dp[i][j] = Math.max(i, j);
            }
            else if(a[i-1].toLowerCase() == b[j-1].toLowerCase()) {
                dp[i][j] = dp[i-1][j-1];
            }
            else {
                dp[i][j] = Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]) + 1;
            }
        }
    }
    return dp[a.length][b.length];
}

class JsonCache {
    constructor(words) {
        this.queryUrl = 'index.php?a=getWordMean&c=search&list=1%2C2%2C3%2C4%2C5%2C8%2C9%2C10%2C12%2C13%2C14%2C15%2C18%2C21%2C22%2C24%2C3003%2C3004%2C3005&word=';
        this.words = words;
        this.cache = [];
        this.queryAll().then(()=>{ console.log('finished querying all words.'); });
    }
    async queryAll() {
        for(let i = 0; i < this.words.length; ++ i) {
            await this.query(i);
            await delay(1000);
        }
    }
    async query(i) {
        if(i >= this.words.length) {
            return;
        }
        if(typeof this.cache[i] !== 'undefined') {
            return;
        }
        this.cache[i] = null;
        try {
            let resp = await fetch(`${this.queryUrl}${this.words[i]}`);
            let json = await resp.json();
            this.cache[i] = json;
        } catch (e) {
            this.cache[i] = {};
        }
    }
    get(i) {
        if(i < this.words.length) {
            if(typeof this.cache[i] === 'undefined') {
                this.query(i);
            }
            return this.cache[i];
        }
        else {
            return {};
        }
    }
}

class MasterIciba {
    constructor(text) {
        this.words = text.split(/[\r\n]+/);
        // this.words = this.words.slice(0, this.words.length - 1).sort();
        this.words = this.shuffle(this.words.slice(0, this.words.length - 1)).slice(0, 25).sort();
        this.jsonCache = new JsonCache(this.words);

        this.updateList(0);

        this.bindKeyEventHandlers();

        this.currentWord = 0;
        this.playAll(0);
    }
    bindKeyEventHandlers() {
        this.backward = false;
        this.forward = false;
        this.paused = false;
        this.epoch = 0; // when forward or backward key is pressed, we enter into a new era
        window.onkeydown = this.handleKeyEvent.bind(this);
    }
    handleKeyEvent(e) {
        if(e.keyCode == 37) {
            ++ this.epoch;
            this.paused = false;
            this.playAll(Math.max(this.currentWord - 1, 0));
        }
        else if(e.keyCode == 39) {
            ++ this.epoch;
            this.paused = false;
            this.playAll(this.currentWord + 1 >= this.words.length ? 0 : this.currentWord + 1);
        }
        else if(e.keyCode == 13) {
            this.paused = !this.paused;
        }
    }
    updateList(start) {
        let container = document.createElement('table');
        container.border = '1';
        container.cellSpacing = '0';
        container.cellPadding = '0';
        for(let i = start; i < this.words.length; ++ i) {
            let item = document.createElement('tr');
            let id = document.createElement('td');
            id.style.padding = '1em';
            id.innerHTML = i+1;
            let content = document.createElement('td');
            content.style.padding = '1em';
            content.innerHTML = this.words[i];
            item.appendChild(id);
            item.appendChild(content);
            container.appendChild(item);
        }
        for(let i = 0; i < start; ++ i) {
            let item = document.createElement('tr');
            let id = document.createElement('td');
            id.style.padding = '1em';
            id.innerHTML = i+1;
            let content = document.createElement('td');
            content.style.padding = '1em';
            content.innerHTML = this.words[i];
            item.appendChild(id);
            item.appendChild(content);
            container.appendChild(item);
        }
        document.getElementById('list').innerHTML = '';
        document.getElementById('list').appendChild(container);
    }
    parsePh(json) {
        let ph = [];
        try {
            ph.push(json.baesInfo.symbols[0].ph_en_mp3);
            ph.push(json.baesInfo.symbols[0].ph_am_mp3);
            ph.push(json.baesInfo.symbols[0].ph_tts_mp3);
        } catch (e) { console.log(e); }
        ph = ph.filter((a) => { return a != null && a.trim() != '' });
        return ph.length == 0 ? null : ph[Math.floor(Math.random() * ph.length)];
    }
    parse(json) {
        let sentences = [];
        let trans = [];
        let mp3s = [];
        try {
            if ('collins' in json) {
                let collins = json.collins;
                for (let i = 0; i < collins.length; ++i) {
                    let entry = collins[i].entry;
                    for (let j = 0; j < entry.length; ++j) {
                        let examples = entry[j].example;
                        for (let k = 0; k < examples.length; ++k) {
                            let ex = examples[k];
                            if(contains(sentences, ex.ex)) {
                                continue;
                            }
                            sentences.push(ex.ex);
                            trans.push(ex.tran);
                            mp3s.push(ex.tts_mp3);
                            break;
                        }
                    }
                }
            }
            if ('sentence' in json) {
                let s = json.sentence;
                for (let i = 0; i < s.length; ++ i) {
                    let ex = s[i];
                    if(contains(sentences, ex.Network_en)) {
                        continue;
                    }
                    sentences.push(ex.Network_en);
                    trans.push(ex.Network_cn);
                    mp3s.push(ex.tts_mp3);
                }
            } 
        } catch (e) { console.log(e); }
        return {sentences, trans, mp3s};
    }

    https(src) {
        return '//' + src.replace(/https?:\/\//, '')
    }

    render(sm) {
        let sentences = sm.sentences;
        let trans = sm.trans;
        let mp3s = sm.mp3s;
        let audios = [];
        document.getElementById('examples').innerHTML = '';
        let container = document.createElement('div');
        for (let i = 0; i < Math.min(5, sentences.length); ++i) {
            let div = document.createElement('div');
            div.style.display = 'flex';
            div.style.paddingBottom = '2em';
            div.style.borderBottom = '1px solid';
            div.style.marginBottom = '2em';

            let text = document.createElement('span');
            text.id = `anchor${i}`;
            text.innerHTML = sentences[i] + '<br />' + trans[i];
            text.style.fontSize = '30px';
            text.style.fontFamily = 'Courier New';
            text.style.marginTop = 'auto';
            text.style.marginBottom = 'auto';
            text.style.marginLeft = '2em';

            let audio = document.createElement('audio');
            audio.src = this.https(mp3s[i]);
            audio.controls = true;
            audio.style.display = 'inline';
            audio.style.marginTop = 'auto';
            audio.style.marginBottom = 'auto';

            audios.push(audio);

            div.appendChild(audio);
            div.appendChild(text);
            container.appendChild(div);
        }
        document.getElementById('examples').appendChild(container);

        return audios;
    }

    async playAll(start) {
        let epoch = this.epoch;

        for (let i = start; i < this.words.length; ++i) {
            this.currentWord = i;

            let word = this.words[i];
            let json = null;
            try {
                while (true) {
                    json = this.jsonCache.get(i);
                    if (json) {
                        break;
                    }
                    else {
                        await delay(1000);
                        if(epoch != this.epoch) { // play is rescheduled
                            return;
                        }
                    }
                }
            } catch (e) {
                json = {};
            }

            document.title = word;
            this.updateList(i);
            this.updateTitle(json);

            let audios = this.render(this.parse(json));
            if(audios.length == 0) {
                document.getElementById('title').scrollIntoView();
            }
            else {
                this.highLightExample(0);
            }
            audios = [this.createPh(this.parsePh(json))].concat(audios);

            for(let j = 0; j < audios.length; ++ j) {
                if(epoch != this.epoch) { // play is rescheduled
                    return;
                }
                if(j > 0) {
                    console.log(`high light ${i}, ${j}`);
                    this.highLightExample(j - 1);
                }

                let audio = audios[j];
                audio.play();
                while(true) {
                    if(audio.ended || audio.error) {
                        break;
                    }
                    else {
                        await delay(1);
                        if(epoch != this.epoch) { // stop playing
                            audio.pause();
                            break;
                        }
                    }
                }

                await delay(2000);
                while (this.paused) {
                    await delay(500);
                }
                if(epoch != this.epoch) { // play is rescheduled
                    return;
                }
            }
        }
    }

    createPh(ph) {
        let audio = document.createElement('audio');
        audio.src = this.https(ph);
        audio.controls = true;
        audio.style.paddingTop = '1em';
        document.getElementById('title').appendChild(audio);
        return audio;
    }

    updateTitle(json) {
        try {
            document.getElementById('title').innerHTML = document.title + ': ' +
                `<div>英[${json.baesInfo.symbols[0].ph_en}], 美[${json.baesInfo.symbols[0].ph_am}]</div>` +
                json.baesInfo.symbols[0].parts.map((e) => {
                    return `<div>${e.part} ${e.means.join(', ')}</div>`;
                }).join('');
        } catch (e) {
            console.log(e);
        }
    }

    highLightExample(j) {
        if (j > 0) {
            document.getElementById(`anchor${j - 1}`).style.fontWeight = '';
        }
        let id = `anchor${j}`;
        document.getElementById(id).style.fontWeight = 'bold';
        //                        location.href = `#${id}`;
        document.getElementById(id).scrollIntoView(false);
    }

    shuffle(a) {
        for (let i = 0; i < a.length; ++i) {
            let r = Math.floor(Math.random() * (a.length - i)) + i;
            if (r != i) {
                [a[i], a[r]] = [a[r], a[i]];
            }
        }
        return a;
    }
}
