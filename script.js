let wordList = []; // To store words loaded from JSON

const numberOfSushiImages = 5; // Example: You have sushi1.png to sushi5.png
const sushiImagePaths = Array.from({ length: numberOfSushiImages }, (_, i) => `images/sushi/sushi${i + 1}.png`);

const timerEl = document.getElementById('timer');
const scoreEl = document.getElementById('score');
const japaneseWordEl = document.getElementById('japanese-word');
const romajiWordEl = document.getElementById('romaji-word');
const typedDisplayEl = document.getElementById('typed-display');
const sushiLaneEl = document.getElementById('sushi-lane');
const startScreenEl = document.getElementById('start-screen');
const startButton = document.getElementById('start-button');
const resultScreenEl = document.getElementById('result-screen');
const finalScoreEl = document.getElementById('final-score');
const restartButton = document.getElementById('restart-button');
const forceEndButton = document.getElementById('force-end-button'); // New
const typedKeysEl = document.getElementById('typed-keys'); // New
const mistakesEl = document.getElementById('mistakes'); // New
const kpsEl = document.getElementById('kps'); // New

let score = 0;
let timeLeft = 60; // Change timer to 1 minute (60 seconds)
let timerInterval;
let currentWord = null;
let currentRomaji = '';
let typedRomaji = '';
let gameActive = false;
let sushiInterval;
let activeSushi = []; // Keep track of active sushi elements for removal
let sushiAnimationDuration = 10; // Default speed (seconds) - will be updated

// Stats variables
let totalTypedKeys = 0;
let mistakes = 0;
let startTime = 0;
let correctWordsInSession = 0; // For special effect trigger
let wordsLoaded = false; // Flag to track if words are loaded

// Function to load words from JSON
async function loadWords() {
    try {
        const response = await fetch('wordlist.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        wordList = await response.json();
        if (wordList.length === 0) {
            console.error("Word list is empty or failed to load correctly.");
            japaneseWordEl.textContent = "単語リスト読込失敗";
            romajiWordEl.textContent = "Error loading words.";
            return;
        }
        wordsLoaded = true;
        startButton.disabled = false; // Enable start button
        startButton.textContent = 'スタート'; // Reset button text
        console.log("Word list loaded successfully.");
    } catch (error) {
        console.error("Failed to load word list:", error);
        japaneseWordEl.style.display = 'block';
        romajiWordEl.style.display = 'block';
        japaneseWordEl.textContent = "単語リスト読込失敗";
        romajiWordEl.textContent = error.message;
        startButton.disabled = true;
        startButton.textContent = '読込エラー';
    }
}

function getRandomWord() {
    if (!wordList || wordList.length === 0) {
        console.error("Word list is empty, cannot get random word.");
        return { ja: "エラー", ro: "error" };
    }
    return wordList[Math.floor(Math.random() * wordList.length)];
}

function displayWord() {
    if (!wordsLoaded) {
        console.warn("Attempted to display word before list was loaded.");
        return;
    }
    currentWord = getRandomWord();
    currentRomaji = currentWord.ro;
    typedRomaji = '';
    japaneseWordEl.textContent = currentWord.ja;
    romajiWordEl.textContent = currentRomaji;
    typedDisplayEl.textContent = ''; // Clear previous typed display
}

function updateTimer() {
    timeLeft--;
    timerEl.textContent = `Time: ${timeLeft}`;
    updateStatsDisplay(); // Update KPS every second
    if (timeLeft <= 0) {
        endGame();
    }
}

function clearAllSushi() {
    activeSushi.forEach(sushi => {
        if (sushi.dataset.timeoutId) {
            clearTimeout(sushi.dataset.timeoutId);
        }
    });
    while (sushiLaneEl.firstChild) {
        sushiLaneEl.removeChild(sushiLaneEl.firstChild);
    }
    activeSushi = [];
}

function createSushi() {
    if (!gameActive) return;

    const sushi = document.createElement('div');
    sushi.classList.add('sushi-item');
    const randomImagePath = sushiImagePaths[Math.floor(Math.random() * sushiImagePaths.length)];
    sushi.style.backgroundImage = `url('${randomImagePath}')`;

    sushi.style.animationName = 'moveSushi';
    sushi.style.animationTimingFunction = 'linear';
    sushi.style.animationDuration = `${sushiAnimationDuration}s`;

    sushiLaneEl.appendChild(sushi);

    let timeoutId; // Declare timeoutId here

    const timeoutCallback = () => {
        // Check 1: Is the game still running?
        if (!gameActive) {
            console.log("Sushi timeout ignored - game not active.");
            if (sushi.parentNode === sushiLaneEl) sushiLaneEl.removeChild(sushi);
            return;
        }
        // Check 2: Is this specific sushi element still visually present in the lane?
        if (sushi.parentNode !== sushiLaneEl) {
            console.log("Sushi timeout ignored - sushi element already removed (likely correct answer).");
            return;
        }

        // If we reach here, the game is active AND the sushi visually timed out.
        console.log("--- Sushi Timeout Start ---");
        console.log("Sushi reached end - word failed!");
        mistakes++;
        updateStatsDisplay();

        // Remove the timed-out sushi from the activeSushi array.
        const sushiIndex = activeSushi.indexOf(sushi);
        if (sushiIndex !== -1) {
            activeSushi.splice(sushiIndex, 1);
        } else {
            console.warn("Timed-out sushi was not found in activeSushi array, though it was in the DOM.");
        }

        console.log("Calling displayWord()...");
        displayWord();
        console.log("displayWord() finished. New word:", currentWord?.ja);

        console.log("Calling clearAllSushi() to clear visuals and reset for next word...");
        clearAllSushi(); // Clears visuals and resets activeSushi
        console.log("clearAllSushi() finished.");

        console.log("Calling createSushi() for the new word...");
        createSushi(); // Start next sushi
        console.log("createSushi() finished.");
        console.log("--- Sushi Timeout End ---");
    };

    timeoutId = setTimeout(timeoutCallback, sushiAnimationDuration * 1000);
    sushi.dataset.timeoutId = timeoutId; // Store the ID on the element

    activeSushi.push(sushi); // Add to array *after* creating timeout and storing ID
}

function updateStatsDisplay() {
    typedKeysEl.textContent = `Typed: ${totalTypedKeys}`;
    mistakesEl.textContent = `Mistakes: ${mistakes}`;
    const elapsedTime = (Date.now() - startTime) / 1000; // Time in seconds
    const kps = elapsedTime > 0 ? (totalTypedKeys / elapsedTime).toFixed(2) : '0.00';
    kpsEl.textContent = `KPS: ${kps}`;
}

// --- Special Effects ---
function confettiBasic() {
    console.log("Triggering Confetti Basic");
    confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
    });
}

function confettiFireworks() {
    console.log("Triggering Confetti Fireworks");
    const duration = 2 * 1000; // 2 seconds
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function () {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
            return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
    }, 250);
}

function confettiSide() {
    console.log("Triggering Confetti Side");
    confetti({
        particleCount: 100,
        angle: 60,
        spread: 55,
        origin: { x: 0 }
    });
    confetti({
        particleCount: 100,
        angle: 120,
        spread: 55,
        origin: { x: 1 }
    });
}

function flashBackgroundEffect() {
    console.log("Triggering Flash Background Effect");
    const originalColor = document.body.style.background;
    document.body.style.background = '#fffacd'; // Lemon Chiffon flash
    setTimeout(() => {
        document.body.style.background = 'radial-gradient(ellipse at bottom, #f3e5ab 0%, #e2d1c3 100%)';
    }, 200); // Flash duration
}

// --- Mistake Effect ---
function shakeScreenEffect() {
    console.log("Triggering Shake Screen Effect (Mistake)");
    const gameContainer = document.getElementById('game-container');
    gameContainer.style.animation = 'shake 0.3s';
    setTimeout(() => {
        gameContainer.style.animation = '';
    }, 300);
}

// Updated array of available special effects (for correct streaks)
const specialEffects = [
    confettiBasic,
    confettiFireworks,
    confettiSide,
    flashBackgroundEffect
];

function triggerSpecialEffect() {
    console.log(`Attempting to trigger special effect. Correct words: ${correctWordsInSession}`);
    const randomIndex = Math.floor(Math.random() * specialEffects.length);
    const selectedEffect = specialEffects[randomIndex];
    selectedEffect();
}

function startGame() {
    if (!wordsLoaded) {
        console.error("Cannot start game: Word list not loaded.");
        return;
    }

    const selectedSpeedElement = document.querySelector('input[name="sushi-speed"]:checked');
    if (selectedSpeedElement) {
        sushiAnimationDuration = parseInt(selectedSpeedElement.value, 10);
        console.log(`Selected speed: ${sushiAnimationDuration}s`);
    } else {
        sushiAnimationDuration = 9;
        console.warn("No speed selected, defaulting to normal.");
    }

    score = 0;
    timeLeft = 60;
    totalTypedKeys = 0;
    mistakes = 0;
    correctWordsInSession = 0;
    startTime = Date.now();

    scoreEl.textContent = `Score: ${score}`;
    timerEl.textContent = `Time: ${timeLeft}`;
    updateStatsDisplay();

    gameActive = true;
    startScreenEl.style.display = 'none';
    resultScreenEl.style.display = 'none';
    forceEndButton.style.display = 'inline-block';
    japaneseWordEl.style.display = 'block';
    romajiWordEl.style.display = 'block';
    typedDisplayEl.style.display = 'block';

    displayWord();
    clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 1000);

    clearAllSushi();
    createSushi();

    document.addEventListener('keydown', handleTyping);
}

function endGame() {
    if (!gameActive) return;
    gameActive = false;
    clearInterval(timerInterval);
    document.removeEventListener('keydown', handleTyping);

    updateStatsDisplay();
    finalScoreEl.textContent = score;
    resultScreenEl.style.display = 'block';
    forceEndButton.style.display = 'none';
    japaneseWordEl.style.display = 'none';
    romajiWordEl.style.display = 'none';
    typedDisplayEl.style.display = 'none';

    clearAllSushi();
}

function handleTyping(e) {
    if (!gameActive || !currentWord) return;

    const typedChar = e.key;

    if (typedChar.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        totalTypedKeys++;
    } else if (typedChar === ' ') {
        totalTypedKeys++;
    } else {
        return;
    }

    const nextExpectedChar = currentRomaji[typedRomaji.length];

    if (typedChar === nextExpectedChar) {
        typedRomaji += typedChar;
        typedDisplayEl.textContent = typedRomaji;

        if (typedRomaji === currentRomaji) {
            score++;
            correctWordsInSession++;
            scoreEl.textContent = `Score: ${score}`;
            console.log(`Word correct! correctWordsInSession: ${correctWordsInSession}`);

            clearAllSushi();
            createSushi();

            if (correctWordsInSession > 0 && correctWordsInSession % 5 === 0) {
                triggerSpecialEffect();
            }

            displayWord();
        }
    } else if (typedChar.length === 1 || typedChar === ' ') {
        mistakes++;
        console.log("Wrong key");

        document.body.classList.add('mistake-flash');
        shakeScreenEffect();

        setTimeout(() => {
            document.body.classList.remove('mistake-flash');
        }, 100);
    }

    updateStatsDisplay();
}

// Event Listeners
startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);
forceEndButton.addEventListener('click', endGame);

function initializeApp() {
    japaneseWordEl.style.display = 'none';
    romajiWordEl.style.display = 'none';
    typedDisplayEl.style.display = 'none';
    forceEndButton.style.display = 'none';
    updateStatsDisplay();

    startButton.disabled = true;
    startButton.textContent = '読込中...';

    loadWords();
}

document.addEventListener('DOMContentLoaded', initializeApp);
