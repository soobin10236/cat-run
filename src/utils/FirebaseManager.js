import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp, doc, onSnapshot, updateDoc, getCountFromServer, where, setDoc, getDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
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
     * 게임 세션 시작 (DB에 초기 기록 생성)
     */
    async startSession(userId, version, groupId = null) {
        try {
            const scoresRef = collection(this.db, "scores");
            const data = {
                userId: userId,
                playerName: 'Anonymous',
                score: 0,
                distance: 0,
                version: version || 'unknown', // 버전 정보 저장
                status: 'playing',
                timestamp: serverTimestamp(),
                date: new Date().toLocaleDateString()
            };

            if (groupId) {
                data.groupId = groupId;
            }

            const docRef = await addDoc(scoresRef, data);
            return docRef.id;
        } catch (e) {
            console.error("Error starting session: ", e);
            return null;
        }
    }

    /**
     * 게임 세션 종료 (점수 및 거리 업데이트)
     */
    async endSession(sessionId, score, distance) {
        if (!sessionId) return false;
        try {
            const docRef = doc(this.db, "scores", sessionId);
            await updateDoc(docRef, {
                score: score,
                distance: distance,
                status: 'finished',
                endTime: serverTimestamp()
            });
            return true;
        } catch (e) {
            console.error("Error ending session: ", e);
            return false;
        }
    }

    /**
     * 플레이어 이름 업데이트 (랭킹 등록 시)
     */
    async updatePlayerName(sessionId, name) {
        if (!sessionId) return false;
        try {
            const docRef = doc(this.db, "scores", sessionId);
            await updateDoc(docRef, {
                playerName: name
            });
            return true;
        } catch (e) {
            console.error("Error updating player name: ", e);
            return false;
        }
    }

    /**
     * 상위 10개 점수 가져오기 (전체 또는 그룹)
     */
    async getTopScores(groupId = null) {
        try {
            const scoresRef = collection(this.db, "scores");
            let q;

            if (groupId) {
                // 그룹 랭킹: groupId가 일치하고 score 내림차순
                // 복합 인덱스 필요할 수 있음: groupId ASC, score DESC
                q = query(scoresRef, where("groupId", "==", groupId), orderBy("score", "desc"), limit(10));
            } else {
                // 전체 랭킹
                q = query(scoresRef, orderBy("score", "desc"), limit(10));
            }

            const querySnapshot = await getDocs(q);
            const scores = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.score > 0) {
                    scores.push(data);
                }
            });

            return scores;
        } catch (e) {
            console.error("Error getting documents: ", e);
            // 인덱스 에러일 경우 콘솔에 링크가 뜸. 개발자가 생성해야 함.
            if (e.code === 'failed-precondition') {
                console.warn("Firebase Index required for this query.");
            }
            return [];
        }
    }

    /**
     * 그룹 생성
     */
    async createGroup(userId) {
        try {
            // 6자리 랜덤 코드 생성 (대문자 + 숫자)
            const groupId = Math.random().toString(36).substring(2, 8).toUpperCase();

            // 그룹 문서 생성 (ID를 코드로 사용)
            const groupDocRef = doc(this.db, "groups", groupId);

            // 이미 존재하는지 확인 (희박하지만)
            const docSnap = await getDoc(groupDocRef);
            if (docSnap.exists()) {
                return this.createGroup(userId); // 재시도
            }

            await setDoc(groupDocRef, {
                creatorId: userId,
                createdAt: serverTimestamp(),
                members: {
                    [userId]: {
                        nickname: '익명', // 생성자는 기본 닉네임
                        joinedAt: new Date().toISOString()
                    }
                }
            });

            return groupId;
        } catch (e) {
            console.error("Error creating group: ", e);
            return null;
        }
    }

    /**
     * 그룹 참여
     */
    async joinGroup(groupId, userId, nickname = '익명') {
        try {
            const groupRef = doc(this.db, "groups", groupId);
            const groupSnap = await getDoc(groupRef);

            if (groupSnap.exists()) {
                // 그룹 멤버에 추가 (닉네임 포함)
                await updateDoc(groupRef, {
                    [`members.${userId}`]: {
                        nickname: nickname,
                        joinedAt: new Date().toISOString()
                    }
                });

                // 로컬 스토리지에 닉네임 저장
                localStorage.setItem('player_nickname', nickname);

                return true;
            } else {
                console.error("Group not found");
                return false;
            }
        } catch (e) {
            console.error("Error joining group: ", e);
            return false;
        }
    }

    /**
     * (Deprecated) 점수 저장하기 - 호환성을 위해 남겨둠
     */
    async saveScore(playerName, score) {
        // 이 메서드는 이제 사용하지 않음 (startSession -> endSession 흐름 사용)
        return false;
    }

    /**
     * 현재 점수가 상위 10위 안에 드는지 확인
     */
    async isTopTen(currentScore, groupId = null) {
        try {
            const topScores = await this.getTopScores(groupId);

            // 아직 10명이 안 찼으면 무조건 10위 진입
            if (topScores.length < 10) {
                return true;
            }

            // 10위 점수보다 내 점수가 높으면 진입
            const tenthScore = topScores[topScores.length - 1].score;
            return currentScore > tenthScore;
        } catch (e) {
            console.error("Error checking top ten: ", e);
            return false;
        }
    }

    /**
     * 점수 백분위 계산 (상위 N%)
     * 비용 효율적인 count() 집계 쿼리 사용
     */
    async calculatePercentile(score) {
        try {
            const scoresRef = collection(this.db, "scores");

            // 1. 전체 플레이어 수 (점수가 0보다 큰 경우만)
            // status == 'finished' 조건을 넣으면 인덱스가 필요할 수 있으므로 score > 0 만 사용
            const totalQuery = query(scoresRef, where("score", ">", 0));
            const totalSnapshot = await getCountFromServer(totalQuery);
            const totalCount = totalSnapshot.data().count;

            if (totalCount === 0) return 1; // 첫 플레이어는 상위 1% (혹은 100%)

            // 2. 내 점수보다 높은 플레이어 수
            const higherQuery = query(scoresRef, where("score", ">", score));
            const higherSnapshot = await getCountFromServer(higherQuery);
            const higherCount = higherSnapshot.data().count;

            // 3. 백분위 계산 (상위 %)
            // (자신보다 높은 사람 수 / 전체 수) * 100
            // 예: 전체 100명, 내 위로 9명 -> 9% -> 상위 10% 이내
            let percentile = ((higherCount + 1) / totalCount) * 100;

            // 소수점 첫째자리까지
            return Math.max(0.1, Math.min(100, percentile)).toFixed(1);

        } catch (e) {
            console.error("Error calculating percentile: ", e);
            return null;
        }
    }

    /**
     * 개발자에게 피드백 보내기 (익명 + UID)
     */
    async sendFeedback(message, userId) {
        try {
            const feedbackRef = collection(this.db, "messages");
            await addDoc(feedbackRef, {
                userId: userId || 'anonymous',
                message: message,
                timestamp: serverTimestamp(),
                date: new Date().toLocaleString()
            });
            return true;
        } catch (e) {
            console.error("Error sending feedback: ", e);
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
