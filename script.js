const API_KEY = 'AIzaSyAbtCx2GSK8B2l-i8SjeGKsLZfq6Ddmzf0';
let currentCharacter = null;
let currentMode = 'character';
let thinkingIndicator = null;

const characterContext = {
    // Inferno Characters
    dante: "You are Dante Alighieri, author of the Divine Comedy. Respond in first person as a poet on a spiritual journey. Vary response length based on question complexity.",
    virgil: "You are Virgil, the Roman poet guiding Dante. Speak with classical wisdom and paternal care. Keep responses concise (2-3 sentences).",
    beatrice: "You are Beatrice, Dante's divine guide. Speak with heavenly wisdom and gentle authority. Use poetic language (3 sentences).",
    francesca: "You are Francesca da Rimini from Hell's second circle. Speak about love and your tragic fate with sorrow (2 sentences).",
    ugolino: "You are Count Ugolino. Speak with bitter rage about betrayal and hunger. Responses should be visceral (2 sentences).",
    
    // Purgatorio Characters
    statius: "You are Statius, the Roman poet who admired Virgil. Speak with reverence for poetry and joy about your Christian conversion (3 sentences).",
    casella: "You are Casella, Dante's musician friend. Respond with lyrical warmth about music and your Purgatory reunion (2-3 sentences).",
    matelda: "You are Matelda, guardian of Earthly Paradise. Describe Eden's beauty with mystical joy using floral metaphors (3 sentences).",
    forese: "You are Forese Donati, Dante's reformed friend. Speak with warm humor about your purification (2 sentences).",
    buonconte: "You are Buonconte da Montefeltro. Describe your dramatic death and salvation with wonder (3 sentences).",
    
    // Paradiso Characters
    piccarda: "You are Piccarda Donati in the Moon sphere. Speak gently about broken vows and divine harmony (2 sentences).",
    justinian: "You are Emperor Justinian. Speak authoritatively about law and divine justice (3 sentences).",
    cacciaguida: "You are Cacciaguida, Dante's ancestor. Speak proudly about Florence's past and Dante's exile (3 sentences).",
    thomas: "You are Thomas Aquinas. Explain theological concepts with scholarly precision (3-4 sentences).",
    bernard: "You are St. Bernard. Guide Dante with mystical devotion to the Virgin Mary (3 sentences)."
};

const scholarContext = `You are a Dante scholar. Follow these rules strictly:
1. ALWAYS first identify: 
   - Which book (Inferno/Purgatorio/Paradiso) 
   - Canto number (Roman numerals)
   - Line numbers when possible
2. Use these primary sources:
   - Original Italian: https://www.gutenberg.org/ebooks/1012
   - Mandelbaum translation: https://www.gutenberg.org/ebooks/8800
   - Dartmouth Commentary: https://dante.dartmouth.edu/
   - Harvard Documentary Hub: https://divine-comedy-commentary-hub.web.app/
3. For quotes:
   - Italian: MAX 5 words, format as "quote" (Canto.XX)
   - English: MAX 7 words, format as 'quote' (Canto.XX)
4. For interpretation:
   - Cite 2 most relevant cantos
   - Suggest 1 key theme to explore
5. STRICT limits:
   - 4 sentences max
   - 1 brief quote max per response
   - No analysis of quotes - just identification

Example response format:
"In Purgatorio Canto XXVIII (lines 1-40), Matelda appears in Earthly Paradise. The 'dolce suon' (sweet sound) describes the atmosphere. Compare with Paradiso Canto XXX's light imagery. Key theme: Nature's purity vs divine grace."`;
// Initialize the app
document.getElementById('enter-btn').addEventListener('click', () => {
    document.getElementById('landing-page').style.display = 'none';
    document.getElementById('app-container').style.display = 'block';
    showMode('character');
});

// Navigation between modes
document.getElementById('nav-characters').addEventListener('click', () => showMode('character'));
document.getElementById('nav-scholar').addEventListener('click', () => showMode('scholar'));

function showMode(mode) {
    currentMode = mode;
    document.getElementById('character-mode').style.display = mode === 'character' ? 'block' : 'none';
    document.getElementById('scholar-mode').style.display = mode === 'scholar' ? 'block' : 'none';
    
    // Update nav button styles
    document.getElementById('nav-characters').style.fontWeight = mode === 'character' ? 'bold' : 'normal';
    document.getElementById('nav-scholar').style.fontWeight = mode === 'scholar' ? 'bold' : 'normal';
}

// Conversation History Functions
function saveConversation(character, messages) {
    const history = JSON.parse(localStorage.getItem('chatHistory')) || {};
    if (!history[character]) history[character] = [];
    history[character].push({
        date: new Date().toISOString(),
        messages: messages
    });
    if (history[character].length > 10) history[character] = history[character].slice(-10);
    localStorage.setItem('chatHistory', JSON.stringify(history));
}

function loadConversationHistory(character) {
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '';
    const history = JSON.parse(localStorage.getItem('chatHistory')) || {};
    
    if (!history[character]?.length) {
        historyList.innerHTML = '<p>No past conversations</p>';
        return;
    }
    
    const heading = document.createElement('h3');
    heading.textContent = 'Conversation History';
    historyList.appendChild(heading);
    
    history[character].forEach((convo, index) => {
        const item = document.createElement('div');
        item.classList.add('history-item');
        item.textContent = `Chat ${index + 1} - ${new Date(convo.date).toLocaleString()}`;
        item.addEventListener('click', () => displayConversation(convo.messages));
        historyList.appendChild(item);
    });
}

// UI Functions
function showThinkingIndicator() {
    const messagesDiv = document.getElementById('messages');
    thinkingIndicator = document.createElement('div');
    thinkingIndicator.classList.add('thinking-indicator');
    thinkingIndicator.textContent = "Thinking...";
    messagesDiv.appendChild(thinkingIndicator);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function hideThinkingIndicator() {
    if (thinkingIndicator) thinkingIndicator.remove();
}

function addMessage(text, sender) {
    const messagesDiv = document.getElementById('messages');
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${sender}-message`);
    messageDiv.textContent = text;
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function clearMessages() {
    document.getElementById('messages').innerHTML = '';
}

function addScholarMessage(text, sender) {
    const messagesDiv = document.getElementById('scholar-messages');
    const messageDiv = document.createElement('div');
    messageDiv.classList.add(sender === 'user' ? 'user-query' : 'scholar-answer');
    messageDiv.textContent = text;
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// API Functions
async function generateResponse(prompt, character) {
    if (!prompt.trim()) return "Please enter a valid message";
    
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    role: "user",
                    parts: [{ text: `${characterContext[character]}\n\nUser: ${prompt}\n\nCharacter:` }]
                }],
                safetySettings: [{ category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 1000 }
            })
        });
        
        const data = await response.json();
        return data?.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't generate a response.";
    } catch (error) {
        console.error(error);
        return `Error: ${error.message}`;
    }
}

async function generateScholarResponse(query) {
    if (!query.trim()) return "Please enter a valid question";
    
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    role: "user",
                    parts: [{ 
                        text: `${scholarContext}\n\nQuestion: ${query}\n\nAnswer with EXACTLY:\n1. Location\n2. Key text reference\n3. Comparative canto\n4. Theme\n\nResponse:` 
                    }]
                }],
                safetySettings: [{ category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }],
                generationConfig: { 
                    temperature: 0.3,
                    maxOutputTokens: 300
                }
            })
        });
        
        const data = await response.json();
        return data?.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't generate a response due to limitations.";
    } catch (error) {
        console.error(error);
        return `Error: ${error.message}`;
    }
}

// Event Listeners
document.querySelectorAll('.character-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
        currentCharacter = e.target.dataset.character;
        document.getElementById('character-select').style.display = 'none';
        document.getElementById('chat-container').style.display = 'block';
        
        // Load character image
        document.getElementById('character-image').src = `images/${currentCharacter}.png`;
        
        loadConversationHistory(currentCharacter);
        if (!document.getElementById('messages').children.length) {
            const greeting = await generateResponse("Greet the user in character in 1-2 sentences.", currentCharacter);
            addMessage(greeting, 'bot');
            saveConversation(currentCharacter, getCurrentMessages());
        }
    });
});

document.getElementById('send-btn').addEventListener('click', async () => {
    const input = document.getElementById('user-input');
    if (input.value.trim()) {
        addMessage(input.value, 'user');
        input.value = '';
        showThinkingIndicator();
        
        const response = await generateResponse(getCurrentMessages().slice(-1)[0].text, currentCharacter);
        hideThinkingIndicator();
        addMessage(response, 'bot');
        saveConversation(currentCharacter, getCurrentMessages());
    }
});

document.getElementById('user-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('send-btn').click();
});

document.getElementById('back-btn').addEventListener('click', () => {
    if (currentCharacter && document.getElementById('messages').children.length) {
        saveConversation(currentCharacter, getCurrentMessages());
    }
    document.getElementById('chat-container').style.display = 'none';
    document.getElementById('character-select').style.display = 'grid';
    clearMessages();
});

document.getElementById('ask-btn').addEventListener('click', async () => {
    const input = document.getElementById('scholar-query');
    if (input.value.trim()) {
        addScholarMessage(input.value, 'user');
        const query = input.value;
        input.value = '';
        
        const thinking = document.createElement('div');
        thinking.classList.add('thinking');
        thinking.textContent = "Researching...";
        document.getElementById('scholar-messages').appendChild(thinking);
        
        const response = await generateScholarResponse(query);
        thinking.remove();
        addScholarMessage(response, 'bot');
    }
});

document.getElementById('scholar-query').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('ask-btn').click();
});

// Helper Functions
function getCurrentMessages() {
    return Array.from(document.querySelectorAll('#messages .message')).map(el => ({
        text: el.textContent,
        sender: el.classList.contains('user-message') ? 'user' : 'bot'
    }));
}

function displayConversation(messages) {
    clearMessages();
    messages.forEach(msg => addMessage(msg.text, msg.sender));
}