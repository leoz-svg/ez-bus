const sentences = [
    "We will fail when we fail to try",
    "If you want to lift yourself up, lift up someone else",
    "Encouraging someone to be entirely themself is the loudest way to love them.",
    "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    "Through discipline comes freedom",
    "Don’t be afraid to give up the good to go for the great.",
    "Encouragement is like water to the soul, it makes everything grow.",
    "It is during our darkest moments that we must focus to see the light.",
    "Our chief want is someone who will inspire us to be what we know we could be.",
    "Stones and sticks are thrown only at fruit-bearing trees."
];
const randomIndex = Math.floor(Math.random() * sentences.length);

document.getElementById('sentence').textContent = sentences[randomIndex];