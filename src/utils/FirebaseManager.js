import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
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
            const scoresRef = collection(this.db, "scores");
            // 점수 내림차순 정렬, 상위 10개만 가져오기
            const q = query(scoresRef, orderBy("score", "desc"), limit(10));

            const querySnapshot = await getDocs(q);
            const scores = [];

            querySnapshot.forEach((doc) => {
                scores.push(doc.data());
            });

            return scores;
        } catch (e) {
            console.error("Error getting documents: ", e);
            alert("랭킹을 불러오는 중 오류가 발생했습니다: " + e.message);
            return [];
        }
    }

    /**
     * 점수 저장하기
     */
    async saveScore(playerName, score) {
        try {
            const scoresRef = collection(this.db, "scores");
            await addDoc(scoresRef, {
                playerName: playerName,
                score: score,
                timestamp: serverTimestamp(), // 서버 시간
                date: new Date().toLocaleDateString() // 표시용 날짜
            });
            return true;
        } catch (e) {
            console.error("Error adding document: ", e);
            alert("점수 저장 중 오류가 발생했습니다: " + e.message);
            return false;
        }
    }

    /**
     * 현재 점수가 상위 10위 안에 드는지 확인
     */
    async isTopTen(currentScore) {
        try {
            const topScores = await this.getTopScores();

            // 아직 10명이 안 찼으면 무조건 10위 진입
            if (topScores.length < 10) {
                return true;
            }

            // 10위 점수보다 내 점수가 높으면 진입
            const tenthScore = topScores[topScores.length - 1].score;
            return currentScore > tenthScore;
        } catch (e) {
            console.error("Error checking top ten: ", e);
            // 에러 발생 시 사용자 경험을 해치지 않기 위해 조용히 false 반환
            // (랭킹 로드 실패 alert는 getTopScores에서 이미 뜸)
            return false;
        }
    }

    /**
     * 버전 변경 감지 리스너
     * @param {function} onVersionChange - 버전 변경 시 실행할 콜백 함수
     */
    listenForVersionChange(onVersionChange) {
        try {
            const docRef = doc(this.db, "config", "version");
            onSnapshot(docRef, (doc) => {
                if (doc.exists()) {
                    const data = doc.data();
                    if (data.version) {
                        onVersionChange(data.version);
                    }
                }
            });
        } catch (e) {
            console.error("Error listening for version:", e);
        }
    }
}
