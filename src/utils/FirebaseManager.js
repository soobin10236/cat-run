import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";

const firebaseConfig = {
    apiKey: "AIzaSyAr6DysvR_2Vse_AmGqQSULQsQ6iMRPxaE",
    authDomain: "cat-run-c9eb5.firebaseapp.com",
    projectId: "cat-run-c9eb5",
    storageBucket: "cat-run-c9eb5.firebasestorage.app",
    messagingSenderId: "48836601714",
    appId: "1:48836601714:web:53b5e47849c5fb42929feb",
    measurementId: "G-R8FQGK9YZP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const analytics = getAnalytics(app);
const RANKING = 10;

export class FirebaseManager {
    constructor() {
        this.db = db;
        this.collectionName = 'scores';
    }

    /**
     * 상위 10개 점수 가져오기
     */
    async getTopScores() {
        try {
            const q = query(
                collection(this.db, this.collectionName),
                orderBy("score", "desc"),
                limit(RANKING)
            );

            const querySnapshot = await getDocs(q);
            const scores = [];
            querySnapshot.forEach((doc) => {
                scores.push({ id: doc.id, ...doc.data() });
            });
            return scores;
        } catch (error) {
            console.error("Error getting scores:", error);
            return [];
        }
    }

    /**
     * 점수 저장하기
     */
    async saveScore(playerName, score) {
        try {
            const docRef = await addDoc(collection(this.db, this.collectionName), {
                playerName: playerName,
                score: score,
                timestamp: serverTimestamp(),
                date: new Date().toLocaleDateString()
            });
            console.log("Score saved with ID: ", docRef.id);
            return true;
        } catch (error) {
            console.error("Error adding score:", error);
            return false;
        }
    }

    /**
     * 현재 점수가 상위 10위 안에 드는지 확인
     * (단순화를 위해 10번째 점수보다 크면 true)
     */
    async isTopTen(currentScore) {
        try {
            const scores = await this.getTopScores();

            // 아직 10명이 안 찼으면 무조건 등극
            if (scores.length < RANKING) return true;

            // 10번째 사람 점수보다 높으면 등극
            const lastScore = scores[scores.length - 1].score;
            return currentScore > lastScore;
        } catch (error) {
            console.error("Error checking top ten:", error);
            return false;
        }
    }
}
