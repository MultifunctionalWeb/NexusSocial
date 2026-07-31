import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// PASTE YOUR FIREBASE CONFIG HERE
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAl74mArx9ZueCMIrMUy-B2hNc9-F60IuM",
  authDomain: "nexussocial-83888.firebaseapp.com",
  projectId: "nexussocial-83888",
  storageBucket: "nexussocial-83888.firebasestorage.app",
  messagingSenderId: "293398793234",
  appId: "1:293398793234:web:9ec8d5a50e3f6b415d1ccb",
  measurementId: "G-S2F7X75NZV"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- ELEMENTS ---
const loginScreen = document.getElementById('loginScreen');
const userNameInput = document.getElementById('userName');
const joinBtn = document.getElementById('joinBtn');
const postModal = document.getElementById('postModal');
const feedContainer = document.getElementById('feedContainer');

// --- 1. USER AUTH (Simple Random ID) ---
let currentUser = localStorage.getItem('nexusUser');
if (currentUser) {
    loginScreen.style.display = 'none';
    document.getElementById('profileTag').innerText = currentUser;
}

joinBtn.onclick = () => {
    const name = userNameInput.value.trim();
    if (name) {
        //const randomID = Math.floor(1000 + Math.random() * 9000);
        const finalName = name;
        localStorage.setItem('nexusUser', finalName);
        location.reload();
    }
};

// --- 2. MODAL LOGIC ---
document.getElementById('openModal').onclick = () => postModal.classList.remove('hidden');
document.getElementById('closeModal').onclick = () => postModal.classList.add('hidden');

// --- 3. SUBMIT POST ---
document.getElementById('submitPost').onclick = async () => {
    const content = document.getElementById('postContent').value.trim();
    if (!content) return;

    try {
        await addDoc(collection(db, "posts"), {
            user: currentUser,
            text: content,
            time: serverTimestamp()
        });
        document.getElementById('postContent').value = "";
        postModal.classList.add('hidden');
    } catch (e) { alert("Error posting: " + e.message); }
};
 
 // --- 4. REAL-TIME FEED ---
const q = query(collection(db, "posts"), orderBy("time", "desc"));
onSnapshot(q, (snapshot) => {
    feedContainer.innerHTML = "";
    snapshot.forEach(doc => {
        const post = doc.data();

        // 1. Convert Firestore timestamp to readable time
        const time = post.time ? post.time.toDate() : null;
        const timeText = time 
            ? time.toLocaleString('en-IN', { 
                day: 'numeric', 
                month: 'short', 
                hour: '2-digit', 
                minute: '2-digit' 
              }) 
            : "Just now"; // shows for 1 sec while server writes

        const postHtml = `
            <div class="glass-card p-5 rounded-2xl mb-4 border-slate-800 post-entry">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center">
                        <div class="w-8 h-8 bg-blue-500 rounded-full mr-3"></div>
                        <span class="text-sm font-bold">${post.user}</span>
                    </div>
                    <span class="text-xs text-slate-500">${timeText}</span> <!-- TIMESTAMP HERE -->
                </div>
                <p class="post-text text-slate-200 leading-relaxed">${post.text}</p> <!-- ADD post-text for newlines -->
            </div>
        `;
        feedContainer.innerHTML += postHtml;
    });
});